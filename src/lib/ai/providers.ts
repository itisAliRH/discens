import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';

/**
 * OpenAI Client Configuration
 * Used for: GPT-4o (conversations), GPT-4o-mini (structured outputs)
 */
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Google Gemini Client Configuration
 * Used for: Gemini 2.0 Flash (multimodal), Gemini 1.5 Pro (fallback)
 */
export const gemini = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

/**
 * Model Configuration Constants
 * Centralized model selection for easy updates
 */
export const MODELS = {
  // OpenAI Models
  CONVERSATION: 'gpt-4o' as const,           // Real conversations, role-play
  STRUCTURED: 'gpt-4o-mini' as const,        // Quiz generation, structured outputs
  ANALYSIS: 'gpt-4o-mini' as const,          // Memory analysis, mistake patterns
  
  // Gemini Models  
  MULTIMODAL: 'gemini-2.0-flash' as const,   // Video/audio content analysis
  FALLBACK: 'gemini-1.5-flash' as const,     // Cost-effective fallback
} as const;

/**
 * Feature to Model Mapping
 * Defines which model to use for each feature
 */
export const FEATURE_MODELS = {
  quizGeneration: { primary: MODELS.STRUCTURED, fallback: MODELS.MULTIMODAL },
  realConversation: { primary: MODELS.CONVERSATION, fallback: MODELS.FALLBACK },
  memorySummary: { primary: MODELS.STRUCTURED, fallback: MODELS.MULTIMODAL },
  mistakeAnalysis: { primary: MODELS.ANALYSIS, fallback: MODELS.MULTIMODAL },
  videoAnalysis: { primary: MODELS.MULTIMODAL, fallback: null },
  levelAssessment: { primary: MODELS.CONVERSATION, fallback: MODELS.FALLBACK },
} as const;

export type ModelType = typeof MODELS[keyof typeof MODELS];
export type FeatureType = keyof typeof FEATURE_MODELS;
