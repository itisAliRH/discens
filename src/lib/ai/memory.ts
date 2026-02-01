import { z } from 'zod';
import type { MaterialCategory, CEFRLevel } from '@/types/database';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';

// ============================================
// SCHEMAS FOR STRUCTURED OUTPUTS
// ============================================
// Note: Using .nullable() instead of .optional() for OpenAI compatibility
// See: https://ai-sdk.dev/docs/troubleshooting/no-object-generated-content-filter

const GeneratedWordSchema = z.object({
  word: z.string().describe('The word in the target language'),
  article: z.string().nullable().describe('Article for nouns (der/die/das for German)'),
  meaning: z.string().describe('Translation/meaning in the native language'),
  pronunciation: z.string().nullable().describe('Phonetic pronunciation guide'),
  examples: z.array(z.string()).min(1).max(3).describe('Example sentences using the word'),
  synonyms: z.array(z.string()).nullable().describe('List of synonyms'),
  partOfSpeech: z.string().describe('Part of speech (noun, verb, adjective, etc.)'),
  pluralForm: z.string().nullable().describe('Plural form of nouns'),
  category: z.string().describe('Category like daily_life, travel, work, etc.'),
  difficultyLevel: z.number().int().min(1).max(5).describe('Difficulty level from 1 (easiest) to 5 (hardest)'),
  cefrLevel: z.string().describe('CEFR level: A1, A2, B1, B2, C1, or C2'),
});

const GeneratedPhraseSchema = z.object({
  phrase: z.string().describe('The phrase/expression in the target language'),
  meaning: z.string().describe('Translation/meaning in the native language'),
  usage: z.string().describe('Context or situation where this phrase is used'),
  examples: z.array(z.string()).min(1).max(2).describe('Example sentences or dialogues'),
  category: z.string().describe('Category like daily_life, travel, work, etc.'),
  difficultyLevel: z.number().int().min(1).max(5).describe('Difficulty level from 1 (easiest) to 5 (hardest)'),
  cefrLevel: z.string().describe('CEFR level: A1, A2, B1, B2, C1, or C2'),
});

const GeneratedGrammarSchema = z.object({
  rule: z.string().describe('Name or title of the grammar rule'),
  explanation: z.string().describe('Clear explanation of the grammar rule'),
  examples: z.array(z.object({
    correct: z.string().describe('Correct usage example'),
    incorrect: z.string().nullable().describe('Common incorrect usage to avoid'),
  })).min(1).max(3).describe('Examples demonstrating the rule'),
  level: z.string().describe('CEFR level: A1, A2, B1, B2, C1, or C2'),
  category: z.string().describe('Category like daily_life, travel, work, etc.'),
  difficultyLevel: z.number().int().min(1).max(5).describe('Difficulty level from 1 (easiest) to 5 (hardest)'),
});

const MaterialBatchSchema = z.object({
  words: z.array(GeneratedWordSchema).nullable().describe('Vocabulary words to learn'),
  phrases: z.array(GeneratedPhraseSchema).nullable().describe('Phrases and expressions to learn'),
  grammar: z.array(GeneratedGrammarSchema).nullable().describe('Grammar rules to learn'),
});

const MemorySummarySchema = z.object({
  summary: z.string().max(1000).describe('Concise summary of learner progress'),
  suggestedGoals: z.array(z.string()).max(5).describe('Suggested learning goals'),
  strengthAreas: z.array(z.string()).describe('Areas where the learner excels'),
  weaknessAreas: z.array(z.string()).describe('Areas that need improvement'),
  recommendedLevel: z.string().describe('Recommended CEFR level'),
});

// ============================================
// MATERIAL GENERATION
// ============================================

interface GenerateMaterialsOptions {
  targetLanguage: 'en' | 'de';
  nativeLanguage: 'en' | 'de';
  categories: MaterialCategory[];
  cefrLevel: CEFRLevel;
  count: number;
  existingMaterialIds?: string[];
  memorySummary?: string;
}

/**
 * Generate new learning materials using AI SDK's generateObject
 * Uses structured output for guaranteed schema compliance
 */
export async function generateMaterials(options: GenerateMaterialsOptions) {
  const {
    targetLanguage,
    nativeLanguage,
    categories,
    cefrLevel,
    count,
    existingMaterialIds = [],
    memorySummary = '',
  } = options;

  const languageName = targetLanguage === 'de' ? 'German' : 'English';
  const nativeLanguageName = nativeLanguage === 'de' ? 'German' : 'English';

  // Calculate distribution
  const wordCount = Math.ceil(count * 0.7);
  const phraseCount = Math.ceil(count * 0.2);
  const grammarCount = Math.max(1, count - wordCount - phraseCount);

  // Map CEFR level to difficulty
  const cefrToDifficulty: Record<string, number> = {
    'A1': 1,
    'A2': 2,
    'B1': 3,
    'B2': 4,
    'C1': 5,
    'C2': 5,
  };
  const baseDifficulty = cefrToDifficulty[cefrLevel] || 2;

  const systemPrompt = `You are a language learning content creator specializing in ${languageName} for ${nativeLanguageName} speakers.
Your task is to generate high-quality learning materials at the ${cefrLevel} level.

User's current learning summary:
${memorySummary || 'New learner, no prior context.'}

CRITICAL GUIDELINES:
- Generate practical, everyday vocabulary and grammar
- Include real-world usage examples
- For German nouns: ALWAYS include articles (der/die/das)
- Ensure difficulty matches the ${cefrLevel} level
- Focus on the requested categories: ${categories.join(', ')}
- difficultyLevel MUST be an integer from 1 to 5 (use ${baseDifficulty} as baseline for ${cefrLevel})
- For nullable string fields (article, pronunciation, pluralForm, synonyms, incorrect), use null if not applicable
- Avoid materials the user already knows`;

  const userPrompt = `Generate learning materials for ${languageName} at ${cefrLevel} level.
Focus on categories: ${categories.join(', ')}.

Generate exactly:
- ${wordCount} words (vocabulary)
- ${phraseCount} phrases/expressions
- ${grammarCount} grammar point(s)

Remember: difficultyLevel must be an integer between 1-5 (${baseDifficulty} is appropriate for ${cefrLevel}).`;

  try {
    const result = await generateObject({
      model: openai('gpt-4o-mini'),
      system: systemPrompt,
      prompt: userPrompt,
      schema: MaterialBatchSchema,
      schemaName: 'MaterialBatch',
      schemaDescription: 'A batch of language learning materials including words, phrases, and grammar rules',
      temperature: 0.7,
    });

    // Transform nullable arrays to empty arrays for easier processing
    const materials = {
      words: result.object.words || [],
      phrases: result.object.phrases || [],
      grammar: result.object.grammar || [],
    };

    return {
      success: true,
      materials,
    };
  } catch (error) {
    console.error('Material generation error:', error);
    
    // Retry with GPT-4o if gpt-4o-mini fails
    try {
      const retryResult = await generateObject({
        model: openai('gpt-4o'),
        system: systemPrompt,
        prompt: userPrompt,
        schema: MaterialBatchSchema,
        schemaName: 'MaterialBatch',
        schemaDescription: 'A batch of language learning materials including words, phrases, and grammar rules',
        temperature: 0.7,
      });

      const materials = {
        words: retryResult.object.words || [],
        phrases: retryResult.object.phrases || [],
        grammar: retryResult.object.grammar || [],
      };

      return { success: true, materials };
    } catch (retryError) {
      console.error('Retry with GPT-4o failed:', retryError);
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate materials',
      materials: null,
    };
  }
}

// ============================================
// MEMORY SUMMARY GENERATION
// ============================================

interface UpdateSummaryOptions {
  currentSummary: string;
  newMaterials: Array<{ type: string; content: unknown; masteryLevel: number }>;
  recentMistakes: Array<{ pattern: string; type: string; occurrences: number }>;
  goals: string[];
  totalMaterials: number;
  masteredMaterials: number;
}

/**
 * Update the memory summary based on learning progress
 */
export async function updateMemorySummary(options: UpdateSummaryOptions) {
  const {
    currentSummary,
    newMaterials,
    recentMistakes,
    goals,
    totalMaterials,
    masteredMaterials,
  } = options;

  const prompt = `Analyze this learner's progress and create an updated summary (max 1000 characters).

Current Summary:
${currentSummary || 'No previous summary'}

Recent Materials Added (${newMaterials.length}):
${JSON.stringify(newMaterials.slice(0, 20), null, 2)}

Recent Mistakes:
${JSON.stringify(recentMistakes.slice(0, 10), null, 2)}

Current Goals: ${goals.join(', ')}
Stats: ${masteredMaterials}/${totalMaterials} materials mastered

Create a comprehensive but concise assessment of the learner's progress.`;

  try {
    const result = await generateObject({
      model: openai('gpt-4o-mini'),
      prompt,
      schema: MemorySummarySchema,
      schemaName: 'MemorySummary',
      schemaDescription: 'A summary of the learner\'s progress and recommendations',
      temperature: 0.5,
    });

    return {
      success: true,
      ...result.object,
    };
  } catch (error) {
    console.error('Summary generation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate summary',
      summary: currentSummary,
      suggestedGoals: goals,
      strengthAreas: [],
      weaknessAreas: [],
      recommendedLevel: 'A1',
    };
  }
}

// ============================================
// LEVEL ASSESSMENT
// ============================================

const LevelAssessmentSchema = z.object({
  estimatedLevel: z.string().describe('CEFR level: A1, A2, B1, B2, C1, or C2'),
  confidence: z.number().min(0).max(1).describe('Confidence score from 0.0 to 1.0'),
  reasoning: z.string().describe('Brief explanation of the assessment'),
  suggestedCategories: z.array(z.string()).describe('Recommended learning categories'),
});

/**
 * Assess user's language level from their description
 */
export async function assessLevelFromDescription(
  description: string,
  targetLanguage: 'en' | 'de'
) {
  const languageName = targetLanguage === 'de' ? 'German' : 'English';

  const prompt = `Analyze this learner's self-description and estimate their ${languageName} proficiency level.

Description:
"${description}"

Available categories for suggestions: travel, work, shopping, health, food, housing, education, entertainment, social, daily_life

Assess their level based on what they describe about their language abilities.`;

  try {
    const result = await generateObject({
      model: openai('gpt-4o-mini'),
      prompt,
      schema: LevelAssessmentSchema,
      schemaName: 'LevelAssessment',
      schemaDescription: 'Assessment of a learner\'s language proficiency level',
      temperature: 0.3,
    });

    return {
      success: true,
      ...result.object,
    };
  } catch (error) {
    console.error('Level assessment error:', error);
    return {
      success: false,
      estimatedLevel: 'A1',
      confidence: 0,
      reasoning: 'Could not assess level',
      suggestedCategories: ['daily_life', 'travel'],
    };
  }
}

// ============================================
// MISTAKE ANALYSIS
// ============================================

const MistakeAnalysisSchema = z.object({
  patterns: z.array(z.object({
    type: z.string().describe('Type of mistake: article, word_order, conjugation, case, spelling, vocabulary, grammar, or other'),
    pattern: z.string().describe('Description of the error pattern'),
    explanation: z.string().describe('Why this mistake commonly happens'),
    frequency: z.string().describe('How common this mistake is: common, occasional, or rare'),
    exercises: z.array(z.string()).describe('Suggested exercises to address this mistake'),
  })).describe('List of identified mistake patterns'),
  overallAssessment: z.string().describe('Brief overall assessment of the learner\'s challenges'),
});

/**
 * Analyze user's mistakes and suggest targeted exercises
 */
export async function analyzeMistakes(
  mistakes: Array<{ incorrect: string; correct: string; context: string; type: string }>,
  targetLanguage: 'en' | 'de'
) {
  const languageName = targetLanguage === 'de' ? 'German' : 'English';

  const prompt = `Analyze these ${languageName} learning mistakes and identify patterns.

Mistakes:
${JSON.stringify(mistakes, null, 2)}

Identify common error patterns, explain why they occur, and suggest exercises to help the learner improve.
Mistake types can be: article, word_order, conjugation, case, spelling, vocabulary, grammar, or other.
Frequency should be: common, occasional, or rare.`;

  try {
    const result = await generateObject({
      model: openai('gpt-4o-mini'),
      prompt,
      schema: MistakeAnalysisSchema,
      schemaName: 'MistakeAnalysis',
      schemaDescription: 'Analysis of language learning mistakes and patterns',
      temperature: 0.4,
    });

    return {
      success: true,
      ...result.object,
    };
  } catch (error) {
    console.error('Mistake analysis error:', error);
    return {
      success: false,
      patterns: [],
      overallAssessment: 'Could not analyze mistakes',
    };
  }
}
