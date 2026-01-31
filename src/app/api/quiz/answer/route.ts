import { createUntypedServerClient } from '@/lib/supabase/server-untyped';
import { evaluateAnswer } from '@/lib/ai/quiz';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const supabase = await createUntypedServerClient();
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const {
      questionType,
      userAnswer,
      correctAnswer,
      acceptableAnswers = [],
      materialId,
    } = body as {
      questionType: 'multiple_choice' | 'true_false' | 'fill_blank' | 'free_text';
      userAnswer: string;
      correctAnswer: string;
      acceptableAnswers?: string[];
      materialId?: string;
    };

    // Get user profile for language
    const { data: profile } = await supabase
      .from('profiles')
      .select('target_language')
      .eq('id', user.id)
      .single();

    // Evaluate the answer
    const result = await evaluateAnswer({
      questionType,
      userAnswer,
      correctAnswer,
      acceptableAnswers,
      targetLanguage: (profile?.target_language as 'en' | 'de') || 'de',
    });

    // If there's a materialId and a mistake, record it
    if (materialId && !result.isCorrect && result.mistakeType) {
      await supabase.from('mistakes').upsert(
        {
          user_id: user.id,
          material_id: materialId,
          mistake_type: result.mistakeType,
          pattern: `Expected: ${correctAnswer}, Got: ${userAnswer}`,
          last_occurrence: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,material_id',
        }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Answer evaluation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
