-- Migration: Update channels and messages tables
-- Channels define output formats (Email, Twitter, LinkedIn, etc.)
-- Messages are channel-specific versions of summaries

-- ============================================================================
-- STEP 1: Update channels table
-- ============================================================================

-- Drop old columns and add new ones
ALTER TABLE channels DROP COLUMN IF EXISTS max_length;
ALTER TABLE channels DROP COLUMN IF EXISTS format;
ALTER TABLE channels DROP COLUMN IF EXISTS rules;

ALTER TABLE channels ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS prompt_template text;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS character_limit integer;

-- Add unique constraint on name
ALTER TABLE channels ADD CONSTRAINT channels_name_unique UNIQUE (name);

-- Add RLS policy if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'channels' AND policyname = 'All users can read channels'
  ) THEN
    CREATE POLICY "All users can read channels" ON channels
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Update messages table
-- ============================================================================

-- Rename content column to text if needed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'content'
  ) THEN
    ALTER TABLE messages RENAME COLUMN content TO text;
  END IF;
END $$;

-- Add updated_at column
ALTER TABLE messages ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Add unique constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'messages_summary_id_channel_id_key'
  ) THEN
    ALTER TABLE messages ADD CONSTRAINT messages_summary_id_channel_id_key UNIQUE (summary_id, channel_id);
  END IF;
END $$;

-- Update foreign keys to cascade
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_summary_id_fkey;
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_channel_id_fkey;
ALTER TABLE messages ADD CONSTRAINT messages_summary_id_fkey
  FOREIGN KEY (summary_id) REFERENCES summaries(id) ON DELETE CASCADE;
ALTER TABLE messages ADD CONSTRAINT messages_channel_id_fkey
  FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE;

-- Update RLS policy for messages
DROP POLICY IF EXISTS "Users can manage messages in their own projects" ON messages;
CREATE POLICY "Users can manage messages in their own projects" ON messages
  FOR ALL
  USING (
    summary_id IN (
      SELECT s.id FROM summaries s
      JOIN projects p ON s.project_id = p.id
      WHERE p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    summary_id IN (
      SELECT s.id FROM summaries s
      JOIN projects p ON s.project_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

-- ============================================================================
-- STEP 3: Clear old data and seed channels with system templates
-- ============================================================================

-- Clear existing channels (this will cascade to messages)
DELETE FROM channels;

-- Insert new channel templates
INSERT INTO channels (name, description, prompt_template, character_limit) VALUES
(
  'Email',
  'Professional email format for team updates and stakeholder communication',
  'You are transforming a work summary into a professional email.

IMPORTANT GUIDELINES:
- Keep the tone professional but conversational
- Focus on outcomes and progress
- Structure with clear paragraphs
- Keep it concise - aim for 200-300 words
- No subject line needed - just body text
- Match the audience''s technical level from the original summary

Transform the summary below into email body text:',
  NULL
),
(
  'Twitter',
  'Concise tweet format (280 characters max)',
  'You are transforming a work summary into a tweet.

IMPORTANT GUIDELINES:
- Maximum 280 characters (CRITICAL - count carefully)
- Make every word count
- Focus on the most impactful outcome
- Use clear, punchy language
- No hashtags unless they add real value
- Match the audience''s technical level from the original summary

Transform the summary below into a tweet:',
  280
),
(
  'LinkedIn',
  'Professional LinkedIn post format',
  'You are transforming a work summary into a LinkedIn post.

IMPORTANT GUIDELINES:
- Professional yet personal tone
- Focus on learnings, outcomes, and impact
- Use short paragraphs for readability
- Aim for 150-200 words
- First line should hook the reader
- Match the audience''s technical level from the original summary

Transform the summary below into a LinkedIn post:',
  NULL
),
(
  'Release Notes',
  'Technical release notes format for product updates',
  'You are transforming a work summary into release notes.

IMPORTANT GUIDELINES:
- Use bullet points for changes
- Group by type if applicable (Features, Improvements, Fixes)
- Be specific and technical
- Focus on what changed and why it matters
- Keep descriptions concise but complete
- Match the audience''s technical level from the original summary

Transform the summary below into release notes:',
  NULL
);

-- ============================================================================
-- Migration complete!
-- ============================================================================
