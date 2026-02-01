import { createUntypedServerClient } from '@/lib/supabase/server-untyped';
import { NextResponse } from 'next/server';
import { getOpenAIClient } from '@/lib/ai/providers';
import { updateMemorySummary } from '@/lib/ai/memory';
import { z } from 'zod';

const FeedbackSchema = z.object({
  overallScore: z.number().min(0).max(100),
  fluencyScore: z.number().min(0).max(100),
  grammarScore: z.number().min(0).max(100),
  vocabularyScore: z.number().min(0).max(100),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  corrections: z.array(z.object({
    original: z.string(),
    corrected: z.string(),
    explanation: z.string(),
  })),
  newWordsLearned: z.array(z.string()),
  encouragement: z.string(),
});

export async function POST(request: Request) {
  try {
    const supabase = await createUntypedServerClient();
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { messages, scenarioName } = body as {
      messages: Array<{ role: 'user' | 'assistant'; content: string }>;
      scenarioName: string;
    };

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('target_language')
      .eq('id', user.id)
      .single();

    const targetLanguage = profile?.target_language || 'de';
    const languageName = targetLanguage === 'de' ? 'German' : 'English';

    // Get only user messages
    const userMessages = messages.filter(m => m.role === 'user').map(m => m.content);

    // Generate feedback
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a friendly ${languageName} language tutor analyzing a conversation practice session.
          
The scenario was: "${scenarioName}"

Analyze the user's ${languageName} responses and provide constructive feedback.
Be encouraging but honest. Focus on practical improvements.

Return JSON:
{
  "overallScore": 0-100,
  "fluencyScore": 0-100,
  "grammarScore": 0-100,
  "vocabularyScore": 0-100,
  "strengths": ["strength1", "strength2"],
  "improvements": ["area1", "area2"],
  "corrections": [{"original": "what user said", "corrected": "correct version", "explanation": "why"}],
  "newWordsLearned": ["word1", "word2"],
  "encouragement": "A friendly, encouraging message"
}`,
        },
        {
          role: 'user',
          content: `Here are the user's messages during the conversation:\n\n${userMessages.join('\n\n')}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.5,
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error('No feedback generated');
    }

    const feedback = FeedbackSchema.parse(JSON.parse(content));

    // Save conversation session
    const { data: memory } = await supabase
      .from('memories')
      .select('id, total_materials')
      .eq('user_id', user.id)
      .single();

    if (memory) {
      await supabase.from('learning_sessions').insert({
        user_id: user.id,
        session_type: 'conversation',
        conversation_scenario: scenarioName,
        conversation_transcript: messages,
        correct_count: Math.round(feedback.overallScore / 20),
        incorrect_count: feedback.corrections.length,
        duration_seconds: 0, // Would need to track this client-side
        completed_at: new Date().toISOString(),
      });

      // Record mistakes
      for (const correction of feedback.corrections) {
        await supabase.from('mistakes').insert({
          user_id: user.id,
          mistake_type: 'grammar',
          pattern: correction.original,
          explanation: correction.explanation,
          examples: [{ incorrect: correction.original, correct: correction.corrected }],
        });
      }

      // Extract and save new words from conversation
      if (feedback.newWordsLearned && feedback.newWordsLearned.length > 0) {
        console.log('[API] Extracting', feedback.newWordsLearned.length, 'new words from conversation');
        
        // Generate detailed word information for each new word
        const wordsToSave: Array<{
          memory_id: string;
          type: 'word';
          content: Record<string, unknown>;
          categories: string[];
          difficulty_level: number;
          mastery_level: number;
          cefr_level: string;
        }> = [];

        // Use AI to generate full word details
        for (const wordText of feedback.newWordsLearned) {
          try {
            const wordCompletion = await openai.chat.completions.create({
              model: 'gpt-4o-mini',
              messages: [
                {
                  role: 'system',
                  content: `You are a ${languageName} language expert. Extract detailed information about a ${languageName} word.
                  
Return JSON:
{
  "word": "the word itself",
  "article": "der/die/das or null",
  "meaning": "English meaning",
  "pronunciation": "IPA pronunciation or null",
  "examples": ["example sentence 1", "example sentence 2"],
  "partOfSpeech": "noun/verb/adjective/etc",
  "pluralForm": "plural form or null",
  "category": "daily_life/travel/work/etc",
  "cefrLevel": "A1/A2/B1/B2/C1/C2",
  "difficultyLevel": 1-5
}`,
                },
                {
                  role: 'user',
                  content: `Extract information about this ${languageName} word: "${wordText}"`,
                },
              ],
              response_format: { type: 'json_object' },
              temperature: 0.3,
            });

            const wordContent = wordCompletion.choices[0].message.content;
            if (wordContent) {
              const wordData = JSON.parse(wordContent);
              
              wordsToSave.push({
                memory_id: memory.id,
                type: 'word',
                content: {
                  word: wordData.word || wordText,
                  article: wordData.article || null,
                  meaning: wordData.meaning || '',
                  pronunciation: wordData.pronunciation || null,
                  examples: wordData.examples || [],
                  partOfSpeech: wordData.partOfSpeech || 'noun',
                  pluralForm: wordData.pluralForm || null,
                },
                categories: [wordData.category || 'daily_life'],
                difficulty_level: wordData.difficultyLevel || 2,
                mastery_level: 0,
                cefr_level: wordData.cefrLevel || 'A1',
              });
            }
          } catch (wordError) {
            console.error('Failed to extract word details for:', wordText, wordError);
            // Fallback: save basic word
            wordsToSave.push({
              memory_id: memory.id,
              type: 'word',
              content: {
                word: wordText,
                meaning: `Word from conversation: ${wordText}`,
                examples: [],
                partOfSpeech: 'noun',
              },
              categories: ['daily_life'],
              difficulty_level: 2,
              mastery_level: 0,
              cefr_level: 'A1',
            });
          }
        }

        // Save words to memory (filter duplicates first)
        if (wordsToSave.length > 0) {
          // Check for existing words
          const { data: existingMaterials } = await supabase
            .from('materials')
            .select('content')
            .eq('memory_id', memory.id)
            .eq('type', 'word');
          
          const existingWords = new Set(
            (existingMaterials || []).map((m: { content: { word?: string } }) => 
              m.content?.word?.toLowerCase().trim()
            ).filter(Boolean)
          );
          
          // Filter out duplicates
          const uniqueWords = wordsToSave.filter((word: { content: { word?: string } }) => {
            const wordKey = word.content?.word?.toLowerCase().trim();
            return wordKey && !existingWords.has(wordKey);
          });
          
          if (uniqueWords.length < wordsToSave.length) {
            console.log(`[API] Filtered out ${wordsToSave.length - uniqueWords.length} duplicate words from conversation`);
          }
          
          if (uniqueWords.length === 0) {
            console.log('[API] All words from conversation already exist, skipping insertion');
          } else {
            const { data: insertedMaterials, error: insertError } = await supabase
              .from('materials')
              .insert(uniqueWords)
              .select('id');

            if (!insertError && insertedMaterials) {
              // Create review cards
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

              await supabase.from('review_cards').insert(reviewCards);

              // Update memory total_materials count
              await supabase
                .from('memories')
                .update({ total_materials: (memory.total_materials || 0) + insertedMaterials.length })
                .eq('id', memory.id);
            }
          }
        }
      }
    }

    // Award XP
    const xpEarned = Math.round(feedback.overallScore / 5) + 10;
    await supabase.rpc('increment_xp', { user_id: user.id, amount: xpEarned });

    // Update memory summary after conversation
    if (memory) {
      try {
        // Get recent materials and mistakes for summary update
        const { data: recentMaterials } = await supabase
          .from('materials')
          .select('type, content, mastery_level')
          .eq('memory_id', memory.id)
          .order('created_at', { ascending: false })
          .limit(20);

        const { data: recentMistakes } = await supabase
          .from('mistakes')
          .select('pattern, mistake_type, occurrences')
          .eq('user_id', user.id)
          .eq('resolved', false)
          .order('last_occurrence', { ascending: false })
          .limit(10);

        const { data: memoryData } = await supabase
          .from('memories')
          .select('goals, total_materials, mastered_materials, summary')
          .eq('id', memory.id)
          .single();

        if (memoryData) {
          await updateMemorySummary({
            currentSummary: memoryData.summary || '',
            newMaterials: (recentMaterials || []).map((m: { type: string; content: unknown; mastery_level: number }) => ({
              type: m.type,
              content: m.content,
              masteryLevel: m.mastery_level,
            })),
            recentMistakes: (recentMistakes || []).map((m: { pattern: string; mistake_type: string; occurrences: number }) => ({
              pattern: m.pattern,
              type: m.mistake_type,
              occurrences: m.occurrences,
            })),
            goals: memoryData.goals || [],
            totalMaterials: memoryData.total_materials || 0,
            masteredMaterials: memoryData.mastered_materials || 0,
          });

          // Update summary_updated_at
          await supabase
            .from('memories')
            .update({ summary_updated_at: new Date().toISOString() })
            .eq('id', memory.id);
        }
      } catch (summaryError) {
        console.error('Failed to update memory summary:', summaryError);
        // Don't fail the whole request if summary update fails
      }
    }

    return NextResponse.json({
      ...feedback,
      xpEarned,
    });
  } catch (error) {
    console.error('Feedback error:', error);
    return NextResponse.json(
      { error: 'Failed to generate feedback' },
      { status: 500 }
    );
  }
}
