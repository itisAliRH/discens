import { createUntypedServerClient } from '@/lib/supabase/server-untyped';
import { generateQuiz } from '@/lib/ai/quiz';
import { generateMaterials } from '@/lib/ai/memory';
import { NextResponse } from 'next/server';
import type { QuizType, MaterialCategory, CEFRLevel } from '@/types/database';

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
      materialIds,
      quizTypes = ['multiple_choice', 'fill_blank'],
      count = 5,
      isReview = false,
      sessionId,
      conversationScenarioId,
      createNewMaterials = false, // For learn sessions: create new materials
      customLearningPrompt, // Custom learning focus from user
    } = body as {
      materialIds?: string[];
      quizTypes?: QuizType[];
      count?: number;
      isReview?: boolean;
      sessionId?: string;
      conversationScenarioId?: string;
      createNewMaterials?: boolean;
      customLearningPrompt?: string;
    };

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('target_language, native_language')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found. Complete onboarding first.' }, { status: 404 });
    }

    // Get memory
    const { data: memory } = await supabase
      .from('memories')
      .select('id, summary, top_categories, total_materials')
      .eq('user_id', user.id)
      .single();

    if (!memory) {
      return NextResponse.json({ error: 'Memory not found. Complete onboarding first.' }, { status: 404 });
    }

    let materials: QuizMaterial[] = [];
    let newMaterialIds: string[] = [];

    // For learn sessions: create NEW materials based on conversation scenario and memory
    if (createNewMaterials && !isReview) {
      // Get conversation scenario if provided
      let scenarioCategories: MaterialCategory[] = memory.top_categories || ['daily_life'];
      
      if (conversationScenarioId) {
        // Try to get scenario categories from conversation session
        const { data: conversationSession } = await supabase
          .from('conversation_sessions')
          .select('scenario_id')
          .eq('id', conversationScenarioId)
          .eq('user_id', user.id)
          .single();
        
        // Map scenario IDs to categories (you may want to enhance this)
        // For now, use memory's top categories
      }

      // Determine CEFR level from existing materials (average or default to A1)
      const { data: existingMaterials } = await supabase
        .from('materials')
        .select('cefr_level')
        .eq('memory_id', memory.id)
        .limit(50);

      const cefrLevels = existingMaterials?.map((m: { cefr_level: string }) => m.cefr_level) || [];
      const avgLevel = cefrLevels.length > 0 
        ? cefrLevels[0] as CEFRLevel // Use most common or first
        : 'A1';

      // Generate new materials
      const generateResult = await generateMaterials({
        targetLanguage: (profile.target_language as 'en' | 'de') || 'de',
        nativeLanguage: (profile.native_language as 'en' | 'de') || 'en',
        categories: scenarioCategories as MaterialCategory[],
        cefrLevel: avgLevel as CEFRLevel,
        count: count * 2, // Generate more materials than questions
        memorySummary: memory.summary || '',
        customPrompt: customLearningPrompt, // Pass custom learning focus
      });

      if (!generateResult.success || !generateResult.materials) {
        return NextResponse.json(
          { error: generateResult.error || 'Failed to generate materials' },
          { status: 500 }
        );
      }

      // Helper to remove null values
      const cleanObject = <T extends Record<string, unknown>>(obj: T): Partial<T> => {
        return Object.fromEntries(
          Object.entries(obj).filter(([, value]) => value !== null && value !== undefined)
        ) as Partial<T>;
      };

      // Prepare materials for insertion
      const materialsToInsert: Array<Record<string, unknown>> = [];

      // Add words
      generateResult.materials.words?.forEach(word => {
        materialsToInsert.push({
          memory_id: memory.id,
          type: 'word',
          content: cleanObject({
            word: word.word,
            article: word.article,
            meaning: word.meaning,
            pronunciation: word.pronunciation,
            examples: word.examples,
            synonyms: word.synonyms,
            partOfSpeech: word.partOfSpeech,
            pluralForm: word.pluralForm,
          }),
          categories: [word.category as MaterialCategory],
          difficulty_level: word.difficultyLevel,
          mastery_level: 0,
          cefr_level: word.cefrLevel as CEFRLevel,
        });
      });

      // Add phrases
      generateResult.materials.phrases?.forEach(phrase => {
        materialsToInsert.push({
          memory_id: memory.id,
          type: 'phrase',
          content: {
            phrase: phrase.phrase,
            meaning: phrase.meaning,
            usage: phrase.usage,
            examples: phrase.examples,
          },
          categories: [phrase.category as MaterialCategory],
          difficulty_level: phrase.difficultyLevel,
          mastery_level: 0,
          cefr_level: phrase.cefrLevel as CEFRLevel,
        });
      });

      // Add grammar
      generateResult.materials.grammar?.forEach(grammar => {
        materialsToInsert.push({
          memory_id: memory.id,
          type: 'grammar',
          content: {
            rule: grammar.rule,
            explanation: grammar.explanation,
            examples: grammar.examples.map(ex => cleanObject({
              correct: ex.correct,
              incorrect: ex.incorrect,
            })),
          },
          categories: [grammar.category as MaterialCategory],
          difficulty_level: grammar.difficultyLevel,
          mastery_level: 0,
          cefr_level: grammar.level as CEFRLevel,
        });
      });

      if (materialsToInsert.length === 0) {
        return NextResponse.json({
          questions: { multipleChoice: [], trueFalse: [], fillBlank: [] },
          materialCount: 0,
          newMaterialIds: [],
        });
      }

      // Insert materials
      const { data: insertedMaterials, error: insertError } = await supabase
        .from('materials')
        .insert(materialsToInsert)
        .select();

      if (insertError) {
        console.error('Materials insert error:', insertError);
        return NextResponse.json({ error: 'Failed to save materials' }, { status: 500 });
      }

      // Create review cards
      const reviewCards = insertedMaterials.map((m: { id: string }) => ({
        material_id: m.id,
        stability: 0,
        difficulty: 0,
        elapsed_days: 0,
        scheduled_days: 0,
        reps: 0,
        lapses: 0,
        state: 'New',
        due: new Date().toISOString(),
      }));

      await supabase.from('review_cards').insert(reviewCards);

      // Update memory stats
      await supabase
        .from('memories')
        .update({ total_materials: (memory.total_materials || 0) + insertedMaterials.length })
        .eq('id', memory.id);

      // Convert to QuizMaterial format
      materials = insertedMaterials.map((m: { id: string; type: string; content: unknown }) => ({
        id: m.id,
        type: m.type,
        content: m.content as QuizMaterial['content'],
      }));

      newMaterialIds = insertedMaterials.map((m: { id: string }) => m.id);

      // Update session with new materials
      if (sessionId) {
        await supabase
          .from('learning_sessions')
          .update({ materials_covered: newMaterialIds })
          .eq('id', sessionId)
          .eq('user_id', user.id);
      }
    } else {
      // For review sessions: use ONLY existing materials
      let materialsQuery = supabase
        .from('materials')
        .select('id, type, content')
        .eq('memory_id', memory.id);

      if (materialIds && materialIds.length > 0) {
        materialsQuery = materialsQuery.in('id', materialIds);
      } else {
        // For review, get materials that need review (from review_cards)
        const { data: reviewCards } = await supabase
          .from('review_cards')
          .select('material_id')
          .eq('state', 'Review')
          .lte('due', new Date().toISOString())
          .limit(count * 2);

        if (reviewCards && reviewCards.length > 0) {
          const cardMaterialIds = reviewCards.map(c => c.material_id);
          materialsQuery = materialsQuery.in('id', cardMaterialIds);
        } else {
          // Fallback: get materials with low mastery
          materialsQuery = materialsQuery
            .lte('mastery_level', 3)
            .limit(count * 2);
        }
      }

      const { data: fetchedMaterials, error: materialsError } = await materialsQuery;

      if (materialsError) {
        console.error('Materials fetch error:', materialsError);
        return NextResponse.json({ error: 'Failed to fetch materials' }, { status: 500 });
      }

      if (!fetchedMaterials || fetchedMaterials.length === 0) {
        return NextResponse.json({
          questions: { multipleChoice: [], trueFalse: [], fillBlank: [] },
          materialCount: 0,
          newMaterialIds: [],
        });
      }

      materials = fetchedMaterials.map((m: { id: string; type: string; content: unknown }) => ({
        id: m.id,
        type: m.type,
        content: m.content as QuizMaterial['content'],
      }));
    }

    // Generate quiz from materials
    const result = await generateQuiz({
      materials,
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
      newMaterialIds: createNewMaterials ? newMaterialIds : [],
    });
  } catch (error) {
    console.error('Quiz generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
