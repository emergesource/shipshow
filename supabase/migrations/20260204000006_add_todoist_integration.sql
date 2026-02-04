-- Migration: Add Todoist integration support
-- Allows linking Todoist projects to Shipshow projects for enriched summaries

-- ============================================================================
-- STEP 1: Add todoist_project_id to projects table
-- ============================================================================

ALTER TABLE projects ADD COLUMN IF NOT EXISTS todoist_project_id text;

COMMENT ON COLUMN projects.todoist_project_id IS 'External Todoist project ID for task integration';

-- ============================================================================
-- STEP 2: Ensure oauth_connections supports Todoist
-- ============================================================================

-- oauth_connections table should already exist from GitHub integration
-- Just verify we can store Todoist connections (no schema changes needed)

-- ============================================================================
-- Migration complete!
-- ============================================================================
