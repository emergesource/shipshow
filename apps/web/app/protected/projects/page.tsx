import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, FolderGit2, FileText, GitBranch, Sparkles } from "lucide-react";

export const dynamic = 'force-dynamic';

async function getUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  return data.claims;
}

async function getProjects() {
  const supabase = await createClient();

  const { data: projects } = await supabase
    .from("projects")
    .select(`
      id,
      name,
      description,
      created_at,
      notes:notes(count),
      project_repositories(count),
      summaries(count)
    `)
    .order("created_at", { ascending: false });

  return projects || [];
}

export default async function ProjectsPage() {
  const user = await getUser();
  const projects = await getProjects();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="font-mono text-4xl font-bold">Projects</h1>
          <p className="text-xl text-muted-foreground">
            Organize your work into projects
          </p>
        </div>
        <Link href="/protected/projects/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </Link>
      </div>

      {/* Projects Grid */}
      {projects.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Link key={project.id} href={`/protected/projects/${project.id}`}>
              <Card className="p-6 space-y-4 hover:border-primary/50 transition-colors h-full">
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <FolderGit2 className="h-6 w-6 text-primary" />
                    <span className="text-xs text-muted-foreground font-mono">
                      {new Date(project.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric"
                      })}
                    </span>
                  </div>
                  <h3 className="font-mono font-semibold text-xl">{project.name}</h3>
                  {project.description && (
                    <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2">
                      {project.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-4 pt-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <FileText className="h-4 w-4" />
                    <span className="font-mono">{project.notes[0]?.count || 0}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <GitBranch className="h-4 w-4" />
                    <span className="font-mono">{project.project_repositories[0]?.count || 0}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4" />
                    <span className="font-mono">{project.summaries[0]?.count || 0}</span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center space-y-4">
          <FolderGit2 className="h-12 w-12 text-muted-foreground mx-auto" />
          <div className="space-y-2">
            <h3 className="font-mono font-semibold text-xl">No projects yet</h3>
            <p className="text-muted-foreground">
              Create your first project to start organizing your work
            </p>
          </div>
          <Link href="/protected/projects/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Project
            </Button>
          </Link>
        </Card>
      )}
    </div>
  );
}
