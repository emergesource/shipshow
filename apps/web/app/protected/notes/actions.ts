"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createNote(formData: FormData) {
  const content = formData.get("content") as string;
  const projectId = formData.get("project_id") as string;
  const title = formData.get("title") as string;

  if (!content || content.trim().length === 0) {
    return { error: "Note content is required" };
  }

  if (!projectId) {
    return { error: "Project is required" };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("notes")
    .insert({
      project_id: projectId,
      content: content.trim(),
      title: title?.trim() || null
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating note:", error);
    return { error: "Failed to create note" };
  }

  revalidatePath("/protected/notes");
  revalidatePath("/protected");
  redirect(`/protected/notes/${data.id}`);
}

export async function updateNote(noteId: string, formData: FormData) {
  const content = formData.get("content") as string;
  const projectId = formData.get("project_id") as string;
  const title = formData.get("title") as string;

  if (!content || content.trim().length === 0) {
    return { error: "Note content is required" };
  }

  if (!projectId) {
    return { error: "Project is required" };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("notes")
    .update({
      project_id: projectId,
      content: content.trim(),
      title: title?.trim() || null,
      updated_at: new Date().toISOString()
    })
    .eq("id", noteId);

  if (error) {
    console.error("Error updating note:", error);
    return { error: "Failed to update note" };
  }

  revalidatePath("/protected/notes");
  revalidatePath(`/protected/notes/${noteId}`);
  revalidatePath("/protected");
  return { success: true };
}

export async function deleteNote(noteId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("notes")
    .delete()
    .eq("id", noteId);

  if (error) {
    console.error("Error deleting note:", error);
    return { error: "Failed to delete note" };
  }

  revalidatePath("/protected/notes");
  revalidatePath("/protected");
  redirect("/protected/notes");
}

export async function updateNoteProject(noteId: string, projectId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("notes")
    .update({
      project_id: projectId,
      updated_at: new Date().toISOString()
    })
    .eq("id", noteId);

  if (error) {
    console.error("Error updating note project:", error);
    return { error: "Failed to update note project" };
  }

  revalidatePath("/protected/notes");
  revalidatePath(`/protected/notes/${noteId}`);
  revalidatePath("/protected");
  return { success: true };
}
