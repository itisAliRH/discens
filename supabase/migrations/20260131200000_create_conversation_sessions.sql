-- ============================================
-- CONVERSATION SESSIONS TABLE
-- Stores conversation history with unique IDs
-- ============================================

CREATE TABLE IF NOT EXISTS conversation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Scenario info
  scenario_id TEXT NOT NULL,
  scenario_name TEXT NOT NULL,
  scenario_description TEXT,
  environment TEXT DEFAULT 'none',
  
  -- Conversation data
  messages JSONB DEFAULT '[]',
  input_mode TEXT DEFAULT 'text',
  
  -- Feedback (after completion)
  feedback JSONB,
  overall_score INTEGER,
  fluency_score INTEGER,
  grammar_score INTEGER,
  vocabulary_score INTEGER,
  xp_earned INTEGER DEFAULT 0,
  
  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast user lookups
CREATE INDEX idx_conversation_sessions_user_id ON conversation_sessions(user_id);
CREATE INDEX idx_conversation_sessions_created_at ON conversation_sessions(created_at DESC);

-- Enable RLS
ALTER TABLE conversation_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only access their own sessions
CREATE POLICY "Users can view own conversation sessions"
  ON conversation_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversation sessions"
  ON conversation_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversation sessions"
  ON conversation_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversation sessions"
  ON conversation_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_conversation_session_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER conversation_sessions_updated_at
  BEFORE UPDATE ON conversation_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_session_updated_at();
