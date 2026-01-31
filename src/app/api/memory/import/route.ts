import { createUntypedServerClient } from '@/lib/supabase/server-untyped';
import { NextResponse } from 'next/server';
import { getOpenAIClient } from '@/lib/ai/providers';
import { z } from 'zod';
import type { MaterialType, MaterialCategory, CEFRLevel } from '@/types/database';

// ============================================
// SCHEMAS
// ============================================

const PrefillRequestSchema = z.object({
  type: z.enum(['word', 'phrase', 'grammar', 'expression', 'text']),
  rawContent: z.string().min(1).max(10000),
  targetLanguage: z.enum(['en', 'de']).optional().default('de'),
  nativeLanguage: z.enum(['en', 'de']).optional().default('en'),
});

const ValidateRequestSchema = z.object({
  type: z.enum(['word', 'phrase', 'grammar', 'expression', 'text']),
  content: z.record(z.string(), z.unknown()),
  categories: z.array(z.string()).min(1).max(5),
  cefrLevel: z.string(),
  targetLanguage: z.enum(['en', 'de']).optional().default('de'),
  nativeLanguage: z.enum(['en', 'de']).optional().default('en'),
});

// Prefill response schemas for each type
const WordPrefillSchema = z.object({
  word: z.string(),
  article: z.string().optional(),
  meaning: z.string(),
  pronunciation: z.string().optional(),
  examples: z.array(z.string()).default([]),
  synonyms: z.array(z.string()).optional(),
  antonyms: z.array(z.string()).optional(),
  partOfSpeech: z.string(),
  pluralForm: z.string().optional(),
  conjugation: z.record(z.string(), z.string()).optional(),
});

const PhrasePrefillSchema = z.object({
  phrase: z.string(),
  meaning: z.string(),
  literal: z.string().optional(),
  usage: z.string(),
  examples: z.array(z.string()).default([]),
  formality: z.enum(['formal', 'informal', 'neutral']).optional(),
});

const GrammarPrefillSchema = z.object({
  rule: z.string(),
  explanation: z.string(),
  examples: z.array(z.object({
    correct: z.string(),
    incorrect: z.string().optional(),
    explanation: z.string().optional(),
  })).default([]),
  relatedRules: z.array(z.string()).optional(),
});

const ExpressionPrefillSchema = z.object({
  expression: z.string(),
  meaning: z.string(),
  origin: z.string().optional(),
  examples: z.array(z.string()).default([]),
  equivalents: z.array(z.string()).optional(),
});

const TextPrefillSchema = z.object({
  title: z.string(),
  content: z.string(),
  summary: z.string().optional(),
  vocabulary: z.array(z.string()).optional(),
  questions: z.array(z.object({
    question: z.string(),
    answer: z.string(),
  })).optional(),
});

const PrefillResultSchema = z.object({
  content: z.union([
    WordPrefillSchema,
    PhrasePrefillSchema,
    GrammarPrefillSchema,
    ExpressionPrefillSchema,
    TextPrefillSchema,
  ]),
  suggestedCategories: z.array(z.string()).max(5),
  suggestedCefrLevel: z.string(),
  suggestedDifficulty: z.number().min(1).max(5),
  confidence: z.number().min(0).max(1),
});

const ValidationResultSchema = z.object({
  isValid: z.boolean(),
  issues: z.array(z.object({
    field: z.string(),
    severity: z.enum(['error', 'warning', 'suggestion']),
    message: z.string(),
    suggestedValue: z.unknown().optional(),
  })),
  corrections: z.record(z.string(), z.unknown()).optional(),
  overallAssessment: z.string(),
});

// ============================================
// PREFILL ENDPOINT
// ============================================

/**
 * POST /api/memory/import
 * Prefill material fields using LLM based on raw input
 */
export async function POST(request: Request) {
  try {
    const supabase = await createUntypedServerClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'validate') {
      return handleValidation(body);
    }

    // Default action is prefill
    return handlePrefill(body);
  } catch (error) {
    console.error('Import API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handlePrefill(body: unknown) {
  const parsed = PrefillRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ 
      error: 'Invalid request', 
      details: parsed.error.flatten() 
    }, { status: 400 });
  }

  const { type, rawContent, targetLanguage, nativeLanguage } = parsed.data;
  const languageName = targetLanguage === 'de' ? 'German' : 'English';
  const nativeName = nativeLanguage === 'de' ? 'German' : 'English';

  const typeInstructions: Record<MaterialType, string> = {
    word: `Extract a vocabulary word. For German nouns, ALWAYS include the article (der/die/das). Include:
- word: The word itself
- article: For German nouns (der/die/das)
- meaning: Translation/definition in ${nativeName}
- pronunciation: IPA if possible
- examples: 1-3 example sentences using the word
- synonyms: Similar words
- antonyms: Opposite words (if applicable)
- partOfSpeech: noun, verb, adjective, adverb, etc.
- pluralForm: For nouns
- conjugation: For verbs (key tenses)`,
    phrase: `Extract a phrase/expression. Include:
- phrase: The phrase itself
- meaning: Translation/explanation in ${nativeName}
- literal: Literal translation (if idiomatic)
- usage: When/how to use this phrase
- examples: 1-3 example usages
- formality: formal, informal, or neutral`,
    grammar: `Extract a grammar rule. Include:
- rule: The grammar rule name/title
- explanation: Clear explanation in ${nativeName}
- examples: Array of {correct, incorrect?, explanation?}
- relatedRules: Connected grammar concepts`,
    expression: `Extract an idiom/expression. Include:
- expression: The expression itself
- meaning: What it means in ${nativeName}
- origin: Historical/cultural origin (if known)
- examples: Usage examples
- equivalents: Similar expressions in ${nativeName}`,
    text: `Process this reading text. Include:
- title: A descriptive title
- content: The full text (cleaned up)
- summary: Brief summary in ${nativeName}
- vocabulary: Key vocabulary words from the text
- questions: Comprehension questions with answers`,
  };

  const systemPrompt = `You are a ${languageName} language teaching expert. Your task is to analyze raw input and structure it into a proper learning material.

Guidelines:
- Be accurate and precise with all linguistic information
- For German: ALWAYS include articles for nouns, pay attention to cases
- Provide practical, real-world examples
- Assess the difficulty level accurately using CEFR standards
- Suggest relevant categories from: travel, work, shopping, health, food, housing, education, entertainment, social, daily_life

${typeInstructions[type]}

Return valid JSON only.`;

  const userPrompt = `Analyze this ${type} material and extract structured data:

"${rawContent}"

Return JSON with this structure:
{
  "content": { /* structured content based on type */ },
  "suggestedCategories": ["category1", "category2"], // max 5, from the allowed list
  "suggestedCefrLevel": "A1|A2|B1|B2|C1|C2",
  "suggestedDifficulty": 1-5,
  "confidence": 0.0-1.0 // how confident you are in the extraction
}`;

  try {
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 2000,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content generated');
    }

    const result = JSON.parse(content);
    const validated = PrefillResultSchema.parse(result);

    return NextResponse.json({
      success: true,
      prefill: validated,
    });
  } catch (error) {
    console.error('Prefill error:', error);
    
    // Return a fallback structure
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to prefill',
      prefill: null,
    }, { status: 500 });
  }
}

// ============================================
// VALIDATION ENDPOINT
// ============================================

async function handleValidation(body: unknown) {
  const parsed = ValidateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ 
      error: 'Invalid request', 
      details: parsed.error.flatten() 
    }, { status: 400 });
  }

  const { type, content, categories, cefrLevel, targetLanguage, nativeLanguage } = parsed.data;
  const languageName = targetLanguage === 'de' ? 'German' : 'English';
  const nativeName = nativeLanguage === 'de' ? 'German' : 'English';

  const systemPrompt = `You are a ${languageName} language expert and fact-checker. Your task is to validate learning material for accuracy and completeness.

Validation criteria:
1. SPELLING: Check all ${languageName} text for spelling errors
2. GRAMMAR: Verify grammatical correctness in examples
3. ARTICLES: For German nouns, verify the correct article (der/die/das)
4. MEANING: Verify the ${nativeName} translation/explanation is accurate
5. EXAMPLES: Check that examples correctly demonstrate the usage
6. CEFR LEVEL: Verify the difficulty matches the stated CEFR level
7. CATEGORIES: Verify categories are appropriate for the content
8. COMPLETENESS: Check if important fields are missing

Be strict but fair. Flag anything that could mislead a learner.`;

  const userPrompt = `Validate this ${type} material for accuracy and completeness:

Type: ${type}
Content: ${JSON.stringify(content, null, 2)}
Categories: ${categories.join(', ')}
CEFR Level: ${cefrLevel}

Return JSON:
{
  "isValid": true/false,
  "issues": [
    {
      "field": "field name that has an issue",
      "severity": "error|warning|suggestion",
      "message": "description of the issue",
      "suggestedValue": "corrected value if applicable"
    }
  ],
  "corrections": { /* object with corrected values for any fields with errors */ },
  "overallAssessment": "Brief summary of the validation result"
}

- "error" = Must be fixed before saving
- "warning" = Should consider fixing
- "suggestion" = Optional improvement`;

  try {
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 2000,
    });

    const responseContent = response.choices[0].message.content;
    if (!responseContent) {
      throw new Error('No content generated');
    }

    const result = JSON.parse(responseContent);
    const validated = ValidationResultSchema.parse(result);

    return NextResponse.json({
      success: true,
      validation: validated,
    });
  } catch (error) {
    console.error('Validation error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to validate',
      validation: null,
    }, { status: 500 });
  }
}
