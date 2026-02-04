-- Add Todoist task counts to summaries table
ALTER TABLE summaries ADD COLUMN IF NOT EXISTS todoist_tasks_active_count integer DEFAULT 0;
ALTER TABLE summaries ADD COLUMN IF NOT EXISTS todoist_tasks_completed_count integer DEFAULT 0;

COMMENT ON COLUMN summaries.todoist_tasks_active_count IS 'Count of active/upcoming Todoist tasks added or updated during the summary period';
COMMENT ON COLUMN summaries.todoist_tasks_completed_count IS 'Count of Todoist tasks completed during the summary period';
