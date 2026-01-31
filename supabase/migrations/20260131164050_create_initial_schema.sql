-- ============================================
-- Discens: AI Language Learning App
-- Initial Database Schema Migration
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUM TYPES
-- ============================================

-- Language enum
CREATE TYPE language_code AS ENUM ('en', 'de');

-- CEFR proficiency levels
CREATE TYPE cefr_level AS ENUM ('A1', 'A2', 'B1', 'B2', 'C1', 'C2');

-- Material types
CREATE TYPE material_type AS ENUM ('word', 'phrase', 'grammar', 'expression', 'text');

-- Material categories (fixed set)
CREATE TYPE material_category AS ENUM (
  'travel', 'work', 'shopping', 'health', 'food', 
  'housing', 'education', 'entertainment', 'social', 'daily_life'
);

-- FSRS card states
CREATE TYPE card_state AS ENUM ('New', 'Learning', 'Review', 'Relearning');

-- Session types
CREATE TYPE session_type AS ENUM ('learn', 'review', 'conversation', 'test');

-- Mistake types
CREATE TYPE mistake_type AS ENUM (
  'article', 'word_order', 'conjugation', 'case', 
  'spelling', 'pronunciation', 'vocabulary', 'grammar', 'other'
);

-- Quiz types
CREATE TYPE quiz_type AS ENUM (
  'true_false', 'multiple_choice', 'fill_blank', 
  'video', 'reading', 'game', 'mix'
);

-- ============================================
-- PROFILES TABLE (extends auth.users)
-- ============================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  target_language language_code DEFAULT 'de',
  native_language language_code DEFAULT 'en',
  
  -- Gamification
  gems INTEGER DEFAULT 50 NOT NULL CHECK (gems >= 0),
  total_xp INTEGER DEFAULT 0 NOT NULL CHECK (total_xp >= 0),
  
  -- Preferences
  preferred_quiz_types quiz_type[] DEFAULT ARRAY['multiple_choice', 'fill_blank']::quiz_type[],
  daily_goal_minutes INTEGER DEFAULT 10 CHECK (daily_goal_minutes >= 1 AND daily_goal_minutes <= 120),
  notifications_enabled BOOLEAN DEFAULT true,
  theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  ui_language language_code DEFAULT 'en',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_active_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MEMORIES TABLE (User's learning memory container)
-- ============================================

CREATE TABLE memories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Memory summary for LLM context (max 1000 chars)
  summary TEXT DEFAULT '' CHECK (length(summary) <= 1000),
  
  -- Learning goals
  goals TEXT[] DEFAULT ARRAY[]::TEXT[],
  top_categories material_category[] DEFAULT ARRAY[]::material_category[],
  
  -- Statistics (denormalized for performance)
  total_materials INTEGER DEFAULT 0 NOT NULL CHECK (total_materials >= 0),
  mastered_materials INTEGER DEFAULT 0 NOT NULL CHECK (mastered_materials >= 0),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Ensure one memory per user
  UNIQUE(user_id)
);

-- ============================================
-- MATERIALS TABLE (Individual learning items)
-- ============================================

CREATE TABLE materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  
  -- Material type and content
  type material_type NOT NULL,
  content JSONB NOT NULL,
  
  -- Categories (1-5 categories)
  categories material_category[] NOT NULL CHECK (
    array_length(categories, 1) >= 1 AND 
    array_length(categories, 1) <= 5
  ),
  
  -- Levels
  difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level >= 1 AND difficulty_level <= 5),
  mastery_level INTEGER DEFAULT 0 CHECK (mastery_level >= 0 AND mastery_level <= 5),
  cefr_level cefr_level,
  
  -- Metadata
  source TEXT, -- Where the material came from
  notes TEXT, -- User notes
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for efficient querying
CREATE INDEX idx_materials_memory_id ON materials(memory_id);
CREATE INDEX idx_materials_type ON materials(type);
CREATE INDEX idx_materials_mastery ON materials(mastery_level);
CREATE INDEX idx_materials_categories ON materials USING GIN(categories);

-- ============================================
-- REVIEW_CARDS TABLE (FSRS scheduling data)
-- ============================================

CREATE TABLE review_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  
  -- FSRS parameters
  stability FLOAT DEFAULT 0 NOT NULL,
  difficulty FLOAT DEFAULT 0 NOT NULL,
  elapsed_days INTEGER DEFAULT 0 NOT NULL,
  scheduled_days INTEGER DEFAULT 0 NOT NULL,
  reps INTEGER DEFAULT 0 NOT NULL CHECK (reps >= 0),
  lapses INTEGER DEFAULT 0 NOT NULL CHECK (lapses >= 0),
  state card_state DEFAULT 'New' NOT NULL,
  
  -- Scheduling
  due TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_review TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- One card per material
  UNIQUE(material_id)
);

-- Index for efficient due card queries
CREATE INDEX idx_review_cards_due ON review_cards(due);
CREATE INDEX idx_review_cards_state ON review_cards(state);

-- ============================================
-- LEARNING_SESSIONS TABLE
-- ============================================

CREATE TABLE learning_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Session details
  session_type session_type NOT NULL,
  quiz_type quiz_type,
  
  -- Materials covered in this session
  materials_covered UUID[] DEFAULT ARRAY[]::UUID[],
  
  -- Results
  correct_count INTEGER DEFAULT 0 NOT NULL CHECK (correct_count >= 0),
  incorrect_count INTEGER DEFAULT 0 NOT NULL CHECK (incorrect_count >= 0),
  skipped_count INTEGER DEFAULT 0 NOT NULL CHECK (skipped_count >= 0),
  
  -- Timing
  duration_seconds INTEGER DEFAULT 0 NOT NULL CHECK (duration_seconds >= 0),
  started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMPTZ,
  
  -- Conversation-specific
  conversation_scenario TEXT,
  conversation_transcript JSONB
);

-- Index for user's session history
CREATE INDEX idx_learning_sessions_user_id ON learning_sessions(user_id);
CREATE INDEX idx_learning_sessions_started_at ON learning_sessions(started_at DESC);

-- ============================================
-- STREAKS TABLE
-- ============================================

CREATE TABLE streaks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Current streak
  current_streak INTEGER DEFAULT 0 NOT NULL CHECK (current_streak >= 0),
  longest_streak INTEGER DEFAULT 0 NOT NULL CHECK (longest_streak >= 0),
  
  -- Activity tracking
  last_activity_date DATE,
  streak_start_date DATE,
  
  -- Total stats
  total_days_active INTEGER DEFAULT 0 NOT NULL CHECK (total_days_active >= 0),
  total_time_minutes INTEGER DEFAULT 0 NOT NULL CHECK (total_time_minutes >= 0),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- One streak record per user
  UNIQUE(user_id)
);

-- ============================================
-- MISTAKES TABLE (Common mistake patterns)
-- ============================================

CREATE TABLE mistakes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  material_id UUID REFERENCES materials(id) ON DELETE SET NULL,
  
  -- Mistake details
  mistake_type mistake_type NOT NULL,
  pattern TEXT NOT NULL, -- What the user keeps getting wrong
  explanation TEXT, -- AI-generated explanation
  
  -- Examples
  examples JSONB DEFAULT '[]'::JSONB, -- Array of {incorrect, correct} pairs
  
  -- Tracking
  occurrences INTEGER DEFAULT 1 NOT NULL CHECK (occurrences >= 1),
  last_occurrence TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  resolved BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for user's mistakes
CREATE INDEX idx_mistakes_user_id ON mistakes(user_id);
CREATE INDEX idx_mistakes_type ON mistakes(mistake_type);

-- ============================================
-- BADGES TABLE
-- ============================================

CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Badge details
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL, -- Emoji or icon name
  
  -- Requirements
  requirement_type TEXT NOT NULL, -- 'streak', 'materials', 'sessions', 'time', etc.
  requirement_value INTEGER NOT NULL,
  
  -- Metadata
  tier TEXT DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
  xp_reward INTEGER DEFAULT 0 NOT NULL CHECK (xp_reward >= 0),
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- User badges (many-to-many)
CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  UNIQUE(user_id, badge_id)
);

-- ============================================
-- FRIENDSHIPS TABLE
-- ============================================

CREATE TABLE friendships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Prevent duplicate friendships
  UNIQUE(user_id, friend_id),
  -- Prevent self-friendship
  CHECK (user_id != friend_id)
);

-- ============================================
-- INSERT DEFAULT BADGES
-- ============================================

INSERT INTO badges (slug, name, description, icon, requirement_type, requirement_value, tier, xp_reward) VALUES
  ('first_word', 'First Steps', 'Learn your first word', '🌱', 'materials', 1, 'bronze', 10),
  ('ten_words', 'Word Collector', 'Learn 10 words', '📚', 'materials', 10, 'bronze', 25),
  ('fifty_words', 'Vocabulary Builder', 'Learn 50 words', '📖', 'materials', 50, 'silver', 50),
  ('hundred_words', 'Word Master', 'Learn 100 words', '🏆', 'materials', 100, 'gold', 100),
  ('streak_3', 'Getting Started', '3 day streak', '🔥', 'streak', 3, 'bronze', 15),
  ('streak_7', 'Week Warrior', '7 day streak', '💪', 'streak', 7, 'silver', 30),
  ('streak_30', 'Month Master', '30 day streak', '⭐', 'streak', 30, 'gold', 100),
  ('streak_100', 'Unstoppable', '100 day streak', '👑', 'streak', 100, 'platinum', 500),
  ('first_conversation', 'Chatterbox', 'Complete your first conversation', '💬', 'conversations', 1, 'bronze', 20),
  ('ten_conversations', 'Social Butterfly', 'Complete 10 conversations', '🦋', 'conversations', 10, 'silver', 75),
  ('hour_studied', 'Dedicated Learner', 'Study for 1 hour total', '⏰', 'time', 60, 'bronze', 20),
  ('ten_hours', 'Time Investor', 'Study for 10 hours total', '📅', 'time', 600, 'silver', 100);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE mistakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can view friends profiles"
  ON profiles FOR SELECT
  USING (
    id IN (
      SELECT friend_id FROM friendships 
      WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

-- Memories policies
CREATE POLICY "Users can manage their own memory"
  ON memories FOR ALL
  USING (auth.uid() = user_id);

-- Materials policies
CREATE POLICY "Users can manage their own materials"
  ON materials FOR ALL
  USING (
    memory_id IN (SELECT id FROM memories WHERE user_id = auth.uid())
  );

-- Review cards policies
CREATE POLICY "Users can manage their own review cards"
  ON review_cards FOR ALL
  USING (
    material_id IN (
      SELECT m.id FROM materials m
      JOIN memories mem ON m.memory_id = mem.id
      WHERE mem.user_id = auth.uid()
    )
  );

-- Learning sessions policies
CREATE POLICY "Users can manage their own sessions"
  ON learning_sessions FOR ALL
  USING (auth.uid() = user_id);

-- Streaks policies
CREATE POLICY "Users can manage their own streaks"
  ON streaks FOR ALL
  USING (auth.uid() = user_id);

-- Mistakes policies
CREATE POLICY "Users can manage their own mistakes"
  ON mistakes FOR ALL
  USING (auth.uid() = user_id);

-- Badges policies (read-only for users)
CREATE POLICY "Anyone can view badges"
  ON badges FOR SELECT
  USING (true);

-- User badges policies
CREATE POLICY "Users can view their own badges"
  ON user_badges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert user badges"
  ON user_badges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Friendships policies
CREATE POLICY "Users can view their friendships"
  ON friendships FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can create friendship requests"
  ON friendships FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update friendships they're part of"
  ON friendships FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can delete their friendships"
  ON friendships FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables with updated_at column
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_memories_updated_at
  BEFORE UPDATE ON memories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_materials_updated_at
  BEFORE UPDATE ON materials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_review_cards_updated_at
  BEFORE UPDATE ON review_cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_streaks_updated_at
  BEFORE UPDATE ON streaks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_mistakes_updated_at
  BEFORE UPDATE ON mistakes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_friendships_updated_at
  BEFORE UPDATE ON friendships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile with explicit schema
  BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
      NEW.raw_user_meta_data->>'avatar_url'
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Profile creation failed: %', SQLERRM;
  END;
  
  -- Create memory container with explicit schema
  BEGIN
    INSERT INTO public.memories (user_id)
    VALUES (NEW.id);
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Memory creation failed: %', SQLERRM;
  END;
  
  -- Create streak record with explicit schema
  BEGIN
    INSERT INTO public.streaks (user_id)
    VALUES (NEW.id);
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Streak creation failed: %', SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup with explicit schema
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update memory statistics
CREATE OR REPLACE FUNCTION update_memory_stats()
RETURNS TRIGGER AS $$
DECLARE
  mem_id UUID;
BEGIN
  -- Get the memory_id
  IF TG_OP = 'DELETE' THEN
    mem_id := OLD.memory_id;
  ELSE
    mem_id := NEW.memory_id;
  END IF;
  
  -- Update the memory statistics
  UPDATE memories
  SET 
    total_materials = (SELECT COUNT(*) FROM materials WHERE memory_id = mem_id),
    mastered_materials = (SELECT COUNT(*) FROM materials WHERE memory_id = mem_id AND mastery_level >= 4),
    updated_at = NOW()
  WHERE id = mem_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update memory stats when materials change
CREATE TRIGGER update_memory_stats_on_material_change
  AFTER INSERT OR UPDATE OR DELETE ON materials
  FOR EACH ROW EXECUTE FUNCTION update_memory_stats();

-- Function to create review card when material is created
CREATE OR REPLACE FUNCTION create_review_card_for_material()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO review_cards (material_id, due)
  VALUES (NEW.id, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create review card
CREATE TRIGGER create_review_card_on_material_insert
  AFTER INSERT ON materials
  FOR EACH ROW EXECUTE FUNCTION create_review_card_for_material();

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Additional composite indexes for common queries
CREATE INDEX idx_materials_memory_mastery ON materials(memory_id, mastery_level);
CREATE INDEX idx_review_cards_due_state ON review_cards(due, state);
CREATE INDEX idx_learning_sessions_user_type ON learning_sessions(user_id, session_type);
CREATE INDEX idx_mistakes_user_resolved ON mistakes(user_id, resolved);
