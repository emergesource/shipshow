import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProjectForm } from "@/components/project-form";
import { DeleteProjectButton } from "@/components/delete-project-button";
import { ProjectBadgeMenu } from "@/components/project-badge-menu";
import Link from "next/link";
import { ArrowLeft, FileText, GitBranch, Clock } from "lucide-react";

async function getUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  return data.claims;
}

async function getProject(id: string) {
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select(`
      id,
      name,
      description,
      created_at,
      updated_at
    `)
    .eq("id", id)
    .single();

  if (!project) {
    notFound();
  }

  return project;
}

async function getProjectNotes(projectId: string) {
  const supabase = await createClient();

  const { data: notes } = await supabase
    .from("notes")
    .select(`
      id,
      content,
      created_at,
      projects:project_id (
        id,
        name
      )
    `)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(5);

  return notes || [];
}

async function getProjectRepositories(projectId: string) {
  const supabase = await createClient();

  const { data: repos } = await supabase
    .from("repositories")
    .select("id, repo_url, provider, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  return repos || [];
}

async function getAllProjects() {
  const supabase = await createClient();

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name")
    .order("name", { ascending: true });

  return projects || [];
}

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser();
  const project = await getProject(id);
  const notes = await getProjectNotes(id);
  const repositories = await getProjectRepositories(id);
  const allProjects = await getAllProjects();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <Link
          href="/protected/projects"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors font-mono"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Projects
        </Link>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <h1 className="font-mono text-4xl font-bold">{project.name}</h1>
            {project.description && (
              <p className="text-xl text-muted-foreground">
                {project.description}
              </p>
            )}
            <p className="text-sm text-muted-foreground font-mono">
              Created {new Date(project.created_at).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric"
              })}
            </p>
          </div>
          <DeleteProjectButton projectId={id} />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Edit Form */}
        <div className="space-y-4">
          <h2 className="font-mono text-2xl font-bold">Edit Project</h2>
          <Card className="p-6">
            <ProjectForm project={project} />
          </Card>
        </div>

        {/* Project Stats and Activity */}
        <div className="space-y-6">
          {/* Recent Notes */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-mono text-xl font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                Recent Notes
              </h3>
              <Link href="/protected/notes">
                <Button variant="ghost" size="sm" className="font-mono text-xs">
                  View all
                </Button>
              </Link>
            </div>
            {notes.length > 0 ? (
              <div className="space-y-3">
                {notes.map((note) => (
                  <Card key={note.id} className="p-4 hover:border-primary/50 transition-colors">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-muted-foreground font-mono flex items-center gap-1.5">
                          <Clock className="h-3 w-3" />
                          {new Date(note.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
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
                        <p className="text-sm text-foreground leading-relaxed line-clamp-2 hover:text-muted-foreground transition-colors">
                          {note.content}
                        </p>
                      </Link>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-6 text-center">
                <p className="text-sm text-muted-foreground">No notes yet</p>
              </Card>
            )}
          </div>

          {/* Repositories */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-mono text-xl font-semibold flex items-center gap-2">
                <GitBranch className="h-5 w-5 text-muted-foreground" />
                Repositories
              </h3>
              <Link href="/protected/repositories">
                <Button variant="ghost" size="sm" className="font-mono text-xs">
                  Manage
                </Button>
              </Link>
            </div>
            {repositories.length > 0 ? (
              <div className="space-y-3">
                {repositories.map((repo) => (
                  <Card key={repo.id} className="p-4 hover:border-primary/50 transition-colors">
                    <div className="space-y-1">
                      <p className="text-sm font-mono text-foreground truncate">
                        {repo.repo_url}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {repo.provider}
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-6 text-center">
                <p className="text-sm text-muted-foreground">No repositories connected</p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
