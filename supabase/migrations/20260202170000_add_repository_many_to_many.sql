-- Migration: Add many-to-many relationship for repositories and GitHub OAuth support
-- This migration safely transforms the repositories table and creates new tables

-- ============================================================================
-- STEP 1: Create new tables
-- ============================================================================

-- Junction table for many-to-many relationship between projects and repositories
CREATE TABLE IF NOT EXISTS project_repositories (
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  repository_id uuid NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (project_id, repository_id)
);

-- OAuth connections table for secure token storage
CREATE TABLE IF NOT EXISTS oauth_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  provider_user_id text,
  access_token text NOT NULL,
  refresh_token text,
  expires_at timestamptz,
  scope text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, provider)
);

-- ============================================================================
-- STEP 2: Migrate existing repository-project relationships
-- ============================================================================

-- Copy existing relationships to junction table (only if project_id column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'repositories' AND column_name = 'project_id'
  ) THEN
    INSERT INTO project_repositories (project_id, repository_id, created_at)
    SELECT project_id, id, created_at
    FROM repositories
    WHERE project_id IS NOT NULL
    ON CONFLICT (project_id, repository_id) DO NOTHING;
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Add new columns to repositories table
-- ============================================================================

-- Add user_id column (nullable at first, we'll populate it then make it NOT NULL)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'repositories' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE repositories ADD COLUMN user_id uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Add GitHub-specific columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'repositories' AND column_name = 'github_repo_id'
  ) THEN
    ALTER TABLE repositories ADD COLUMN github_repo_id bigint UNIQUE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'repositories' AND column_name = 'owner'
  ) THEN
    ALTER TABLE repositories ADD COLUMN owner text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'repositories' AND column_name = 'name'
  ) THEN
    ALTER TABLE repositories ADD COLUMN name text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'repositories' AND column_name = 'full_name'
  ) THEN
    ALTER TABLE repositories ADD COLUMN full_name text;
  END IF;
END $$;

-- ============================================================================
-- STEP 4: Populate user_id from existing project relationships
-- ============================================================================

-- Set user_id based on project ownership (only if project_id column still exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'repositories' AND column_name = 'project_id'
  ) THEN
    UPDATE repositories r
    SET user_id = p.user_id
    FROM projects p
    WHERE r.project_id = p.id AND r.user_id IS NULL;
  END IF;
END $$;

-- Make user_id NOT NULL (all repos should have a user now)
ALTER TABLE repositories ALTER COLUMN user_id SET NOT NULL;

-- Make repo_url nullable (GitHub OAuth repos will have it, but initially might not)
ALTER TABLE repositories ALTER COLUMN repo_url DROP NOT NULL;

-- ============================================================================
-- STEP 5: Drop old RLS policies that depend on project_id
-- ============================================================================

-- IMPORTANT: Drop policies BEFORE dropping the column they reference
DROP POLICY IF EXISTS "Users can manage repositories in their own projects" ON repositories;
DROP POLICY IF EXISTS "Users can manage commits in their own projects" ON commits;

-- ============================================================================
-- STEP 6: Drop old project_id column
-- ============================================================================

-- Drop the old foreign key constraint and column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'repositories' AND column_name = 'project_id'
  ) THEN
    -- Drop foreign key constraint first
    ALTER TABLE repositories DROP CONSTRAINT IF EXISTS repositories_project_id_fkey;

    -- Drop the column
    ALTER TABLE repositories DROP COLUMN project_id;
  END IF;
END $$;

-- ============================================================================
-- STEP 7: Add unique constraint to commits.sha for deduplication
-- ============================================================================

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'commits_sha_key'
  ) THEN
    ALTER TABLE commits ADD CONSTRAINT commits_sha_key UNIQUE (sha);
  END IF;
END $$;

-- ============================================================================
-- STEP 8: Create new RLS policies for repositories
-- ============================================================================

-- Create new policy based on user_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'repositories'
    AND policyname = 'Users can manage their own repositories'
  ) THEN
    CREATE POLICY "Users can manage their own repositories" ON repositories
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================================
-- STEP 9: Create new RLS policies for commits
-- ============================================================================

-- Create new policy based on repository ownership
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'commits'
    AND policyname = 'Users can manage commits in their repositories'
  ) THEN
    CREATE POLICY "Users can manage commits in their repositories" ON commits
      FOR ALL
      USING (repository_id IN (SELECT id FROM repositories WHERE user_id = auth.uid()))
      WITH CHECK (repository_id IN (SELECT id FROM repositories WHERE user_id = auth.uid()));
  END IF;
END $$;

-- ============================================================================
-- STEP 10: Set up RLS for new tables
-- ============================================================================

-- Enable RLS on project_repositories
ALTER TABLE project_repositories ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT SELECT, INSERT, DELETE ON project_repositories TO authenticated;

-- Create policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'project_repositories'
    AND policyname = 'Users can manage project repositories in their own projects'
  ) THEN
    CREATE POLICY "Users can manage project repositories in their own projects"
    ON project_repositories FOR ALL
    USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()))
    WITH CHECK (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));
  END IF;
END $$;

-- Enable RLS on oauth_connections
ALTER TABLE oauth_connections ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON oauth_connections TO authenticated;

-- Create policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'oauth_connections'
    AND policyname = 'Users can manage their own OAuth connections'
  ) THEN
    CREATE POLICY "Users can manage their own OAuth connections"
    ON oauth_connections FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================================
-- Migration complete!
-- ============================================================================
