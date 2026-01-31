import { z } from 'zod';

/**
 * CEFR Language Proficiency Levels
 */
export const CEFRLevel = z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
export type CEFRLevel = z.infer<typeof CEFRLevel>;

/**
 * Supported Languages
 */
export const Language = z.enum(['en', 'de']);
export type Language = z.infer<typeof Language>;

/**
 * Material Categories (fixed set)
 */
export const Category = z.enum([
  'travel',
  'work',
  'shopping',
  'health',
  'food',
  'housing',
  'education',
  'entertainment',
  'social',
  'daily_life',
]);
export type Category = z.infer<typeof Category>;

/**
 * Material Types
 */
export const MaterialType = z.enum([
  'word',
  'phrase',
  'grammar',
  'expression',
  'text',
]);
export type MaterialType = z.infer<typeof MaterialType>;

/**
 * Word Content Schema (for vocabulary items)
 */
export const WordContentSchema = z.object({
  word: z.string(),
  article: z.string().optional(), // der/die/das for German
  meaning: z.string(),
  pronunciation: z.string().optional(),
  examples: z.array(z.string()),
  synonyms: z.array(z.string()).optional(),
  antonyms: z.array(z.string()).optional(),
  partOfSpeech: z.string(),
  pluralForm: z.string().optional(),
  conjugation: z.record(z.string(), z.string()).optional(), // For verbs
});
export type WordContent = z.infer<typeof WordContentSchema>;

/**
 * Phrase Content Schema
 */
export const PhraseContentSchema = z.object({
  phrase: z.string(),
  meaning: z.string(),
  literal: z.string().optional(), // Literal translation
  usage: z.string(),
  examples: z.array(z.string()),
  formality: z.enum(['formal', 'informal', 'neutral']).optional(),
});
export type PhraseContent = z.infer<typeof PhraseContentSchema>;

/**
 * Grammar Content Schema
 */
export const GrammarContentSchema = z.object({
  rule: z.string(),
  explanation: z.string(),
  examples: z.array(
    z.object({
      correct: z.string(),
      incorrect: z.string().optional(),
      explanation: z.string().optional(),
    })
  ),
  level: CEFRLevel,
  relatedRules: z.array(z.string()).optional(),
});
export type GrammarContent = z.infer<typeof GrammarContentSchema>;

/**
 * Expression Content Schema (idioms, colloquialisms)
 */
export const ExpressionContentSchema = z.object({
  expression: z.string(),
  meaning: z.string(),
  origin: z.string().optional(),
  examples: z.array(z.string()),
  equivalents: z.array(z.string()).optional(), // Equivalents in other languages
});
export type ExpressionContent = z.infer<typeof ExpressionContentSchema>;

/**
 * Text Content Schema (longer reading materials)
 */
export const TextContentSchema = z.object({
  title: z.string(),
  content: z.string(),
  summary: z.string().optional(),
  vocabulary: z.array(z.string()).optional(), // Key vocabulary in the text
  questions: z
    .array(
      z.object({
        question: z.string(),
        answer: z.string(),
      })
    )
    .optional(),
});
export type TextContent = z.infer<typeof TextContentSchema>;

/**
 * Material Schema - Individual learning item
 */
export const MaterialSchema = z.object({
  id: z.string().uuid(),
  memoryId: z.string().uuid(),
  type: MaterialType,
  content: z.union([
    WordContentSchema,
    PhraseContentSchema,
    GrammarContentSchema,
    ExpressionContentSchema,
    TextContentSchema,
  ]),
  categoryIds: z.array(Category).min(1).max(5),
  masteryLevel: z.number().int().min(0).max(5), // 0=new, 5=mastered
  difficultyLevel: z.number().int().min(1).max(5),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Material = z.infer<typeof MaterialSchema>;

/**
 * Memory Schema - Container for user's learning materials
 */
export const MemorySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  targetLanguage: Language,
  nativeLanguage: Language,
  summary: z.string().max(1000), // Compressed summary for LLM context
  goals: z.array(z.string()),
  preferences: z.object({
    topCategories: z.array(Category).max(5),
    preferredQuizTypes: z.array(z.string()),
    dailyGoalMinutes: z.number().int().min(1).max(120),
    notificationsEnabled: z.boolean(),
  }),
  stats: z.object({
    totalMaterials: z.number().int(),
    masteredMaterials: z.number().int(),
    currentStreak: z.number().int(),
    longestStreak: z.number().int(),
    totalTimeMinutes: z.number().int(),
  }),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Memory = z.infer<typeof MemorySchema>;

/**
 * Review Card Schema - FSRS scheduling data
 */
export const ReviewCardSchema = z.object({
  id: z.string().uuid(),
  materialId: z.string().uuid(),
  stability: z.number(),
  difficulty: z.number(),
  elapsedDays: z.number(),
  scheduledDays: z.number(),
  reps: z.number().int(),
  lapses: z.number().int(),
  state: z.enum(['New', 'Learning', 'Review', 'Relearning']),
  due: z.date(),
  lastReview: z.date().nullable(),
});
export type ReviewCard = z.infer<typeof ReviewCardSchema>;

/**
 * Learning Session Schema
 */
export const LearningSessionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  sessionType: z.enum(['learn', 'review', 'conversation', 'test']),
  materialsCovered: z.array(z.string().uuid()),
  results: z.object({
    correct: z.number().int(),
    incorrect: z.number().int(),
    skipped: z.number().int(),
  }),
  durationSeconds: z.number().int(),
  startedAt: z.date(),
  completedAt: z.date().nullable(),
});
export type LearningSession = z.infer<typeof LearningSessionSchema>;

/**
 * Mistake Schema - For tracking common errors
 */
export const MistakeSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  materialId: z.string().uuid().nullable(),
  mistakeType: z.enum([
    'article',
    'word_order',
    'conjugation',
    'case',
    'spelling',
    'pronunciation',
    'vocabulary',
    'grammar',
    'other',
  ]),
  pattern: z.string(),
  explanation: z.string(),
  examples: z.array(
    z.object({
      incorrect: z.string(),
      correct: z.string(),
    })
  ),
  occurrences: z.number().int(),
  lastOccurrence: z.date(),
  createdAt: z.date(),
});
export type Mistake = z.infer<typeof MistakeSchema>;
