-- Migration: Update audiences to be user-scoped instead of project-scoped
-- This is a breaking change that will drop existing audiences data
-- Audiences are now global to the user and reusable across projects

-- ============================================================================
-- STEP 1: Drop existing audiences table and dependencies
-- ============================================================================

-- Drop policies first
DROP POLICY IF EXISTS "Users can manage audiences in their own projects" ON audiences;

-- Drop the existing audiences table (this will cascade to summaries due to FK)
DROP TABLE IF EXISTS audiences CASCADE;

-- ============================================================================
-- STEP 2: Create new user-scoped audiences table
-- ============================================================================

CREATE TABLE audiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_system_template boolean DEFAULT false,
  system_template_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- STEP 3: Set up RLS for audiences
-- ============================================================================

-- Enable RLS
ALTER TABLE audiences ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON audiences TO authenticated;

-- Create policy
CREATE POLICY "Users can manage their own audiences" ON audiences
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- Migration complete!
-- ============================================================================
