-- Migration: Recreate summaries table after audiences restructure
-- The previous migration dropped audiences CASCADE which should have dropped summaries
-- This migration recreates summaries with the correct foreign key relationships

-- ============================================================================
-- STEP 1: Drop summaries table if it exists (clean slate)
-- ============================================================================

DROP TABLE IF EXISTS summaries CASCADE;
DROP TABLE IF EXISTS summary_notes CASCADE;
DROP TABLE IF EXISTS summary_commits CASCADE;

-- ============================================================================
-- STEP 2: Recreate summaries table with correct foreign keys
-- ============================================================================

CREATE TABLE summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  audience_id uuid NOT NULL REFERENCES audiences(id) ON DELETE CASCADE,
  text text NOT NULL,
  period_start timestamptz,
  period_end timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- STEP 3: Recreate summary_notes join table
-- ============================================================================

CREATE TABLE summary_notes (
  summary_id uuid REFERENCES summaries(id) ON DELETE CASCADE,
  note_id uuid REFERENCES notes(id) ON DELETE CASCADE,
  PRIMARY KEY (summary_id, note_id)
);

-- ============================================================================
-- STEP 4: Recreate summary_commits join table
-- ============================================================================

CREATE TABLE summary_commits (
  summary_id uuid REFERENCES summaries(id) ON DELETE CASCADE,
  commit_id uuid REFERENCES commits(id) ON DELETE CASCADE,
  PRIMARY KEY (summary_id, commit_id)
);

-- ============================================================================
-- STEP 5: Set up RLS for summaries
-- ============================================================================

ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON summaries TO authenticated;

CREATE POLICY "Users can manage summaries in their own projects" ON summaries
  FOR ALL
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()))
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

-- ============================================================================
-- STEP 6: Set up RLS for summary_notes
-- ============================================================================

ALTER TABLE summary_notes ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON summary_notes TO authenticated;

CREATE POLICY "Users can manage summary_notes in their own projects" ON summary_notes
  FOR ALL
  USING (summary_id IN (SELECT s.id FROM summaries s JOIN projects p ON s.project_id = p.id WHERE p.user_id = auth.uid()))
  WITH CHECK (summary_id IN (SELECT s.id FROM summaries s JOIN projects p ON s.project_id = p.id WHERE p.user_id = auth.uid()));

-- ============================================================================
-- STEP 7: Set up RLS for summary_commits
-- ============================================================================

ALTER TABLE summary_commits ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON summary_commits TO authenticated;

CREATE POLICY "Users can manage summary_commits in their own projects" ON summary_commits
  FOR ALL
  USING (summary_id IN (SELECT s.id FROM summaries s JOIN projects p ON s.project_id = p.id WHERE p.user_id = auth.uid()))
  WITH CHECK (summary_id IN (SELECT s.id FROM summaries s JOIN projects p ON s.project_id = p.id WHERE p.user_id = auth.uid()));

-- ============================================================================
-- Migration complete!
-- ============================================================================
