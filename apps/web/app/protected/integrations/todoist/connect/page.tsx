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

export default async function TodoistConnectPage() {
  await getUser();

  // Build Todoist OAuth URL
  const clientId = process.env.NEXT_PUBLIC_TODOIST_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redirectUri = `${appUrl}/protected/integrations/todoist/callback`;
  const scope = "data:read";
  const state = Math.random().toString(36).substring(7);

  const authUrl = `https://todoist.com/oauth/authorize?client_id=${clientId}&scope=${scope}&state=${state}&redirect_uri=${encodeURIComponent(redirectUri)}`;

  // Redirect to Todoist OAuth
  redirect(authUrl);
}
