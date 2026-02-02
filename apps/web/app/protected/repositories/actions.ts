"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addGitHubRepositories(formData: FormData) {
  const supabase = await createClient();

  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: "Not authenticated" };
  }

  try {
    // Parse selected repositories and projects
    const selectedRepos = JSON.parse(formData.get("selected_repos") as string);
    const projectIds = formData.getAll("project_ids") as string[];

    if (selectedRepos.length === 0) {
      return { error: "No repositories selected" };
    }

    if (projectIds.length === 0) {
      return { error: "At least one project must be selected" };
    }

    // Insert repositories
    for (const repo of selectedRepos) {
      // Check if repository already exists
      const { data: existing } = await supabase
        .from("repositories")
        .select("id")
        .eq("github_repo_id", repo.id)
        .eq("user_id", user.id)
        .single();

      let repositoryId: string;

      if (existing) {
        // Repository already exists, use its ID
        repositoryId = existing.id;
      } else {
        // Insert new repository
        const { data: newRepo, error: insertError } = await supabase
          .from("repositories")
          .insert({
            user_id: user.id,
            provider: "github",
            github_repo_id: repo.id,
            owner: repo.owner.login,
            name: repo.name,
            full_name: repo.full_name,
            repo_url: repo.html_url,
            default_branch: repo.default_branch || "main"
          })
          .select("id")
          .single();

        if (insertError) {
          console.error("Error inserting repository:", insertError);
          return { error: `Failed to add repository: ${repo.name}` };
        }

        repositoryId = newRepo.id;
      }

      // Link repository to selected projects
      const projectLinks = projectIds.map(projectId => ({
        repository_id: repositoryId,
        project_id: projectId
      }));

      const { error: linkError } = await supabase
        .from("project_repositories")
        .upsert(projectLinks, {
          onConflict: "project_id,repository_id",
          ignoreDuplicates: true
        });

      if (linkError) {
        console.error("Error linking repository to projects:", linkError);
        // Continue with other repos even if one fails
      }
    }

    revalidatePath("/protected/repositories");
    revalidatePath("/protected/projects");
  } catch (error) {
    console.error("Error adding GitHub repositories:", error);
    return { error: "Failed to add repositories" };
  }

  redirect("/protected/repositories");
}

export async function updateRepository(repoId: string, formData: FormData) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: "Not authenticated" };
  }

  try {
    const defaultBranch = formData.get("default_branch") as string;
    const projectIds = formData.getAll("project_ids") as string[];

    // Update repository settings
    const { error: updateError } = await supabase
      .from("repositories")
      .update({
        default_branch: defaultBranch,
        updated_at: new Date().toISOString()
      })
      .eq("id", repoId)
      .eq("user_id", user.id);

    if (updateError) {
      return { error: "Failed to update repository" };
    }

    // Update project associations
    // First, remove all existing links
    await supabase
      .from("project_repositories")
      .delete()
      .eq("repository_id", repoId);

    // Then add new links
    if (projectIds.length > 0) {
      const links = projectIds.map(projectId => ({
        repository_id: repoId,
        project_id: projectId
      }));

      const { error: linkError } = await supabase
        .from("project_repositories")
        .insert(links);

      if (linkError) {
        return { error: "Failed to update project links" };
      }
    }

    revalidatePath("/protected/repositories");
    revalidatePath(`/protected/repositories/${repoId}`);
    revalidatePath("/protected/projects");

    return { success: true };
  } catch (error) {
    console.error("Error updating repository:", error);
    return { error: "Failed to update repository" };
  }
}

export async function deleteRepository(repoId: string) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: "Not authenticated" };
  }

  try {
    const { error: deleteError } = await supabase
      .from("repositories")
      .delete()
      .eq("id", repoId)
      .eq("user_id", user.id);

    if (deleteError) {
      return { error: "Failed to delete repository" };
    }

    revalidatePath("/protected/repositories");
    revalidatePath("/protected/projects");
  } catch (error) {
    console.error("Error deleting repository:", error);
    return { error: "Failed to delete repository" };
  }

  redirect("/protected/repositories");
}

export async function linkRepositoryToProject(repoId: string, projectId: string) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: "Not authenticated" };
  }

  try {
    // Verify user owns both the repository and project
    const { data: repo } = await supabase
      .from("repositories")
      .select("id")
      .eq("id", repoId)
      .eq("user_id", user.id)
      .single();

    const { data: project } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single();

    if (!repo || !project) {
      return { error: "Repository or project not found" };
    }

    const { error: linkError } = await supabase
      .from("project_repositories")
      .insert({
        repository_id: repoId,
        project_id: projectId
      });

    if (linkError) {
      // Ignore duplicate errors
      if (!linkError.message.includes("duplicate")) {
        return { error: "Failed to link repository to project" };
      }
    }

    revalidatePath("/protected/repositories");
    revalidatePath(`/protected/repositories/${repoId}`);
    revalidatePath("/protected/projects");
    revalidatePath(`/protected/projects/${projectId}`);

    return { success: true };
  } catch (error) {
    console.error("Error linking repository to project:", error);
    return { error: "Failed to link repository" };
  }
}

export async function unlinkRepositoryFromProject(repoId: string, projectId: string) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: "Not authenticated" };
  }

  try {
    const { error: unlinkError } = await supabase
      .from("project_repositories")
      .delete()
      .eq("repository_id", repoId)
      .eq("project_id", projectId);

    if (unlinkError) {
      return { error: "Failed to unlink repository from project" };
    }

    revalidatePath("/protected/repositories");
    revalidatePath(`/protected/repositories/${repoId}`);
    revalidatePath("/protected/projects");
    revalidatePath(`/protected/projects/${projectId}`);

    return { success: true };
  } catch (error) {
    console.error("Error unlinking repository from project:", error);
    return { error: "Failed to unlink repository" };
  }
}

export async function fetchCommitsAction(repoId: string) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: "Not authenticated" };
  }

  try {
    // Get the auth token for API calls
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { error: "No active session" };
    }

    // Call the edge function to fetch commits
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/github-fetch-commits`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          repository_id: repoId
        })
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return { error: result.error || "Failed to fetch commits" };
    }

    revalidatePath("/protected/repositories");
    revalidatePath(`/protected/repositories/${repoId}`);
    revalidatePath("/protected/projects");

    return { success: true, count: result.count };
  } catch (error) {
    console.error("Error fetching commits:", error);
    return { error: "Failed to fetch commits from GitHub" };
  }
}

export async function checkGitHubConnection() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { connected: false };
  }

  const { data: connection } = await supabase
    .from("oauth_connections")
    .select("id")
    .eq("user_id", user.id)
    .eq("provider", "github")
    .single();

  return { connected: !!connection };
}

export async function fetchGitHubRepos() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: "Not authenticated" };
  }

  try {
    // Get the auth token for API calls
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { error: "No active session" };
    }

    // Call the edge function to fetch repos
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/github-fetch-repos`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return { error: result.error || "Failed to fetch repositories" };
    }

    return { repos: result.repos };
  } catch (error) {
    console.error("Error fetching GitHub repos:", error);
    return { error: "Failed to fetch repositories from GitHub" };
  }
}
