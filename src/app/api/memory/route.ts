import { createUntypedServerClient } from '@/lib/supabase/server-untyped';
import { NextResponse } from 'next/server';

/**
 * GET /api/memory
 * Get user's memory summary and statistics
 */
export async function GET() {
  try {
    const supabase = await createUntypedServerClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    // #region agent log
    await fetch('http://127.0.0.1:7242/ingest/bf43d447-3d50-4017-b28c-3fe71b95d859',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/memory/route.ts:12',message:'User auth check',data:{hasUser:!!user,userId:user?.id},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get memory
    const { data: memory, error: memoryError } = await supabase
      .from('memories')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    // #region agent log
    await fetch('http://127.0.0.1:7242/ingest/bf43d447-3d50-4017-b28c-3fe71b95d859',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/memory/route.ts:24',message:'Memory query result',data:{hasMemory:!!memory,error:memoryError?.message,errorCode:memoryError?.code},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,D,E'})}).catch(()=>{});
    // #endregion

    if (memoryError || !memory) {
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
    }

    // Get material counts by type
    const { data: materials } = await supabase
      .from('materials')
      .select('type, mastery_level, categories')
      .eq('memory_id', memory.id);
    
    // #region agent log
    await fetch('http://127.0.0.1:7242/ingest/bf43d447-3d50-4017-b28c-3fe71b95d859',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/memory/route.ts:36',message:'Materials query result',data:{materialCount:materials?.length||0},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D'})}).catch(()=>{});
    // #endregion

    // Calculate stats
    const stats = {
      total: materials?.length || 0,
      mastered: materials?.filter((m: { mastery_level: number }) => m.mastery_level >= 4).length || 0,
      byType: {
        word: materials?.filter((m: { type: string }) => m.type === 'word').length || 0,
        phrase: materials?.filter((m: { type: string }) => m.type === 'phrase').length || 0,
        grammar: materials?.filter((m: { type: string }) => m.type === 'grammar').length || 0,
        expression: materials?.filter((m: { type: string }) => m.type === 'expression').length || 0,
      },
      byMastery: {
        new: materials?.filter((m: { mastery_level: number }) => m.mastery_level === 0).length || 0,
        learning: materials?.filter((m: { mastery_level: number }) => m.mastery_level >= 1 && m.mastery_level <= 2).length || 0,
        reviewing: materials?.filter((m: { mastery_level: number }) => m.mastery_level === 3).length || 0,
        mastered: materials?.filter((m: { mastery_level: number }) => m.mastery_level >= 4).length || 0,
      },
    };

    return NextResponse.json({
      memory,
      stats,
    });
  } catch (error) {
    console.error('Memory fetch error:', error);
    // #region agent log
    await fetch('http://127.0.0.1:7242/ingest/bf43d447-3d50-4017-b28c-3fe71b95d859',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/memory/route.ts:58',message:'Exception in GET',data:{error:error instanceof Error?error.message:String(error)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/memory
 * Update memory summary and goals
 */
export async function PATCH(request: Request) {
  try {
    const supabase = await createUntypedServerClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { summary, goals, top_categories } = body;

    const updateData: Record<string, unknown> = {};
    if (summary !== undefined) updateData.summary = summary;
    if (goals !== undefined) updateData.goals = goals;
    if (top_categories !== undefined) updateData.top_categories = top_categories;

    const { data, error } = await supabase
      .from('memories')
      .update(updateData)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ memory: data });
  } catch (error) {
    console.error('Memory update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
