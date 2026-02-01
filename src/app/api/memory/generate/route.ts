import { createUntypedServerClient } from '@/lib/supabase/server-untyped';
import { generateMaterials } from '@/lib/ai/memory';
import { NextResponse } from 'next/server';
import type { MaterialCategory, CEFRLevel } from '@/types/database';

/**
 * POST /api/memory/generate
 * Generate new materials using AI
 */
export async function POST(request: Request) {
  try {
    const supabase = await createUntypedServerClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('target_language, native_language')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get memory
    const { data: memory } = await supabase
      .from('memories')
      .select('id, summary, total_materials')
      .eq('user_id', user.id)
      .single();

    if (!memory) {
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      categories = ['daily_life'],
      cefrLevel = 'A1',
      count = 5,
    } = body as {
      categories?: MaterialCategory[];
      cefrLevel?: CEFRLevel;
      count?: number;
    };

    // Get existing material IDs to avoid duplicates
    const { data: existingMaterials } = await supabase
      .from('materials')
      .select('id')
      .eq('memory_id', memory.id)
      .limit(100);

    const existingIds = existingMaterials?.map((m: { id: string }) => m.id) || [];

    // Generate materials
    const result = await generateMaterials({
      targetLanguage: (profile.target_language as 'en' | 'de') || 'de',
      nativeLanguage: (profile.native_language as 'en' | 'de') || 'en',
      categories,
      cefrLevel,
      count,
      existingMaterialIds: existingIds,
      memorySummary: memory.summary,
    });

    if (!result.success || !result.materials) {
      return NextResponse.json(
        { error: result.error || 'Failed to generate materials' },
        { status: 500 }
      );
    }

    // Helper to remove null values from objects for cleaner storage
    const cleanObject = <T extends Record<string, unknown>>(obj: T): Partial<T> => {
      return Object.fromEntries(
        Object.entries(obj).filter(([, value]) => value !== null && value !== undefined)
      ) as Partial<T>;
    };

    // Insert generated materials
    const materialsToInsert: Array<Record<string, unknown>> = [];

    // Add words
    result.materials.words?.forEach(word => {
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
    result.materials.phrases?.forEach(phrase => {
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

    // Add grammar - clean up nullable incorrect field in examples
    result.materials.grammar?.forEach(grammar => {
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
        materials: [],
        count: 0,
        message: 'No materials generated',
      });
    }

    // Insert all materials
    const { data: insertedMaterials, error: insertError } = await supabase
      .from('materials')
      .insert(materialsToInsert)
      .select();

    if (insertError) {
      console.error('Materials insert error:', insertError);
      return NextResponse.json({ error: 'Failed to save materials' }, { status: 500 });
    }

    // Create review cards for all inserted materials
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

    return NextResponse.json({
      materials: insertedMaterials,
      count: insertedMaterials.length,
    });
  } catch (error) {
    console.error('Material generation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
