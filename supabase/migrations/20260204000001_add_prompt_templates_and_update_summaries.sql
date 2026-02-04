-- Migration: Add prompt_templates table and update summaries table
-- Adds system-wide prompt templates for AI generation and updated_at to summaries

-- ============================================================================
-- STEP 1: Create prompt_templates table
-- ============================================================================

CREATE TABLE IF NOT EXISTS prompt_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  system_prompt text NOT NULL,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE prompt_templates ENABLE ROW LEVEL SECURITY;

-- Grant permissions (read-only for users)
GRANT SELECT ON prompt_templates TO authenticated;

-- ============================================================================
-- STEP 2: Add updated_at to summaries table
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'summaries' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE summaries ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Insert seed data for prompt templates
-- ============================================================================

INSERT INTO prompt_templates (name, description, system_prompt, is_default)
VALUES (
  'Default Summary Prompt',
  'General purpose summary prompt that blends notes and commits into clear updates',
  'You are a professional technical writer helping a developer summarize their work for a specific audience.

Your goal is to create a clear, honest summary that:
- Blends intent (from notes) with evidence (from commits)
- Focuses on outcomes and progress, not implementation details
- Matches the audience''s level of technical understanding
- Avoids hallucinating scope or success
- Calls out uncertainty when data is thin

The summary should read like a human explaining their work, not a changelog.

IMPORTANT GUIDELINES:
- Be confident but not salesy
- Be clear but not verbose
- Never invent commits or features not supported by the inputs
- Don''t assume deadlines were met without evidence
- Don''t imply completion without proof

Output only the summary text, no meta-commentary.',
  true
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Migration complete!
-- ============================================================================
