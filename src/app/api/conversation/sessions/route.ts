import { createUntypedServerClient } from '@/lib/supabase/server-untyped';
import { NextResponse } from 'next/server';

/**
 * POST /api/conversation/sessions
 * Create a new conversation session
 */
export async function POST(request: Request) {
  try {
    const supabase = await createUntypedServerClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { scenarioId, scenarioName, scenarioDescription, environment, inputMode } = body;

    const { data, error } = await supabase
      .from('conversation_sessions')
      .insert({
        user_id: user.id,
        scenario_id: scenarioId,
        scenario_name: scenarioName,
        scenario_description: scenarioDescription,
        environment: environment || 'none',
        input_mode: inputMode || 'text',
        messages: [],
      })
      .select()
      .single();

    if (error) {
      console.error('Create session error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ session: data });
  } catch (error) {
    console.error('Session creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/conversation/sessions
 * Get all conversation sessions for the current user
 */
export async function GET() {
  try {
    const supabase = await createUntypedServerClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    // #region agent log
    await fetch('http://127.0.0.1:7242/ingest/bf43d447-3d50-4017-b28c-3fe71b95d859',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/conversation/sessions/route.ts:54',message:'User auth check',data:{hasUser:!!user,userId:user?.id},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('conversation_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    
    // #region agent log
    await fetch('http://127.0.0.1:7242/ingest/bf43d447-3d50-4017-b28c-3fe71b95d859',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/conversation/sessions/route.ts:66',message:'Sessions query result',data:{sessionCount:data?.length||0,error:error?.message,errorCode:error?.code},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D'})}).catch(()=>{});
    // #endregion

    if (error) {
      console.error('Fetch sessions error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ sessions: data });
  } catch (error) {
    console.error('Sessions fetch error:', error);
    // #region agent log
    await fetch('http://127.0.0.1:7242/ingest/bf43d447-3d50-4017-b28c-3fe71b95d859',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/conversation/sessions/route.ts:75',message:'Exception in GET',data:{error:error instanceof Error?error.message:String(error)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
