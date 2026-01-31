import { createUntypedServerClient } from '@/lib/supabase/server-untyped';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

/**
 * GET /api/memory/materials/[id]
 * Get a specific material
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createUntypedServerClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get memory to verify ownership
    const { data: memory } = await supabase
      .from('memories')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!memory) {
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
    }

    // Get material
    const { data: material, error } = await supabase
      .from('materials')
      .select('*')
      .eq('id', id)
      .eq('memory_id', memory.id)
      .single();

    if (error || !material) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 });
    }

    return NextResponse.json({ material });
  } catch (error) {
    console.error('Material fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/memory/materials/[id]
 * Update a material
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createUntypedServerClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get memory to verify ownership
    const { data: memory } = await supabase
      .from('memories')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!memory) {
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    // Only allow updating certain fields
    if (body.content !== undefined) updateData.content = body.content;
    if (body.categories !== undefined) updateData.categories = body.categories;
    if (body.difficulty_level !== undefined) updateData.difficulty_level = body.difficulty_level;
    if (body.cefr_level !== undefined) updateData.cefr_level = body.cefr_level;
    if (body.notes !== undefined) updateData.notes = body.notes;

    const { data: material, error } = await supabase
      .from('materials')
      .update(updateData)
      .eq('id', id)
      .eq('memory_id', memory.id)
      .select()
      .single();

    if (error) {
      console.error('Material update error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ material });
  } catch (error) {
    console.error('Material update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/memory/materials/[id]
 * Delete a material
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createUntypedServerClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get memory to verify ownership
    const { data: memory } = await supabase
      .from('memories')
      .select('id, total_materials')
      .eq('user_id', user.id)
      .single();

    if (!memory) {
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
    }

    // Delete review card first (foreign key constraint)
    await supabase
      .from('review_cards')
      .delete()
      .eq('material_id', id);

    // Delete material
    const { error } = await supabase
      .from('materials')
      .delete()
      .eq('id', id)
      .eq('memory_id', memory.id);

    if (error) {
      console.error('Material delete error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Update memory stats
    await supabase
      .from('memories')
      .update({ total_materials: Math.max(0, (memory.total_materials || 1) - 1) })
      .eq('id', memory.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Material delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
