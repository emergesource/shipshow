"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { SYSTEM_AUDIENCE_TEMPLATES } from "@/lib/audiences";

export async function createAudience(formData: FormData) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: "Not authenticated" };
  }

  try {
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;

    if (!name) {
      return { error: "Name is required" };
    }

    const { error: insertError } = await supabase
      .from("audiences")
      .insert({
        user_id: user.id,
        name,
        description,
        is_system_template: false
      });

    if (insertError) {
      console.error("Error creating audience:", insertError);
      return { error: "Failed to create audience" };
    }

    revalidatePath("/protected/audiences");
  } catch (error) {
    console.error("Error creating audience:", error);
    return { error: "Failed to create audience" };
  }

  redirect("/protected/audiences");
}

export async function updateAudience(audienceId: string, formData: FormData) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: "Not authenticated" };
  }

  try {
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;

    if (!name) {
      return { error: "Name is required" };
    }

    const { error: updateError } = await supabase
      .from("audiences")
      .update({
        name,
        description,
        updated_at: new Date().toISOString()
      })
      .eq("id", audienceId)
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Error updating audience:", updateError);
      return { error: "Failed to update audience" };
    }

    revalidatePath("/protected/audiences");
    revalidatePath(`/protected/audiences/${audienceId}`);

    return { success: true };
  } catch (error) {
    console.error("Error updating audience:", error);
    return { error: "Failed to update audience" };
  }
}

export async function deleteAudience(audienceId: string) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: "Not authenticated" };
  }

  try {
    const { error: deleteError } = await supabase
      .from("audiences")
      .delete()
      .eq("id", audienceId)
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("Error deleting audience:", deleteError);
      return { error: "Failed to delete audience" };
    }

    revalidatePath("/protected/audiences");
  } catch (error) {
    console.error("Error deleting audience:", error);
    return { error: "Failed to delete audience" };
  }

  redirect("/protected/audiences");
}

export async function addSystemAudience(templateId: string) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: "Not authenticated" };
  }

  try {
    // Find the template
    const template = SYSTEM_AUDIENCE_TEMPLATES.find(t => t.id === templateId);
    if (!template) {
      return { error: "Invalid template" };
    }

    // Check if user already has this template
    const { data: existing } = await supabase
      .from("audiences")
      .select("id")
      .eq("user_id", user.id)
      .eq("system_template_id", templateId)
      .single();

    if (existing) {
      return { error: "You already have this audience" };
    }

    // Insert the audience
    const { error: insertError } = await supabase
      .from("audiences")
      .insert({
        user_id: user.id,
        name: template.name,
        description: template.description,
        is_system_template: true,
        system_template_id: templateId
      });

    if (insertError) {
      console.error("Error adding system audience:", insertError);
      return { error: "Failed to add audience" };
    }

    revalidatePath("/protected/audiences");
    return { success: true };
  } catch (error) {
    console.error("Error adding system audience:", error);
    return { error: "Failed to add audience" };
  }
}
