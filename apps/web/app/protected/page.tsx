import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { QuickNoteForm } from "@/components/quick-note-form";
import { ensureDefaultProject } from "./actions";
import {
  GitBranch,
  Sparkles,
  Clock
} from "lucide-react";

async function getUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  return data.claims;
}

async function getRecentNotes() {
  const supabase = await createClient();

  const { data: notes } = await supabase
    .from("notes")
    .select("id, content, created_at")
    .order("created_at", { ascending: false })
    .limit(3);

  return notes || [];
}

export default async function DashboardPage() {
  const user = await getUser();

  // Ensure user has a default project
  await ensureDefaultProject();

  const recentNotes = await getRecentNotes();

  return (
    <div className="space-y-8">
      {/* Quick Note Input - Most Prominent */}
      <Card className="p-8 border-primary/20 bg-primary/5">
        <div className="space-y-4">
          <div className="space-y-2">
            <h2 className="font-mono text-2xl font-bold">What did you work on today?</h2>
            <p className="text-muted-foreground">
              Just write. No structure needed. We'll turn it into something great.
            </p>
          </div>
          <QuickNoteForm />
        </div>
      </Card>

      {/* Recent Activity */}
      {recentNotes.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-mono text-xl font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            Recent notes
          </h3>
          <div className="space-y-3">
            {recentNotes.map((note) => (
              <Card key={note.id} className="p-4 hover:border-primary/50 transition-colors">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {new Date(note.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit"
                    })}
                  </p>
                  <p className="text-foreground leading-relaxed">
                    {note.content}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Next Steps */}
      <div className="space-y-4">
        <h3 className="font-mono text-xl font-semibold">Next steps</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-6 space-y-4 hover:border-primary/50 transition-colors">
            <div className="p-3 bg-primary/10 rounded-lg w-fit">
              <GitBranch className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-2">
              <h4 className="font-mono font-semibold text-lg">Connect a repository</h4>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Link your git repos so your commits become proof of work. Combined with notes,
                you'll have everything needed for powerful updates.
              </p>
            </div>
            <p className="text-sm text-muted-foreground font-mono">
              Coming soon
            </p>
          </Card>

          <Card className="p-6 space-y-4 hover:border-primary/50 transition-colors">
            <div className="p-3 bg-primary/10 rounded-lg w-fit">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-2">
              <h4 className="font-mono font-semibold text-lg">Generate your first summary</h4>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Once you have notes and commits, generate AI summaries tailored
                for your manager, clients, or public audience.
              </p>
            </div>
            <p className="text-sm text-muted-foreground font-mono">
              Coming soon
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
