import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { NoteForm } from "@/components/note-form";
import { DeleteNoteButton } from "@/components/delete-note-button";
import { ProjectBadgeMenu } from "@/components/project-badge-menu";
import Link from "next/link";
import { ArrowLeft, Clock } from "lucide-react";

async function getUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  return data.claims;
}

async function getNote(id: string) {
  const supabase = await createClient();

  const { data: note } = await supabase
    .from("notes")
    .select(`
      id,
      title,
      content,
      project_id,
      created_at,
      updated_at,
      projects:project_id (
        id,
        name
      )
    `)
    .eq("id", id)
    .single();

  if (!note) {
    notFound();
  }

  return note;
}

async function getProjects() {
  const supabase = await createClient();

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name")
    .order("name", { ascending: true });

  return projects || [];
}

async function getAllProjects() {
  const supabase = await createClient();

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name")
    .order("name", { ascending: true });

  return projects || [];
}

export default async function NotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser();
  const note = await getNote(id);
  const projects = await getProjects();
  const allProjects = await getAllProjects();

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <div className="space-y-4">
        <Link
          href="/protected/notes"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors font-mono"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Notes
        </Link>
        <div className="flex items-start justify-between">
          <div className="space-y-3">
            {note.title && (
              <h1 className="font-mono text-4xl font-bold">{note.title}</h1>
            )}
            <div className="flex items-center gap-3">
              <p className="text-sm text-muted-foreground font-mono flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {new Date(note.created_at).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit"
                })}
              </p>
              {note.projects && (
                <ProjectBadgeMenu
                  noteId={id}
                  currentProject={note.projects}
                  allProjects={allProjects}
                />
              )}
            </div>
            {note.updated_at !== note.created_at && (
              <p className="text-xs text-muted-foreground font-mono">
                Updated {new Date(note.updated_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit"
                })}
              </p>
            )}
          </div>
          <DeleteNoteButton noteId={id} />
        </div>
      </div>

      {/* Note Content (if not editing) */}
      {!note.title && (
        <Card className="p-6">
          <p className="text-foreground leading-relaxed whitespace-pre-wrap">
            {note.content}
          </p>
        </Card>
      )}

      {/* Edit Form */}
      <div className="space-y-4">
        <h2 className="font-mono text-2xl font-bold">Edit Note</h2>
        <Card className="p-8">
          <NoteForm note={note} projects={projects} />
        </Card>
      </div>
    </div>
  );
}
