-- Migration: Fix messages RLS policy
-- Ensures users can properly insert/update messages for their own summaries

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can manage messages in their own projects" ON messages;

-- Recreate policy with proper permissions
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
