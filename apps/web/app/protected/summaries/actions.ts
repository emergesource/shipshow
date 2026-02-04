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
      .select("id, name")
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
          commits: commits || []
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
        repository_branches: repositoryBranches
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
        projects!inner(id, name, user_id)
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
          commits: commits || []
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
