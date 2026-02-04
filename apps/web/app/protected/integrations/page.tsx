import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { GitBranch, CheckCircle2, ListTodo } from "lucide-react";

export const dynamic = 'force-dynamic';

async function getUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  return data.claims;
}

async function getConnections() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { github: false, todoist: false };

  // Check GitHub connection
  const { data: githubConnection } = await supabase
    .from("oauth_connections")
    .select("id")
    .eq("user_id", user.id)
    .eq("provider", "github")
    .single();

  // Check Todoist connection
  const { data: todoistConnection } = await supabase
    .from("oauth_connections")
    .select("id")
    .eq("user_id", user.id)
    .eq("provider", "todoist")
    .single();

  return {
    github: !!githubConnection,
    todoist: !!todoistConnection
  };
}

export default async function IntegrationsPage() {
  const user = await getUser();
  const connections = await getConnections();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="font-mono text-4xl font-bold">Integrations</h1>
        <p className="text-xl text-muted-foreground">
          Connect external services to enrich your summaries
        </p>
      </div>

      {/* Integrations Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* GitHub */}
        <Card className="p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div className="p-3 bg-primary/10 rounded-lg">
              <GitBranch className="h-6 w-6 text-primary" />
            </div>
            {connections.github && (
              <div className="flex items-center gap-2 text-sm text-primary">
                <CheckCircle2 className="h-4 w-4" />
                Connected
              </div>
            )}
          </div>
          <div className="space-y-2">
            <h3 className="font-mono font-semibold text-lg">GitHub</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Link your GitHub repositories to include commit history in your summaries.
              Commits serve as proof of work alongside your notes.
            </p>
          </div>
          <Link href="/protected/repositories/connect">
            <Button variant={connections.github ? "outline" : "default"} className="w-full">
              {connections.github ? "Manage Repositories" : "Connect GitHub"}
            </Button>
          </Link>
        </Card>

        {/* Todoist */}
        <Card className="p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div className="p-3 bg-primary/10 rounded-lg">
              <ListTodo className="h-6 w-6 text-primary" />
            </div>
            {connections.todoist && (
              <div className="flex items-center gap-2 text-sm text-primary">
                <CheckCircle2 className="h-4 w-4" />
                Connected
              </div>
            )}
          </div>
          <div className="space-y-2">
            <h3 className="font-mono font-semibold text-lg">Todoist</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Connect Todoist to include completed tasks and upcoming work in your summaries.
              Adds planning context and task completion data.
            </p>
          </div>
          <Link href="/protected/integrations/todoist/connect">
            <Button variant={connections.todoist ? "outline" : "default"} className="w-full">
              {connections.todoist ? "Reconnect" : "Connect Todoist"}
            </Button>
          </Link>
        </Card>
      </div>
    </div>
  );
}
