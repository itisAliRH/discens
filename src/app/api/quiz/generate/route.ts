import { createUntypedServerClient } from '@/lib/supabase/server-untyped';
import { generateQuiz } from '@/lib/ai/quiz';
import { NextResponse } from 'next/server';
import type { QuizType } from '@/types/database';

// Material type for quiz generation (different from database Material)
interface QuizMaterial {
  id: string;
  type: string;
  content: {
    word?: string;
    phrase?: string;
    rule?: string;
    meaning?: string;
    explanation?: string;
    examples?: string[];
    article?: string;
  };
}

export async function POST(request: Request) {
  // #region agent log
  const fs = await import('fs');
  const logLine = (msg: string, data: Record<string, unknown>) => {
    try { fs.appendFileSync('/Users/alireza/Documents/GitHub/discens/.cursor/debug.log', JSON.stringify({location:'api/quiz/generate',message:msg,data,timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})+'\n'); } catch {}
  };
  logLine('Quiz generate API called', {});
  // #endregion
  try {
    const supabase = await createUntypedServerClient();
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    // #region agent log
    logLine('Auth check', {hasUser: !!user, userId: user?.id});
    // #endregion
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const {
      materialIds,
      quizTypes = ['multiple_choice', 'fill_blank'],
      count = 5,
      isReview = false,
    } = body as {
      materialIds?: string[];
      quizTypes?: QuizType[];
      count?: number;
      isReview?: boolean;
    };

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('target_language, native_language')
      .eq('id', user.id)
      .single();

    // #region agent log
    logLine('Profile fetch', {hasProfile: !!profile, profileError: profileError?.message});
    // #endregion

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get memory ID
    const { data: memory, error: memoryError } = await supabase
      .from('memories')
      .select('id')
      .eq('user_id', user.id)
      .single();

    // #region agent log
    logLine('Memory fetch', {hasMemory: !!memory, memoryError: memoryError?.message});
    // #endregion

    if (!memory) {
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
    }

    // Fetch materials
    let materialsQuery = supabase
      .from('materials')
      .select('id, type, content')
      .eq('memory_id', memory.id);

    if (materialIds && materialIds.length > 0) {
      materialsQuery = materialsQuery.in('id', materialIds);
    } else {
      // For new learning, get materials with low mastery
      materialsQuery = materialsQuery
        .lte('mastery_level', 2)
        .limit(count * 2);
    }

    const { data: materials, error: materialsError } = await materialsQuery;

    if (materialsError) {
      console.error('Materials fetch error:', materialsError);
      return NextResponse.json({ error: 'Failed to fetch materials' }, { status: 500 });
    }

    // If no materials, return empty quiz
    if (!materials || materials.length === 0) {
      return NextResponse.json({
        questions: { multipleChoice: [], trueFalse: [], fillBlank: [] },
        materialCount: 0,
      });
    }

    // Generate quiz
    const result = await generateQuiz({
      materials: materials as QuizMaterial[],
      quizTypes,
      count,
      targetLanguage: (profile.target_language as 'en' | 'de') || 'de',
      nativeLanguage: (profile.native_language as 'en' | 'de') || 'en',
      isReview,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to generate quiz' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      questions: result.questions,
      materialCount: materials.length,
    });
  } catch (error) {
    console.error('Quiz generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
