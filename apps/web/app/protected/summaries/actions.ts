"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function generateSummary(formData: FormData) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: "Not authenticated" };
  }

  // Fetch user profile with subscription info
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("subscription_plan, subscription_status, summaries_used_this_period, period_start, subscription_current_period_end")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return { error: "Unable to fetch subscription information" };
  }

  // Check if period needs reset
  const now = new Date();
  let periodStart = profile.period_start ? new Date(profile.period_start) : now;

  // Determine if we need to reset the counter
  let needsReset = false;
  if (profile.subscription_status === 'active' && profile.subscription_current_period_end) {
    // For paid users, reset when period ends
    const periodEnd = new Date(profile.subscription_current_period_end);
    needsReset = now > periodEnd;
  } else {
    // For free users, reset on 1st of month
    const currentMonth = now.getMonth();
    const periodMonth = periodStart.getMonth();
    needsReset = currentMonth !== periodMonth || now.getFullYear() !== periodStart.getFullYear();
  }

  // Reset counter if needed
  let currentUsage = profile.summaries_used_this_period || 0;
  if (needsReset) {
    currentUsage = 0;
    periodStart = now;
    await supabase
      .from("profiles")
      .update({
        summaries_used_this_period: 0,
        period_start: now.toISOString()
      })
      .eq("id", user.id);
  }

  // Check usage limit
  const TIER_LIMITS: Record<string, number> = {
    free: 5,
    individual: 30
  };
  const limit = TIER_LIMITS[profile.subscription_plan] || TIER_LIMITS.free;

  if (currentUsage >= limit) {
    return {
      error: `You've reached your limit of ${limit} summaries this ${profile.subscription_status === 'active' ? 'billing period' : 'month'}. ${profile.subscription_status !== 'active' ? 'Upgrade to Individual plan for 30 summaries/month.' : 'Your limit will reset on ' + new Date(profile.subscription_current_period_end!).toLocaleDateString()}`
    };
  }

  try {
    const projectId = formData.get("project_id") as string;
    const audienceId = formData.get("audience_id") as string;
    const periodStart = formData.get("period_start") as string;
    const periodEnd = formData.get("period_end") as string;
    const repositoryBranchesStr = formData.get("repository_branches") as string;

    if (!projectId || !audienceId || !periodStart || !periodEnd) {
      return { error: "Missing required fields" };
    }

    // Parse repository branches
    let repositoryBranches: Record<string, string> = {};
    if (repositoryBranchesStr) {
      try {
        repositoryBranches = JSON.parse(repositoryBranchesStr);
      } catch (e) {
        console.error("Failed to parse repository_branches:", e);
      }
    }

    // Fetch project details
    const { data: project } = await supabase
      .from("projects")
      .select("id, name, todoist_project_id")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single();

    if (!project) {
      return { error: "Project not found" };
    }

    // Fetch audience details
    const { data: audience } = await supabase
      .from("audiences")
      .select("id, name, description")
      .eq("id", audienceId)
      .eq("user_id", user.id)
      .single();

    if (!audience) {
      return { error: "Audience not found" };
    }

    // Fetch notes in time period
    const { data: notes } = await supabase
      .from("notes")
      .select("id, content, created_at")
      .eq("project_id", projectId)
      .gte("created_at", periodStart)
      .lte("created_at", periodEnd)
      .order("created_at", { ascending: true });

    // Fetch commits in time period (from project repositories)
    const { data: projectRepos } = await supabase
      .from("project_repositories")
      .select("repository_id")
      .eq("project_id", projectId);

    const repoIds = projectRepos?.map(pr => pr.repository_id) || [];

    let commits: Array<{ id: string; sha: string; message: string; author: string; committed_at: string }> = [];
    if (repoIds.length > 0) {
      const { data: commitsData } = await supabase
        .from("commits")
        .select("id, sha, message, author, committed_at")
        .in("repository_id", repoIds)
        .gte("committed_at", periodStart)
        .lte("committed_at", periodEnd)
        .order("committed_at", { ascending: true });

      commits = commitsData || [];
    }

    // Fetch Todoist tasks if project has todoist_project_id
    let todoistTasks: { addedOrUpdated: any[]; completed: any[] } = { addedOrUpdated: [], completed: [] };
    if (project.todoist_project_id) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const todoistResponse = await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/todoist-fetch-data`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                type: 'tasks',
                project_id: project.todoist_project_id,
                since: periodStart,
                until: periodEnd
              })
            }
          );

          if (todoistResponse.ok) {
            const todoistResult = await todoistResponse.json();
            todoistTasks = {
              addedOrUpdated: todoistResult.tasks_added_or_updated || [],
              completed: todoistResult.tasks_completed || []
            };
          }
        }
      } catch (error) {
        console.error("Error fetching Todoist tasks:", error);
        // Continue without Todoist tasks
      }
    }

    // Call edge function to generate summary
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { error: "No active session" };
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-summary`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          project_id: projectId,
          project_name: project.name,
          audience_id: audienceId,
          audience_name: audience.name,
          audience_description: audience.description,
          period_start: periodStart,
          period_end: periodEnd,
          notes: notes || [],
          commits: commits || [],
          todoist_tasks: todoistTasks
        })
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return { error: result.error || "Failed to generate summary" };
    }

    // Save the summary to database
    const { data: newSummary, error: insertError } = await supabase
      .from("summaries")
      .insert({
        project_id: projectId,
        audience_id: audienceId,
        text: result.summary,
        period_start: periodStart,
        period_end: periodEnd,
        repository_branches: repositoryBranches,
        todoist_tasks_active_count: todoistTasks.addedOrUpdated.length,
        todoist_tasks_completed_count: todoistTasks.completed.length
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error saving summary:", insertError);
      return { error: "Failed to save summary" };
    }

    // Link notes to summary
    if (notes && notes.length > 0) {
      const noteLinks = notes.map(note => ({
        summary_id: newSummary.id,
        note_id: note.id
      }));

      await supabase.from("summary_notes").insert(noteLinks);
    }

    // Link commits to summary
    if (commits && commits.length > 0) {
      const commitLinks = commits.map(commit => ({
        summary_id: newSummary.id,
        commit_id: commit.id
      }));

      await supabase.from("summary_commits").insert(commitLinks);
    }

    // Increment usage counter
    await supabase
      .from("profiles")
      .update({
        summaries_used_this_period: currentUsage + 1
      })
      .eq("id", user.id);

    revalidatePath("/protected/summaries");
    revalidatePath(`/protected/projects/${projectId}`);

    return { summaryId: newSummary.id };
  } catch (error) {
    console.error("Error generating summary:", error);
    return { error: "Failed to generate summary" };
  }
}

export async function regenerateSummary(summaryId: string) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: "Not authenticated" };
  }

  // Fetch user profile with subscription info
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("subscription_plan, subscription_status, summaries_used_this_period, period_start, subscription_current_period_end")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return { error: "Unable to fetch subscription information" };
  }

  // Check if period needs reset
  const now = new Date();
  let periodStart = profile.period_start ? new Date(profile.period_start) : now;

  // Determine if we need to reset the counter
  let needsReset = false;
  if (profile.subscription_status === 'active' && profile.subscription_current_period_end) {
    // For paid users, reset when period ends
    const periodEnd = new Date(profile.subscription_current_period_end);
    needsReset = now > periodEnd;
  } else {
    // For free users, reset on 1st of month
    const currentMonth = now.getMonth();
    const periodMonth = periodStart.getMonth();
    needsReset = currentMonth !== periodMonth || now.getFullYear() !== periodStart.getFullYear();
  }

  // Reset counter if needed
  let currentUsage = profile.summaries_used_this_period || 0;
  if (needsReset) {
    currentUsage = 0;
    periodStart = now;
    await supabase
      .from("profiles")
      .update({
        summaries_used_this_period: 0,
        period_start: now.toISOString()
      })
      .eq("id", user.id);
  }

  // Check usage limit
  const TIER_LIMITS: Record<string, number> = {
    free: 5,
    individual: 30
  };
  const limit = TIER_LIMITS[profile.subscription_plan] || TIER_LIMITS.free;

  if (currentUsage >= limit) {
    return {
      error: `You've reached your limit of ${limit} summaries this ${profile.subscription_status === 'active' ? 'billing period' : 'month'}. ${profile.subscription_status !== 'active' ? 'Upgrade to Individual plan for 30 summaries/month.' : 'Your limit will reset on ' + new Date(profile.subscription_current_period_end!).toLocaleDateString()}`
    };
  }

  try {
    // Fetch existing summary
    const { data: summary } = await supabase
      .from("summaries")
      .select(`
        id,
        project_id,
        audience_id,
        period_start,
        period_end,
        projects!inner(id, name, user_id, todoist_project_id)
      `)
      .eq("id", summaryId)
      .single();

    if (!summary || summary.projects.user_id !== user.id) {
      return { error: "Summary not found" };
    }

    // Fetch audience
    const { data: audience } = await supabase
      .from("audiences")
      .select("id, name, description")
      .eq("id", summary.audience_id)
      .single();

    if (!audience) {
      return { error: "Audience not found" };
    }

    // Fetch notes in time period
    const { data: notes } = await supabase
      .from("notes")
      .select("id, content, created_at")
      .eq("project_id", summary.project_id)
      .gte("created_at", summary.period_start)
      .lte("created_at", summary.period_end)
      .order("created_at", { ascending: true });

    // Fetch commits
    const { data: projectRepos } = await supabase
      .from("project_repositories")
      .select("repository_id")
      .eq("project_id", summary.project_id);

    const repoIds = projectRepos?.map(pr => pr.repository_id) || [];

    let commits: Array<{ id: string; sha: string; message: string; author: string; committed_at: string }> = [];
    if (repoIds.length > 0) {
      const { data: commitsData } = await supabase
        .from("commits")
        .select("id, sha, message, author, committed_at")
        .in("repository_id", repoIds)
        .gte("committed_at", summary.period_start)
        .lte("committed_at", summary.period_end)
        .order("committed_at", { ascending: true });

      commits = commitsData || [];
    }

    // Fetch Todoist tasks if project has todoist_project_id
    let todoistTasks: { addedOrUpdated: any[]; completed: any[] } = { addedOrUpdated: [], completed: [] };
    if (summary.projects.todoist_project_id) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const todoistResponse = await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/todoist-fetch-data`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                type: 'tasks',
                project_id: summary.projects.todoist_project_id,
                since: summary.period_start,
                until: summary.period_end
              })
            }
          );

          if (todoistResponse.ok) {
            const todoistResult = await todoistResponse.json();
            todoistTasks = {
              addedOrUpdated: todoistResult.tasks_added_or_updated || [],
              completed: todoistResult.tasks_completed || []
            };
          }
        }
      } catch (error) {
        console.error("Error fetching Todoist tasks:", error);
        // Continue without Todoist tasks
      }
    }

    // Call edge function
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { error: "No active session" };
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-summary`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          project_id: summary.project_id,
          project_name: summary.projects.name,
          audience_id: audience.id,
          audience_name: audience.name,
          audience_description: audience.description,
          period_start: summary.period_start,
          period_end: summary.period_end,
          notes: notes || [],
          commits: commits || [],
          todoist_tasks: todoistTasks
        })
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return { error: result.error || "Failed to regenerate summary" };
    }

    // Update the summary
    const { error: updateError } = await supabase
      .from("summaries")
      .update({
        text: result.summary,
        todoist_tasks_active_count: todoistTasks.addedOrUpdated.length,
        todoist_tasks_completed_count: todoistTasks.completed.length,
        updated_at: new Date().toISOString()
      })
      .eq("id", summaryId);

    if (updateError) {
      console.error("Error updating summary:", updateError);
      return { error: "Failed to update summary" };
    }

    // Increment usage counter
    await supabase
      .from("profiles")
      .update({
        summaries_used_this_period: currentUsage + 1
      })
      .eq("id", user.id);

    revalidatePath("/protected/summaries");
    revalidatePath(`/protected/summaries/${summaryId}`);
    revalidatePath(`/protected/projects/${summary.project_id}`);

    return { success: true };
  } catch (error) {
    console.error("Error regenerating summary:", error);
    return { error: "Failed to regenerate summary" };
  }
}

export async function updateSummary(summaryId: string, formData: FormData) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: "Not authenticated" };
  }

  try {
    const text = formData.get("text") as string;

    if (!text) {
      return { error: "Summary text is required" };
    }

    // Verify ownership via project
    const { data: summary } = await supabase
      .from("summaries")
      .select("project_id, projects!inner(user_id)")
      .eq("id", summaryId)
      .single();

    if (!summary || summary.projects.user_id !== user.id) {
      return { error: "Summary not found" };
    }

    const { error: updateError } = await supabase
      .from("summaries")
      .update({
        text,
        updated_at: new Date().toISOString()
      })
      .eq("id", summaryId);

    if (updateError) {
      console.error("Error updating summary:", updateError);
      return { error: "Failed to update summary" };
    }

    revalidatePath("/protected/summaries");
    revalidatePath(`/protected/summaries/${summaryId}`);
    revalidatePath(`/protected/projects/${summary.project_id}`);

    return { success: true };
  } catch (error) {
    console.error("Error updating summary:", error);
    return { error: "Failed to update summary" };
  }
}

export async function deleteSummary(summaryId: string) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: "Not authenticated" };
  }

  try {
    // Verify ownership via project
    const { data: summary } = await supabase
      .from("summaries")
      .select("project_id, projects!inner(user_id)")
      .eq("id", summaryId)
      .single();

    if (!summary || summary.projects.user_id !== user.id) {
      return { error: "Summary not found" };
    }

    const { error: deleteError } = await supabase
      .from("summaries")
      .delete()
      .eq("id", summaryId);

    if (deleteError) {
      console.error("Error deleting summary:", deleteError);
      return { error: "Failed to delete summary" };
    }

    revalidatePath("/protected/summaries");
    revalidatePath(`/protected/projects/${summary.project_id}`);
  } catch (error) {
    console.error("Error deleting summary:", error);
    return { error: "Failed to delete summary" };
  }

  redirect("/protected/summaries");
}
