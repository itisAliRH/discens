/**
 * Supabase Database Types
 * Auto-generated types for the Discens database schema
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type LanguageCode = 'en' | 'de';
export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type MaterialType = 'word' | 'phrase' | 'grammar' | 'expression' | 'text';
export type MaterialCategory =
  | 'travel'
  | 'work'
  | 'shopping'
  | 'health'
  | 'food'
  | 'housing'
  | 'education'
  | 'entertainment'
  | 'social'
  | 'daily_life';
export type CardState = 'New' | 'Learning' | 'Review' | 'Relearning';
export type SessionType = 'learn' | 'review' | 'conversation' | 'test';
export type MistakeType =
  | 'article'
  | 'word_order'
  | 'conjugation'
  | 'case'
  | 'spelling'
  | 'pronunciation'
  | 'vocabulary'
  | 'grammar'
  | 'other';
export type QuizType =
  | 'true_false'
  | 'multiple_choice'
  | 'fill_blank'
  | 'video'
  | 'reading'
  | 'game'
  | 'mix';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          avatar_url: string | null;
          target_language: LanguageCode;
          native_language: LanguageCode;
          gems: number;
          total_xp: number;
          preferred_quiz_types: QuizType[];
          daily_goal_minutes: number;
          notifications_enabled: boolean;
          theme: 'light' | 'dark' | 'system';
          ui_language: LanguageCode;
          created_at: string;
          updated_at: string;
          last_active_at: string | null;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          target_language?: LanguageCode;
          native_language?: LanguageCode;
          gems?: number;
          total_xp?: number;
          preferred_quiz_types?: QuizType[];
          daily_goal_minutes?: number;
          notifications_enabled?: boolean;
          theme?: 'light' | 'dark' | 'system';
          ui_language?: LanguageCode;
          created_at?: string;
          updated_at?: string;
          last_active_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          target_language?: LanguageCode;
          native_language?: LanguageCode;
          gems?: number;
          total_xp?: number;
          preferred_quiz_types?: QuizType[];
          daily_goal_minutes?: number;
          notifications_enabled?: boolean;
          theme?: 'light' | 'dark' | 'system';
          ui_language?: LanguageCode;
          updated_at?: string;
          last_active_at?: string | null;
        };
      };
      memories: {
        Row: {
          id: string;
          user_id: string;
          summary: string;
          goals: string[];
          top_categories: MaterialCategory[];
          total_materials: number;
          mastered_materials: number;
          created_at: string;
          updated_at: string;
          summary_updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          summary?: string;
          goals?: string[];
          top_categories?: MaterialCategory[];
          total_materials?: number;
          mastered_materials?: number;
          created_at?: string;
          updated_at?: string;
          summary_updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          summary?: string;
          goals?: string[];
          top_categories?: MaterialCategory[];
          total_materials?: number;
          mastered_materials?: number;
          updated_at?: string;
          summary_updated_at?: string | null;
        };
      };
      materials: {
        Row: {
          id: string;
          memory_id: string;
          type: MaterialType;
          content: Json;
          categories: MaterialCategory[];
          difficulty_level: number;
          mastery_level: number;
          cefr_level: CEFRLevel | null;
          source: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          memory_id: string;
          type: MaterialType;
          content: Json;
          categories: MaterialCategory[];
          difficulty_level?: number;
          mastery_level?: number;
          cefr_level?: CEFRLevel | null;
          source?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          memory_id?: string;
          type?: MaterialType;
          content?: Json;
          categories?: MaterialCategory[];
          difficulty_level?: number;
          mastery_level?: number;
          cefr_level?: CEFRLevel | null;
          source?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
      };
      review_cards: {
        Row: {
          id: string;
          material_id: string;
          stability: number;
          difficulty: number;
          elapsed_days: number;
          scheduled_days: number;
          reps: number;
          lapses: number;
          state: CardState;
          due: string;
          last_review: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          material_id: string;
          stability?: number;
          difficulty?: number;
          elapsed_days?: number;
          scheduled_days?: number;
          reps?: number;
          lapses?: number;
          state?: CardState;
          due?: string;
          last_review?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          material_id?: string;
          stability?: number;
          difficulty?: number;
          elapsed_days?: number;
          scheduled_days?: number;
          reps?: number;
          lapses?: number;
          state?: CardState;
          due?: string;
          last_review?: string | null;
          updated_at?: string;
        };
      };
      learning_sessions: {
        Row: {
          id: string;
          user_id: string;
          session_type: SessionType;
          quiz_type: QuizType | null;
          materials_covered: string[];
          correct_count: number;
          incorrect_count: number;
          skipped_count: number;
          duration_seconds: number;
          started_at: string;
          completed_at: string | null;
          conversation_scenario: string | null;
          conversation_transcript: Json | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          session_type: SessionType;
          quiz_type?: QuizType | null;
          materials_covered?: string[];
          correct_count?: number;
          incorrect_count?: number;
          skipped_count?: number;
          duration_seconds?: number;
          started_at?: string;
          completed_at?: string | null;
          conversation_scenario?: string | null;
          conversation_transcript?: Json | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          session_type?: SessionType;
          quiz_type?: QuizType | null;
          materials_covered?: string[];
          correct_count?: number;
          incorrect_count?: number;
          skipped_count?: number;
          duration_seconds?: number;
          started_at?: string;
          completed_at?: string | null;
          conversation_scenario?: string | null;
          conversation_transcript?: Json | null;
        };
      };
      streaks: {
        Row: {
          id: string;
          user_id: string;
          current_streak: number;
          longest_streak: number;
          last_activity_date: string | null;
          streak_start_date: string | null;
          total_days_active: number;
          total_time_minutes: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          current_streak?: number;
          longest_streak?: number;
          last_activity_date?: string | null;
          streak_start_date?: string | null;
          total_days_active?: number;
          total_time_minutes?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          current_streak?: number;
          longest_streak?: number;
          last_activity_date?: string | null;
          streak_start_date?: string | null;
          total_days_active?: number;
          total_time_minutes?: number;
          updated_at?: string;
        };
      };
      mistakes: {
        Row: {
          id: string;
          user_id: string;
          material_id: string | null;
          mistake_type: MistakeType;
          pattern: string;
          explanation: string | null;
          examples: Json;
          occurrences: number;
          last_occurrence: string;
          resolved: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          material_id?: string | null;
          mistake_type: MistakeType;
          pattern: string;
          explanation?: string | null;
          examples?: Json;
          occurrences?: number;
          last_occurrence?: string;
          resolved?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          material_id?: string | null;
          mistake_type?: MistakeType;
          pattern?: string;
          explanation?: string | null;
          examples?: Json;
          occurrences?: number;
          last_occurrence?: string;
          resolved?: boolean;
          updated_at?: string;
        };
      };
      badges: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string;
          icon: string;
          requirement_type: string;
          requirement_value: number;
          tier: 'bronze' | 'silver' | 'gold' | 'platinum';
          xp_reward: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description: string;
          icon: string;
          requirement_type: string;
          requirement_value: number;
          tier?: 'bronze' | 'silver' | 'gold' | 'platinum';
          xp_reward?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          description?: string;
          icon?: string;
          requirement_type?: string;
          requirement_value?: number;
          tier?: 'bronze' | 'silver' | 'gold' | 'platinum';
          xp_reward?: number;
        };
      };
      user_badges: {
        Row: {
          id: string;
          user_id: string;
          badge_id: string;
          earned_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          badge_id: string;
          earned_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          badge_id?: string;
          earned_at?: string;
        };
      };
      friendships: {
        Row: {
          id: string;
          user_id: string;
          friend_id: string;
          status: 'pending' | 'accepted' | 'blocked';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          friend_id: string;
          status?: 'pending' | 'accepted' | 'blocked';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          friend_id?: string;
          status?: 'pending' | 'accepted' | 'blocked';
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      language_code: LanguageCode;
      cefr_level: CEFRLevel;
      material_type: MaterialType;
      material_category: MaterialCategory;
      card_state: CardState;
      session_type: SessionType;
      mistake_type: MistakeType;
      quiz_type: QuizType;
    };
  };
}

// Helper types for easier usage
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Memory = Database['public']['Tables']['memories']['Row'];
export type Material = Database['public']['Tables']['materials']['Row'];
export type ReviewCard = Database['public']['Tables']['review_cards']['Row'];
export type LearningSession = Database['public']['Tables']['learning_sessions']['Row'];
export type Streak = Database['public']['Tables']['streaks']['Row'];
export type Mistake = Database['public']['Tables']['mistakes']['Row'];
export type Badge = Database['public']['Tables']['badges']['Row'];
export type UserBadge = Database['public']['Tables']['user_badges']['Row'];
export type Friendship = Database['public']['Tables']['friendships']['Row'];

// Insert types
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type MemoryInsert = Database['public']['Tables']['memories']['Insert'];
export type MaterialInsert = Database['public']['Tables']['materials']['Insert'];
export type ReviewCardInsert = Database['public']['Tables']['review_cards']['Insert'];
export type LearningSessionInsert = Database['public']['Tables']['learning_sessions']['Insert'];
export type StreakInsert = Database['public']['Tables']['streaks']['Insert'];
export type MistakeInsert = Database['public']['Tables']['mistakes']['Insert'];

// Update types
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];
export type MemoryUpdate = Database['public']['Tables']['memories']['Update'];
export type MaterialUpdate = Database['public']['Tables']['materials']['Update'];
export type ReviewCardUpdate = Database['public']['Tables']['review_cards']['Update'];
export type LearningSessionUpdate = Database['public']['Tables']['learning_sessions']['Update'];
export type StreakUpdate = Database['public']['Tables']['streaks']['Update'];
export type MistakeUpdate = Database['public']['Tables']['mistakes']['Update'];
