import { createUntypedServerClient } from '@/lib/supabase/server-untyped';
import { NextResponse } from 'next/server';
import type { SessionType, QuizType } from '@/types/database';

/**
 * POST /api/learning-sessions
 * Create a new learning or review session
 */
export async function POST(request: Request) {
  try {
    const supabase = await createUntypedServerClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      sessionType, 
      quizTypes,
      conversationScenarioId,
    } = body as {
      sessionType: SessionType;
      quizTypes?: QuizType[];
      conversationScenarioId?: string;
    };

    if (!sessionType || !['learn', 'review'].includes(sessionType)) {
      return NextResponse.json(
        { error: 'Invalid session type. Must be "learn" or "review"' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('learning_sessions')
      .insert({
        user_id: user.id,
        session_type: sessionType,
        quiz_type: quizTypes && quizTypes.length === 1 ? quizTypes[0] : null,
        materials_covered: [],
        correct_count: 0,
        incorrect_count: 0,
        skipped_count: 0,
        duration_seconds: 0,
        started_at: new Date().toISOString(),
        conversation_scenario: conversationScenarioId || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Create session error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ session: data, quizTypes });
  } catch (error) {
    console.error('Session creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/learning-sessions
 * Get all learning sessions for the current user
 */
export async function GET(request: Request) {
  try {
    const supabase = await createUntypedServerClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionType = searchParams.get('type') as SessionType | null;
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = supabase
      .from('learning_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('started_at', { ascending: false })
      .limit(limit);

    if (sessionType) {
      query = query.eq('session_type', sessionType);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Fetch sessions error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ sessions: data || [] });
  } catch (error) {
    console.error('Fetch sessions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
