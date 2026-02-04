import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { SummaryEditForm } from "@/components/summary-edit-form";
import { RegenerateSummaryButton } from "@/components/regenerate-summary-button";
import { DeleteSummaryButton } from "@/components/delete-summary-button";
import Link from "next/link";
import { ArrowLeft, FolderGit2, Users, Calendar } from "lucide-react";

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

export default async function SummaryPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  const { id } = await params;
  const summary = await getSummary(id);
  const counts = await getSummaryCounts(id);

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
        <div className="space-y-3">
          <h3 className="font-mono font-semibold text-sm">Summary Details</h3>
          <div className="grid md:grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground font-mono">Notes included</span>
              <span className="font-mono">{counts.notes}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground font-mono">Commits included</span>
              <span className="font-mono">{counts.commits}</span>
            </div>
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
    </div>
  );
}
