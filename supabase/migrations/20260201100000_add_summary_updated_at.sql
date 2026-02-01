-- ============================================
-- Add summary_updated_at field to memories table
-- Tracks when the AI-generated summary was last updated
-- ============================================

-- Add the new column
ALTER TABLE memories
ADD COLUMN summary_updated_at TIMESTAMPTZ DEFAULT NULL;

-- Set initial value to created_at for existing rows with a summary
UPDATE memories
SET summary_updated_at = created_at
WHERE summary IS NOT NULL AND summary != '';

-- Add a comment for documentation
COMMENT ON COLUMN memories.summary_updated_at IS 'Timestamp of when the AI-generated learning summary was last updated';
