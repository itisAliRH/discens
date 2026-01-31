/**
 * Central export for all types
 */

// Database types (Supabase) - Row types for database operations
export type {
  Database,
  Profile,
  Memory,
  Material,
  ReviewCard,
  LearningSession,
  Streak,
  Mistake,
  Badge,
  UserBadge,
  Friendship,
  ProfileInsert,
  MemoryInsert,
  MaterialInsert,
  ReviewCardInsert,
  LearningSessionInsert,
  StreakInsert,
  MistakeInsert,
  ProfileUpdate,
  MemoryUpdate,
  MaterialUpdate,
  ReviewCardUpdate,
  LearningSessionUpdate,
  StreakUpdate,
  MistakeUpdate,
  Json,
  LanguageCode,
  CardState,
  SessionType,
  QuizType,
} from './database';

// Database enums that don't conflict
export type {
  CEFRLevel as DBCEFRLevel,
  MaterialType as DBMaterialType,
  MaterialCategory as DBMaterialCategory,
  MistakeType as DBMistakeType,
} from './database';

// Memory validation schemas (Zod) - for runtime validation
export {
  CEFRLevel,
  Language,
  Category,
  MaterialType,
  WordContentSchema,
  PhraseContentSchema,
  GrammarContentSchema,
  ExpressionContentSchema,
  TextContentSchema,
  MaterialSchema,
  MemorySchema,
  ReviewCardSchema,
  LearningSessionSchema,
  MistakeSchema,
} from './memory';

// Inferred types from Zod schemas
export type {
  WordContent,
  PhraseContent,
  GrammarContent,
  ExpressionContent,
  TextContent,
} from './memory';
