import { createUntypedServerClient } from '@/lib/supabase/server-untyped';
import { NextResponse } from 'next/server';
import type { SessionType } from '@/types/database';

/**
 * GET /api/history
 * Get all learning sessions (learn, review, conversation) for the current user
 */
export async function GET(request: Request) {
  try {
    const supabase = await createUntypedServerClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');

    // Fetch learning sessions (learn, review)
    const { data: learningSessions, error: learningError } = await supabase
      .from('learning_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('started_at', { ascending: false })
      .limit(limit);

    if (learningError) {
      console.error('Fetch learning sessions error:', learningError);
    }

    // Fetch conversation sessions
    const { data: conversationSessions, error: conversationError } = await supabase
      .from('conversation_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (conversationError) {
      console.error('Fetch conversation sessions error:', conversationError);
    }

    // Combine and format all sessions
    const allSessions = [
      ...(learningSessions || []).map(session => ({
        id: session.id,
        type: session.session_type as SessionType,
        title: session.session_type === 'learn' 
          ? 'Learning Session' 
          : session.session_type === 'review'
          ? 'Review Session'
          : 'Test Session',
        description: session.conversation_scenario || null,
        correctCount: session.correct_count || 0,
        incorrectCount: session.incorrect_count || 0,
        skippedCount: session.skipped_count || 0,
        durationSeconds: session.duration_seconds || 0,
        materialsCovered: session.materials_covered || [],
        completedAt: session.completed_at,
        startedAt: session.started_at,
        quizType: session.quiz_type,
        // For conversation sessions stored in learning_sessions
        conversationScenario: session.conversation_scenario,
        conversationTranscript: session.conversation_transcript,
      })),
      ...(conversationSessions || []).map(session => ({
        id: session.id,
        type: 'conversation' as SessionType,
        title: session.scenario_name || 'Conversation',
        description: session.scenario_description || null,
        correctCount: 0, // Not applicable for conversations
        incorrectCount: 0,
        skippedCount: 0,
        durationSeconds: session.completed_at && session.started_at
          ? Math.floor((new Date(session.completed_at).getTime() - new Date(session.started_at).getTime()) / 1000)
          : 0,
        materialsCovered: [],
        completedAt: session.completed_at,
        startedAt: session.started_at || session.created_at,
        quizType: null,
        // Conversation-specific fields
        conversationScenario: session.scenario_name,
        conversationTranscript: session.messages,
        environment: session.environment,
        overallScore: session.overall_score,
        fluencyScore: session.fluency_score,
        grammarScore: session.grammar_score,
        vocabularyScore: session.vocabulary_score,
        xpEarned: session.xp_earned,
        scenarioId: session.scenario_id,
      })),
    ];

    // Sort by started_at/created_at descending (most recent first)
    allSessions.sort((a, b) => {
      const dateA = new Date(a.startedAt).getTime();
      const dateB = new Date(b.startedAt).getTime();
      return dateB - dateA;
    });

    return NextResponse.json({ 
      sessions: allSessions.slice(0, limit),
      total: allSessions.length,
    });
  } catch (error) {
    console.error('History fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
