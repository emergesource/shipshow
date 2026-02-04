-- Migration: Add repository_branches to summaries
-- Stores which branch was used for each repository when generating the summary

ALTER TABLE summaries ADD COLUMN IF NOT EXISTS repository_branches jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN summaries.repository_branches IS 'JSON object mapping repository_id to branch name used during generation';
