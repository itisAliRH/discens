import OpenAI from 'openai';

/**
 * OpenAI Client Configuration
 * Used for: GPT-4o (conversations), GPT-4o-mini (structured outputs)
 *
 * Lazy initialization to avoid requiring OPENAI_API_KEY during build time.
 * This is important for Cloudflare Pages builds where secrets are only available at runtime.
 */
let _openai: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return _openai;
}

/**
 * Model Configuration Constants
 * Centralized model selection for easy updates
 */
export const MODELS = {
  // OpenAI Models
  CONVERSATION: 'gpt-4o' as const,           // Real conversations, role-play
  STRUCTURED: 'gpt-4o-mini' as const,        // Quiz generation, structured outputs
  ANALYSIS: 'gpt-4o-mini' as const,          // Memory analysis, mistake patterns
  MULTIMODAL: 'gpt-4o' as const,             // Content with images/audio
  FALLBACK: 'gpt-4o-mini' as const,          // Cost-effective fallback
} as const;

/**
 * Feature to Model Mapping
 * Defines which model to use for each feature
 */
export const FEATURE_MODELS = {
  quizGeneration: { primary: MODELS.STRUCTURED, fallback: MODELS.FALLBACK },
  realConversation: { primary: MODELS.CONVERSATION, fallback: MODELS.STRUCTURED },
  memorySummary: { primary: MODELS.STRUCTURED, fallback: MODELS.FALLBACK },
  mistakeAnalysis: { primary: MODELS.ANALYSIS, fallback: MODELS.FALLBACK },
  videoAnalysis: { primary: MODELS.MULTIMODAL, fallback: MODELS.STRUCTURED },
  levelAssessment: { primary: MODELS.CONVERSATION, fallback: MODELS.STRUCTURED },
} as const;

export type ModelType = typeof MODELS[keyof typeof MODELS];
export type FeatureType = keyof typeof FEATURE_MODELS;
