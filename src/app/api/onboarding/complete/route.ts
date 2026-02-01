import { createClient } from '@supabase/supabase-js';
import { createUntypedServerClient } from '@/lib/supabase/server-untyped';
import { NextResponse } from 'next/server';
import { updateMemorySummary } from '@/lib/ai/memory';
import type { LanguageCode, MaterialCategory } from '@/types/database';

// Lazy-init admin client to avoid build-time env var access
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

interface GeneratedWord {
  word: string;
  article: string | null;
  meaning: string;
  pronunciation: string | null;
  examples: string[];
  synonyms: string[];
  partOfSpeech: string;
  pluralForm: string | null;
  categories: string[];
  difficultyLevel: number;
  cefrLevel: string;
}

interface CompleteOnboardingRequest {
  targetLanguage: LanguageCode;
  description?: string;
  selectedCategories: MaterialCategory[];
  generatedWords?: GeneratedWord[];
}

/**
 * POST /api/onboarding/complete
 * Complete onboarding - creates profile/memory if they don't exist (bypasses RLS)
 */
export async function POST(request: Request) {
  try {
    // Get current user from the request (uses normal client to verify auth)
    const supabase = await createUntypedServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CompleteOnboardingRequest = await request.json();
    const { targetLanguage, description, selectedCategories, generatedWords } = body;

    if (!targetLanguage) {
      return NextResponse.json({ error: 'Target language is required' }, { status: 400 });
    }

    console.log('[API] Completing onboarding for user:', user.id);

    // Get admin client (lazy-init to avoid build-time env var access)
    const supabaseAdmin = getSupabaseAdmin();

    // Check if profile exists using admin client
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    // Create profile if it doesn't exist
    if (!existingProfile) {
      console.log('[API] Creating profile for user:', user.id);
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
          avatar_url: user.user_metadata?.avatar_url || null,
          target_language: targetLanguage,
          native_language: targetLanguage === 'de' ? 'en' : 'en',
        });

      if (profileError) {
        console.error('[API] Profile creation failed:', profileError);
        return NextResponse.json({ error: `Profile creation failed: ${profileError.message}` }, { status: 500 });
      }
    } else {
      // Update existing profile
      console.log('[API] Updating profile for user:', user.id);
      await supabaseAdmin
        .from('profiles')
        .update({
          target_language: targetLanguage,
          native_language: targetLanguage === 'de' ? 'en' : 'en',
        })
        .eq('id', user.id);
    }

    // Check if memory exists
    const { data: existingMemory } = await supabaseAdmin
      .from('memories')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    const summary = description || `Starting to learn ${targetLanguage === 'de' ? 'German' : 'English'}`;
    const memoryData = {
      summary: summary.slice(0, 1000),
      goals: [`Learn ${targetLanguage === 'de' ? 'German' : 'English'}`],
      top_categories: selectedCategories.length > 0 ? selectedCategories : ['daily_life', 'travel'],
      summary_updated_at: new Date().toISOString(),
    };

    let memoryId: string;

    if (!existingMemory) {
      // Create memory
      console.log('[API] Creating memory for user:', user.id);
      const { data: newMemory, error: memoryError } = await supabaseAdmin
        .from('memories')
        .insert({
          user_id: user.id,
          ...memoryData,
        })
        .select('id')
        .single();

      if (memoryError) {
        console.error('[API] Memory creation failed:', memoryError);
        return NextResponse.json({ error: `Memory creation failed: ${memoryError.message}` }, { status: 500 });
      }
      memoryId = newMemory.id;
    } else {
      // Update existing memory
      console.log('[API] Updating memory for user:', user.id);
      await supabaseAdmin
        .from('memories')
        .update(memoryData)
        .eq('user_id', user.id);
      memoryId = existingMemory.id;
    }

    // Save generated words if provided
    if (generatedWords && generatedWords.length > 0) {
      console.log('[API] Saving', generatedWords.length, 'generated words for user:', user.id);
      
      // Check for existing words to avoid duplicates
      const { data: existingMaterials } = await supabaseAdmin
        .from('materials')
        .select('content')
        .eq('memory_id', memoryId)
        .eq('type', 'word');
      
      const existingWords = new Set(
        (existingMaterials || []).map((m: { content: { word?: string } }) => 
          m.content?.word?.toLowerCase().trim()
        ).filter(Boolean)
      );
      
      // Filter out duplicates
      const uniqueWords = generatedWords.filter(word => {
        const wordKey = word.word.toLowerCase().trim();
        return !existingWords.has(wordKey);
      });
      
      if (uniqueWords.length < generatedWords.length) {
        console.log(`[API] Filtered out ${generatedWords.length - uniqueWords.length} duplicate words`);
      }
      
      if (uniqueWords.length === 0) {
        console.log('[API] All words already exist, skipping insertion');
      } else {
        const materialsToInsert = uniqueWords.map(word => {
        // Ensure categories is an array and limit to 5, convert to MaterialCategory[]
        const wordCategories = Array.isArray(word.categories)
          ? word.categories.slice(0, 5).filter((cat): cat is MaterialCategory => 
              ['daily_life', 'travel', 'work', 'shopping', 'health', 'food', 'housing', 'education', 'entertainment', 'social'].includes(cat)
            )
          : ['daily_life' as MaterialCategory];
        
        return {
          memory_id: memoryId,
          type: 'word' as const,
          content: {
            word: word.word,
            article: word.article,
            meaning: word.meaning,
            pronunciation: word.pronunciation,
            examples: word.examples,
            synonyms: word.synonyms,
            partOfSpeech: word.partOfSpeech,
            pluralForm: word.pluralForm,
          },
          categories: wordCategories,
          difficulty_level: word.difficultyLevel,
          mastery_level: 0,
          cefr_level: word.cefrLevel as any,
        };
      });

        const { data: insertedMaterials, error: materialsError } = await supabaseAdmin
          .from('materials')
          .insert(materialsToInsert)
          .select('id, type, content');

        if (materialsError) {
          console.error('[API] Failed to save words:', materialsError);
          // Don't fail the whole onboarding, just log the error
        } else if (insertedMaterials) {
        // Create review cards for the materials
        const reviewCards = insertedMaterials.map((m: { id: string }) => ({
          material_id: m.id,
          stability: 0,
          difficulty: 0,
          elapsed_days: 0,
          scheduled_days: 0,
          reps: 0,
          lapses: 0,
          state: 'New' as const,
          due: new Date().toISOString(),
        }));

        await supabaseAdmin.from('review_cards').insert(reviewCards);

        // Update memory total_materials count
        await supabaseAdmin
          .from('memories')
          .update({ total_materials: insertedMaterials.length })
          .eq('id', memoryId);

        // Update memory summary after adding words
        try {
          const { data: memoryData } = await supabaseAdmin
            .from('memories')
            .select('goals, total_materials, mastered_materials, summary')
            .eq('id', memoryId)
            .single();

          if (memoryData) {
            const summaryResult = await updateMemorySummary({
              currentSummary: memoryData.summary || '',
              newMaterials: insertedMaterials.map((m: { id: string; type: string; content: unknown }) => ({
                type: m.type,
                content: m.content,
                masteryLevel: 0,
              })),
              recentMistakes: [],
              goals: memoryData.goals || [],
              totalMaterials: memoryData.total_materials || 0,
              masteredMaterials: memoryData.mastered_materials || 0,
            });

            if (summaryResult.success) {
              await supabaseAdmin
                .from('memories')
                .update({
                  summary: summaryResult.summary,
                  summary_updated_at: new Date().toISOString(),
                })
                .eq('id', memoryId);
            }
          }
        } catch (summaryError) {
          console.error('[API] Failed to update memory summary after onboarding:', summaryError);
          // Don't fail onboarding if summary update fails
        }
        }
      }
    }

    // Check if streak exists
    const { data: existingStreak } = await supabaseAdmin
      .from('streaks')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!existingStreak) {
      console.log('[API] Creating streak for user:', user.id);
      await supabaseAdmin
        .from('streaks')
        .insert({ user_id: user.id });
    }

    console.log('[API] Onboarding completed successfully for user:', user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Onboarding error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 });
  }
}
