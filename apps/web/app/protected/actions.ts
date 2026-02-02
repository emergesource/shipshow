"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function ensureDefaultProject() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Check if user has any projects
  const { data: existingProjects } = await supabase
    .from("projects")
    .select("id")
    .eq("user_id", user.id)
    .limit(1);

  if (existingProjects && existingProjects.length > 0) {
    return existingProjects[0].id;
  }

  // Create default project
  const { data: newProject, error } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      name: "My Work",
      description: "Default project for tracking your work"
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error creating default project:", error);
    return null;
  }

  return newProject.id;
}

export async function createQuickNote(formData: FormData) {
  const content = formData.get("content") as string;
  let projectId = formData.get("project_id") as string;

  if (!content || content.trim().length === 0) {
    return { error: "Note content cannot be empty" };
  }

  const supabase = await createClient();

  // If no project specified via hashtag, use default project
  if (!projectId) {
    projectId = await ensureDefaultProject();
  }

  if (!projectId) {
    return { error: "Failed to create or find project" };
  }

  const { error } = await supabase
    .from("notes")
    .insert({
      project_id: projectId,
      content: content.trim(),
      title: null
    });

  if (error) {
    console.error("Error creating note:", error);
    return { error: "Failed to create note" };
  }

  revalidatePath("/protected");
  return { success: true };
}
