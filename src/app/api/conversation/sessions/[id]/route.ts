import { createUntypedServerClient } from '@/lib/supabase/server-untyped';
import { NextResponse } from 'next/server';

/**
 * GET /api/conversation/sessions/[id]
 * Get a specific conversation session
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

    const { data, error } = await supabase
      .from('conversation_sessions')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json({ session: data });
  } catch (error) {
    console.error('Session fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/conversation/sessions/[id]
 * Update a conversation session (add messages, complete, etc.)
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

    const body = await request.json();
    
    // Build update object
    const updateData: Record<string, unknown> = {};
    
    if (body.messages !== undefined) updateData.messages = body.messages;
    if (body.environment !== undefined) updateData.environment = body.environment;
    if (body.inputMode !== undefined) updateData.input_mode = body.inputMode;
    if (body.feedback !== undefined) updateData.feedback = body.feedback;
    if (body.overallScore !== undefined) updateData.overall_score = body.overallScore;
    if (body.fluencyScore !== undefined) updateData.fluency_score = body.fluencyScore;
    if (body.grammarScore !== undefined) updateData.grammar_score = body.grammarScore;
    if (body.vocabularyScore !== undefined) updateData.vocabulary_score = body.vocabularyScore;
    if (body.xpEarned !== undefined) updateData.xp_earned = body.xpEarned;
    if (body.completed) updateData.completed_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('conversation_sessions')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Session update error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ session: data });
  } catch (error) {
    console.error('Session update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/conversation/sessions/[id]
 * Delete a conversation session
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

    const { error } = await supabase
      .from('conversation_sessions')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Session delete error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Session delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
