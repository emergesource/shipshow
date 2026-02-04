import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, FileText, Users, Calendar, FolderGit2 } from "lucide-react";

export const dynamic = 'force-dynamic';

async function getUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  return data.claims;
}

async function getSummaries() {
  const supabase = await createClient();

  const { data: summaries, error } = await supabase
    .from("summaries")
    .select(`
      id,
      text,
      period_start,
      period_end,
      created_at,
      projects!inner(id, name, user_id),
      audiences(id, name)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching summaries:", error);
  }

  console.log("Fetched summaries:", summaries?.length || 0, summaries);

  return summaries || [];
}

export default async function SummariesPage() {
  const user = await getUser();
  const summaries = await getSummaries();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="font-mono text-4xl font-bold">Summaries</h1>
          <p className="text-xl text-muted-foreground">
            AI-generated work summaries for your audiences
          </p>
        </div>
        <Link href="/protected/summaries/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Summary
          </Button>
        </Link>
      </div>

      {/* Summaries List */}
      {summaries.length > 0 ? (
        <div className="space-y-4">
          {summaries.map((summary) => (
            <Link key={summary.id} href={`/protected/summaries/${summary.id}`}>
              <Card className="p-6 space-y-4 hover:border-primary/50 transition-colors">
                {/* Header Info */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <FolderGit2 className="h-4 w-4" />
                      <span className="font-mono">{summary.projects.name}</span>
                    </div>
                    <span className="text-muted-foreground">•</span>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span className="font-mono">{summary.audiences.name}</span>
                    </div>
                    <span className="text-muted-foreground">•</span>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
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
                  <span className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                    {new Date(summary.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric"
                    })}
                  </span>
                </div>

                {/* Summary Text Preview */}
                <p className="text-foreground leading-relaxed line-clamp-3">
                  {summary.text}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center space-y-4">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
          <div className="space-y-2">
            <h3 className="font-mono font-semibold text-xl">No summaries yet</h3>
            <p className="text-muted-foreground">
              Generate your first AI summary from your project notes and commits
            </p>
          </div>
          <Link href="/protected/summaries/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Summary
            </Button>
          </Link>
        </Card>
      )}
    </div>
  );
}
