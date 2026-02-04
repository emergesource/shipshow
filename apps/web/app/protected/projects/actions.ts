"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createProject(formData: FormData) {
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;

  if (!name || name.trim().length === 0) {
    return { error: "Project name is required" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      name: name.trim(),
      description: description?.trim() || null
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating project:", error);
    return { error: "Failed to create project" };
  }

  revalidatePath("/protected/projects");
  redirect(`/protected/projects/${data.id}`);
}

export async function updateProject(projectId: string, formData: FormData) {
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const todoistProjectId = formData.get("todoist_project_id") as string;

  if (!name || name.trim().length === 0) {
    return { error: "Project name is required" };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("projects")
    .update({
      name: name.trim(),
      description: description?.trim() || null,
      todoist_project_id: todoistProjectId || null,
      updated_at: new Date().toISOString()
    })
    .eq("id", projectId);

  if (error) {
    console.error("Error updating project:", error);
    return { error: "Failed to update project" };
  }

  revalidatePath("/protected/projects");
  revalidatePath(`/protected/projects/${projectId}`);
  return { success: true };
}

export async function deleteProject(projectId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId);

  if (error) {
    console.error("Error deleting project:", error);
    return { error: "Failed to delete project" };
  }

  revalidatePath("/protected/projects");
  redirect("/protected/projects");
}
