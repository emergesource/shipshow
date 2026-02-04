"use server";

import { createClient } from "@/lib/supabase/server";

export async function fetchTodoistProjects() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: "Not authenticated" };
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { error: "No active session" };
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/todoist-fetch-data`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ type: 'projects' })
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return { error: result.error || "Failed to fetch Todoist projects" };
    }

    return { projects: result.projects };
  } catch (error) {
    console.error("Error fetching Todoist projects:", error);
    return { error: "Failed to fetch Todoist projects" };
  }
}

export async function fetchTodoistTasks(projectId: string, since: string, until: string) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: "Not authenticated" };
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { error: "No active session" };
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/todoist-fetch-data`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'tasks',
          project_id: projectId,
          since,
          until
        })
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return { error: result.error || "Failed to fetch Todoist tasks" };
    }

    return {
      activeTasks: result.active_tasks || [],
      completedTasks: result.completed_tasks || []
    };
  } catch (error) {
    console.error("Error fetching Todoist tasks:", error);
    return { error: "Failed to fetch Todoist tasks" };
  }
}
