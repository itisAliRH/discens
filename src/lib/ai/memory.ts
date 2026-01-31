import OpenAI from 'openai';
import { z } from 'zod';
import type { MaterialCategory, CEFRLevel } from '@/types/database';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ============================================
// SCHEMAS FOR STRUCTURED OUTPUTS
// ============================================

const GeneratedWordSchema = z.object({
  word: z.string(),
  article: z.string().optional(),
  meaning: z.string(),
  pronunciation: z.string().optional(),
  examples: z.array(z.string()).min(1).max(3),
  synonyms: z.array(z.string()).optional(),
  partOfSpeech: z.string(),
  pluralForm: z.string().optional(),
  category: z.string(),
  difficultyLevel: z.number().min(1).max(5),
  cefrLevel: z.string(),
});

const GeneratedGrammarSchema = z.object({
  rule: z.string(),
  explanation: z.string(),
  examples: z.array(z.object({
    correct: z.string(),
    incorrect: z.string().optional(),
  })).min(1).max(3),
  level: z.string(),
  category: z.string(),
  difficultyLevel: z.number().min(1).max(5),
});

const MaterialBatchSchema = z.object({
  words: z.array(GeneratedWordSchema).optional(),
  phrases: z.array(z.object({
    phrase: z.string(),
    meaning: z.string(),
    usage: z.string(),
    examples: z.array(z.string()).min(1).max(2),
    category: z.string(),
    difficultyLevel: z.number().min(1).max(5),
    cefrLevel: z.string(),
  })).optional(),
  grammar: z.array(GeneratedGrammarSchema).optional(),
});

const MemorySummarySchema = z.object({
  summary: z.string().max(1000),
  suggestedGoals: z.array(z.string()).max(5),
  strengthAreas: z.array(z.string()),
  weaknessAreas: z.array(z.string()),
  recommendedLevel: z.string(),
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
 * Generate new learning materials using OpenAI
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

  const systemPrompt = `You are a language learning content creator specializing in ${languageName} for ${nativeLanguageName} speakers.
Your task is to generate high-quality learning materials at the ${cefrLevel} level.

User's current learning summary:
${memorySummary || 'New learner, no prior context.'}

Guidelines:
- Generate practical, everyday vocabulary and grammar
- Include real-world usage examples
- For German: ALWAYS include articles (der/die/das) for nouns
- Ensure difficulty matches the ${cefrLevel} level
- Focus on the requested categories: ${categories.join(', ')}
- Avoid materials the user already knows (IDs: ${existingMaterialIds.slice(0, 50).join(', ')})`;

  const userPrompt = `Generate ${count} learning materials for ${languageName} at ${cefrLevel} level.
Focus on categories: ${categories.join(', ')}.

Include a mix of:
- Words (70% if generating vocabulary)
- Phrases/expressions (20%)
- Grammar points (10%)

Return as JSON with structure:
{
  "words": [{ word, article?, meaning, pronunciation?, examples[], synonyms?, partOfSpeech, pluralForm?, category, difficultyLevel, cefrLevel }],
  "phrases": [{ phrase, meaning, usage, examples[], category, difficultyLevel, cefrLevel }],
  "grammar": [{ rule, explanation, examples[{correct, incorrect?}], level, category, difficultyLevel }]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8,
      max_tokens: 4000,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content generated');
    }

    const parsed = JSON.parse(content);
    const validated = MaterialBatchSchema.parse(parsed);

    return {
      success: true,
      materials: validated,
    };
  } catch (error) {
    console.error('Material generation error:', error);
    
    // Retry with GPT-4o if gpt-4o-mini fails
    try {
      const retryResponse = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.8,
        max_tokens: 4000,
      });

      const content = retryResponse.choices[0].message.content;
      if (content) {
        const parsed = JSON.parse(content);
        const validated = MaterialBatchSchema.parse(parsed);
        return { success: true, materials: validated };
      }
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

Return JSON:
{
  "summary": "Concise summary of learner's current level, strengths, and areas for improvement",
  "suggestedGoals": ["goal1", "goal2"],
  "strengthAreas": ["area1", "area2"],
  "weaknessAreas": ["area1", "area2"],
  "recommendedLevel": "A1|A2|B1|B2|C1|C2"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.5,
      max_tokens: 1500,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content generated');
    }

    const parsed = JSON.parse(content);
    const validated = MemorySummarySchema.parse(parsed);

    return {
      success: true,
      ...validated,
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
  estimatedLevel: z.string(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  suggestedCategories: z.array(z.string()),
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

Return JSON:
{
  "estimatedLevel": "A1|A2|B1|B2|C1|C2",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation of assessment",
  "suggestedCategories": ["category1", "category2"] // from: travel, work, shopping, health, food, housing, education, entertainment, social, daily_life
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 500,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content generated');
    }

    const parsed = JSON.parse(content);
    const validated = LevelAssessmentSchema.parse(parsed);

    return {
      success: true,
      ...validated,
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
    type: z.string(),
    pattern: z.string(),
    explanation: z.string(),
    frequency: z.string(),
    exercises: z.array(z.string()),
  })),
  overallAssessment: z.string(),
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

Return JSON:
{
  "patterns": [{
    "type": "article|word_order|conjugation|case|spelling|vocabulary|grammar|other",
    "pattern": "Description of the pattern",
    "explanation": "Why this mistake happens",
    "frequency": "common|occasional|rare",
    "exercises": ["Exercise suggestion 1", "Exercise suggestion 2"]
  }],
  "overallAssessment": "Brief overall assessment of the learner's challenges"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.4,
      max_tokens: 2000,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content generated');
    }

    const parsed = JSON.parse(content);
    const validated = MistakeAnalysisSchema.parse(parsed);

    return {
      success: true,
      ...validated,
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
