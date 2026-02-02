import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  FolderGit2,
  FileText,
  GitBranch,
  Sparkles,
  Send,
  ArrowRight,
  Plus
} from "lucide-react";
import Link from "next/link";

async function getUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  return data.claims;
}

export default async function DashboardPage() {
  const user = await getUser();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="font-mono text-4xl font-bold">Dashboard</h1>
        <p className="text-xl text-muted-foreground">
          Ready to show your work
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Projects */}
        <Card className="p-6 space-y-4 hover:border-primary/50 transition-colors">
          <div className="flex items-start justify-between">
            <div className="p-3 bg-primary/10 rounded-lg">
              <FolderGit2 className="h-6 w-6 text-primary" />
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="font-mono font-semibold text-xl">Projects</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Create projects to organize your work. Each project tracks notes and repositories.
            </p>
          </div>
          <Link href="/protected/projects">
            <Button className="w-full gap-2">
              <Plus className="h-4 w-4" />
              New Project
            </Button>
          </Link>
        </Card>

        {/* Notes */}
        <Card className="p-6 space-y-4 hover:border-primary/50 transition-colors">
          <div className="flex items-start justify-between">
            <div className="p-3 bg-primary/10 rounded-lg">
              <FileText className="h-6 w-6 text-primary" />
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="font-mono font-semibold text-xl">Notes</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Capture context, wins, and blockers. No titles required. Just write what matters.
            </p>
          </div>
          <Link href="/protected/notes">
            <Button className="w-full gap-2">
              <Plus className="h-4 w-4" />
              Add Note
            </Button>
          </Link>
        </Card>

        {/* Repositories */}
        <Card className="p-6 space-y-4 hover:border-primary/50 transition-colors">
          <div className="flex items-start justify-between">
            <div className="p-3 bg-primary/10 rounded-lg">
              <GitBranch className="h-6 w-6 text-primary" />
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="font-mono font-semibold text-xl">Repositories</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Link your git repositories. Your commits become evidence of progress.
            </p>
          </div>
          <Link href="/protected/repositories">
            <Button className="w-full gap-2">
              <Plus className="h-4 w-4" />
              Connect Repo
            </Button>
          </Link>
        </Card>

        {/* Summaries */}
        <Card className="p-6 space-y-4 hover:border-primary/50 transition-colors">
          <div className="flex items-start justify-between">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="font-mono font-semibold text-xl">Summaries</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Generate AI summaries from your notes and commits for specific audiences.
            </p>
          </div>
          <Link href="/protected/summaries">
            <Button className="w-full gap-2" variant="outline">
              View Summaries
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </Card>

        {/* Messages */}
        <Card className="p-6 space-y-4 hover:border-primary/50 transition-colors">
          <div className="flex items-start justify-between">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Send className="h-6 w-6 text-primary" />
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="font-mono font-semibold text-xl">Messages</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Format summaries for Slack, LinkedIn, email, or any channel you need.
            </p>
          </div>
          <Link href="/protected/messages">
            <Button className="w-full gap-2" variant="outline">
              View Messages
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </Card>
      </div>

      {/* Getting Started */}
      <Card className="p-8 space-y-6 bg-accent/50">
        <div className="space-y-2">
          <h2 className="font-mono text-2xl font-bold">Getting Started</h2>
          <p className="text-muted-foreground">
            Follow these steps to create your first update
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <div className="font-mono font-semibold text-primary">Step 1</div>
            <h3 className="font-mono font-semibold">Create a project</h3>
            <p className="text-sm text-muted-foreground">
              Start by creating a project to organize your work
            </p>
          </div>
          <div className="space-y-2">
            <div className="font-mono font-semibold text-primary">Step 2</div>
            <h3 className="font-mono font-semibold">Add notes & repos</h3>
            <p className="text-sm text-muted-foreground">
              Connect repositories and add notes about your progress
            </p>
          </div>
          <div className="space-y-2">
            <div className="font-mono font-semibold text-primary">Step 3</div>
            <h3 className="font-mono font-semibold">Generate summaries</h3>
            <p className="text-sm text-muted-foreground">
              Create audience-specific updates and share them anywhere
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
