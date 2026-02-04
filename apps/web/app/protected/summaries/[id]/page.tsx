import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { SummaryEditForm } from "@/components/summary-edit-form";
import { RegenerateSummaryButton } from "@/components/regenerate-summary-button";
import { DeleteSummaryButton } from "@/components/delete-summary-button";
import Link from "next/link";
import { ArrowLeft, FolderGit2, Users, Calendar, GitBranch, Send, FileText, Sparkles } from "lucide-react";
import { GenerateMessageDialog } from "@/components/generate-message-dialog";
import { MessageCard } from "@/components/message-card";

export const dynamic = 'force-dynamic';

async function getUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  return data.claims;
}

async function getSummary(id: string) {
  const supabase = await createClient();

  const { data: summary, error } = await supabase
    .from("summaries")
    .select(`
      id,
      text,
      period_start,
      period_end,
      repository_branches,
      todoist_tasks_active_count,
      todoist_tasks_completed_count,
      created_at,
      updated_at,
      projects!inner(id, name, user_id),
      audiences(id, name, description)
    `)
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching summary:", error);
  }

  console.log("Fetched summary:", summary);

  if (!summary) {
    notFound();
  }

  return summary;
}

async function getSummaryCounts(id: string) {
  const supabase = await createClient();

  // Count linked notes
  const { count: notesCount } = await supabase
    .from("summary_notes")
    .select("*", { count: "exact", head: true })
    .eq("summary_id", id);

  // Count linked commits
  const { count: commitsCount } = await supabase
    .from("summary_commits")
    .select("*", { count: "exact", head: true })
    .eq("summary_id", id);

  return {
    notes: notesCount || 0,
    commits: commitsCount || 0
  };
}

async function getRepositoryBranches(repositoryBranches: Record<string, string> | null) {
  if (!repositoryBranches || Object.keys(repositoryBranches).length === 0) {
    return [];
  }

  const supabase = await createClient();
  const repoIds = Object.keys(repositoryBranches);

  const { data: repos } = await supabase
    .from("repositories")
    .select("id, name, full_name")
    .in("id", repoIds);

  return (repos || []).map(repo => ({
    name: repo.full_name || repo.name,
    branch: repositoryBranches[repo.id]
  }));
}

async function getMessages(summaryId: string) {
  const supabase = await createClient();

  const { data: messages } = await supabase
    .from("messages")
    .select(`
      id,
      text,
      created_at,
      channels!inner(id, name, character_limit)
    `)
    .eq("summary_id", summaryId)
    .order("created_at", { ascending: false });

  return messages || [];
}

async function getChannels() {
  const supabase = await createClient();

  const { data: channels } = await supabase
    .from("channels")
    .select("id, name, description, character_limit")
    .order("name", { ascending: true });

  return channels || [];
}

export default async function SummaryPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  const { id } = await params;
  const summary = await getSummary(id);
  const counts = await getSummaryCounts(id);
  const repoBranches = await getRepositoryBranches(summary.repository_branches as Record<string, string> | null);
  const messages = await getMessages(id);
  const channels = await getChannels();

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="space-y-4">
        <Link
          href="/protected/summaries"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors font-mono"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Summaries
        </Link>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <h1 className="font-mono text-4xl font-bold">Summary</h1>
            <div className="flex items-center gap-3 flex-wrap text-muted-foreground">
              <div className="flex items-center gap-1.5 text-sm">
                <FolderGit2 className="h-4 w-4" />
                <span className="font-mono">{summary.projects.name}</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1.5 text-sm">
                <Users className="h-4 w-4" />
                <span className="font-mono">{summary.audiences.name}</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1.5 text-sm">
                <Calendar className="h-4 w-4" />
                <span className="font-mono">
                  {new Date(summary.period_start).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric"
                  })}
                  {" - "}
                  {new Date(summary.period_end).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric"
                  })}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <RegenerateSummaryButton summaryId={summary.id} />
            <DeleteSummaryButton summaryId={summary.id} />
          </div>
        </div>
      </div>

      {/* Summary Content */}
      <Card className="p-8">
        <SummaryEditForm summary={summary} />
      </Card>

      {/* Metadata */}
      <Card className="p-6 bg-muted/30">
        <div className="space-y-4">
          <h3 className="font-mono font-semibold text-sm">Summary Details</h3>

          {/* Notes Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <FileText className="h-3.5 w-3.5" />
              <span>Notes</span>
            </div>
            <div className="flex justify-between text-sm pl-5">
              <span className="text-muted-foreground font-mono">Notes included</span>
              <span className="font-mono">{counts.notes}</span>
            </div>
          </div>

          {/* GitHub Section */}
          {counts.commits > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <GitBranch className="h-3.5 w-3.5" />
                <span>From GitHub</span>
              </div>
              <div className="flex justify-between text-sm pl-5">
                <span className="text-muted-foreground font-mono">Commits included</span>
                <span className="font-mono">{counts.commits}</span>
              </div>
              {repoBranches.length > 0 && (
                <div className="space-y-1.5 pl-5">
                  <h4 className="font-mono text-xs text-muted-foreground">Branches used:</h4>
                  {repoBranches.map((repo, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <span className="font-mono text-muted-foreground">{repo.name}</span>
                      <span className="text-muted-foreground">/</span>
                      <span className="font-mono">{repo.branch}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Todoist Section */}
          {(summary.todoist_tasks_active_count > 0 || summary.todoist_tasks_completed_count > 0) && (
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5" />
                <span>From Todoist</span>
              </div>
              <div className="flex justify-between text-sm pl-5">
                <span className="text-muted-foreground font-mono">Tasks added/updated</span>
                <span className="font-mono">{summary.todoist_tasks_active_count}</span>
              </div>
              <div className="flex justify-between text-sm pl-5">
                <span className="text-muted-foreground font-mono">Tasks completed</span>
                <span className="font-mono">{summary.todoist_tasks_completed_count}</span>
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="grid md:grid-cols-2 gap-3 text-sm pt-2 border-t">
            <div className="flex justify-between">
              <span className="text-muted-foreground font-mono">Created</span>
              <span className="font-mono">
                {new Date(summary.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric"
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground font-mono">Last updated</span>
              <span className="font-mono">
                {new Date(summary.updated_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric"
                })}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Messages */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-mono text-xl font-semibold flex items-center gap-2">
            <Send className="h-5 w-5 text-muted-foreground" />
            Messages
          </h3>
          <GenerateMessageDialog
            summaryId={id}
            channels={channels}
            existingChannelIds={messages.map(m => m.channels.id)}
          />
        </div>

        {messages.length > 0 ? (
          <div className="space-y-3">
            {messages.map((message) => (
              <MessageCard key={message.id} message={message} />
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center space-y-3 bg-muted/30">
            <Send className="h-8 w-8 text-muted-foreground mx-auto" />
            <div className="space-y-1">
              <h4 className="font-mono font-semibold">No messages yet</h4>
              <p className="text-sm text-muted-foreground">
                Transform this summary for different channels like Email, Twitter, or LinkedIn
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
