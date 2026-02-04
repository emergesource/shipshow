"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function generateMessage(summaryId: string, channelId: string) {
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

    // Call the edge function to generate message
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-message`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          summary_id: summaryId,
          channel_id: channelId
        })
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return { error: result.error || "Failed to generate message" };
    }

    // Save the message to database (upsert to handle regeneration)
    const { data: newMessage, error: insertError } = await supabase
      .from("messages")
      .upsert({
        summary_id: summaryId,
        channel_id: channelId,
        text: result.message
      }, {
        onConflict: 'summary_id,channel_id'
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error saving message:", insertError);
      return { error: "Failed to save message" };
    }

    revalidatePath("/protected/summaries");
    revalidatePath(`/protected/summaries/${summaryId}`);
    revalidatePath("/protected");

    return {
      messageId: newMessage.id,
      warning: result.warning
    };
  } catch (error) {
    console.error("Error generating message:", error);
    return { error: "Failed to generate message" };
  }
}

export async function regenerateMessage(messageId: string) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: "Not authenticated" };
  }

  try {
    // Fetch existing message
    const { data: message } = await supabase
      .from("messages")
      .select(`
        id,
        summary_id,
        channel_id,
        summaries!inner(
          id,
          projects!inner(user_id)
        )
      `)
      .eq("id", messageId)
      .single();

    if (!message || message.summaries.projects.user_id !== user.id) {
      return { error: "Message not found" };
    }

    // Regenerate using generateMessage
    return await generateMessage(message.summary_id, message.channel_id);
  } catch (error) {
    console.error("Error regenerating message:", error);
    return { error: "Failed to regenerate message" };
  }
}

export async function deleteMessage(messageId: string) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: "Not authenticated" };
  }

  try {
    // Fetch message to get summary_id for revalidation
    const { data: message } = await supabase
      .from("messages")
      .select(`
        id,
        summary_id,
        summaries!inner(
          id,
          projects!inner(user_id)
        )
      `)
      .eq("id", messageId)
      .single();

    if (!message || message.summaries.projects.user_id !== user.id) {
      return { error: "Message not found" };
    }

    const summaryId = message.summary_id;

    const { error: deleteError } = await supabase
      .from("messages")
      .delete()
      .eq("id", messageId);

    if (deleteError) {
      console.error("Error deleting message:", deleteError);
      return { error: "Failed to delete message" };
    }

    revalidatePath("/protected/summaries");
    revalidatePath(`/protected/summaries/${summaryId}`);
    revalidatePath("/protected");

    return { success: true };
  } catch (error) {
    console.error("Error deleting message:", error);
    return { error: "Failed to delete message" };
  }
}
