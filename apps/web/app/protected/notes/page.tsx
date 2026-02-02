import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProjectBadgeMenu } from "@/components/project-badge-menu";
import Link from "next/link";
import { Plus, FileText, Clock } from "lucide-react";

async function getUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  return data.claims;
}

async function getNotes() {
  const supabase = await createClient();

  const { data: notes } = await supabase
    .from("notes")
    .select(`
      id,
      title,
      content,
      created_at,
      projects:project_id (
        id,
        name
      )
    `)
    .order("created_at", { ascending: false });

  return notes || [];
}

async function getAllProjects() {
  const supabase = await createClient();

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name")
    .order("name", { ascending: true });

  return projects || [];
}

export default async function NotesPage() {
  const user = await getUser();
  const notes = await getNotes();
  const allProjects = await getAllProjects();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="font-mono text-4xl font-bold">Notes</h1>
          <p className="text-xl text-muted-foreground">
            Capture context, wins, and blockers
          </p>
        </div>
        <Link href="/protected/notes/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Note
          </Button>
        </Link>
      </div>

      {/* Notes List */}
      {notes.length > 0 ? (
        <div className="space-y-3">
          {notes.map((note) => (
            <Card key={note.id} className="p-5 hover:border-primary/50 transition-colors">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <p className="text-sm text-muted-foreground font-mono flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    {new Date(note.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit"
                    })}
                  </p>
                  {note.projects && (
                    <ProjectBadgeMenu
                      noteId={note.id}
                      currentProject={note.projects}
                      allProjects={allProjects}
                    />
                  )}
                </div>
                <Link href={`/protected/notes/${note.id}`}>
                  {note.title && (
                    <h3 className="font-mono font-semibold text-lg hover:text-primary transition-colors">
                      {note.title}
                    </h3>
                  )}
                  <p className="text-foreground leading-relaxed line-clamp-3 hover:text-muted-foreground transition-colors">
                    {note.content}
                  </p>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center space-y-4">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
          <div className="space-y-2">
            <h3 className="font-mono font-semibold text-xl">No notes yet</h3>
            <p className="text-muted-foreground">
              Start capturing your work - no titles or structure required
            </p>
          </div>
          <Link href="/protected/notes/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Note
            </Button>
          </Link>
        </Card>
      )}
    </div>
  );
}
