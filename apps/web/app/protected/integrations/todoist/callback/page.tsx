import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';

async function getUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  return data.claims;
}

async function exchangeCodeForToken(code: string) {
  const supabase = await createClient();

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return { error: "No active session" };
  }

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/todoist-oauth-callback`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code })
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return { error: result.error || "Failed to connect Todoist" };
    }

    return { success: true };
  } catch (error) {
    console.error("Error exchanging code:", error);
    return { error: "Failed to connect Todoist" };
  }
}

export default async function TodoistCallbackPage({
  searchParams
}: {
  searchParams: Promise<{ code?: string; error?: string }>
}) {
  await getUser();
  const params = await searchParams;

  // Handle OAuth errors
  if (params.error) {
    redirect("/protected/integrations?error=todoist_denied");
  }

  // Exchange code for token
  if (params.code) {
    const result = await exchangeCodeForToken(params.code);

    if (result.error) {
      redirect(`/protected/integrations?error=${encodeURIComponent(result.error)}`);
    }

    redirect("/protected/integrations?success=todoist_connected");
  }

  // No code or error, redirect to integrations
  redirect("/protected/integrations");
}
