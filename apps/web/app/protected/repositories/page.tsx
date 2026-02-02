import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FetchCommitsButton } from "@/components/fetch-commits-button";
import Link from "next/link";
import { Plus, GitBranch, ExternalLink } from "lucide-react";

export const dynamic = 'force-dynamic';

async function getUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  return data.claims;
}

async function getRepositories() {
  const supabase = await createClient();

  const { data: repos } = await supabase
    .from("repositories")
    .select(`
      id,
      name,
      full_name,
      owner,
      provider,
      repo_url,
      default_branch,
      created_at,
      updated_at,
      commits(count),
      project_repositories(
        projects(id, name)
      )
    `)
    .order("updated_at", { ascending: false });

  return repos || [];
}

export default async function RepositoriesPage() {
  const user = await getUser();
  const repositories = await getRepositories();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="font-mono text-4xl font-bold">Repositories</h1>
          <p className="text-xl text-muted-foreground">
            Connect your git repos to track commits as proof of work
          </p>
        </div>
        <Link href="/protected/repositories/connect">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Connect Repository
          </Button>
        </Link>
      </div>

      {/* Repositories Grid */}
      {repositories.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-6">
          {repositories.map((repo) => {
            const commitCount = repo.commits?.[0]?.count || 0;
            const projects = repo.project_repositories?.map(pr => pr.projects) || [];

            return (
              <Card key={repo.id} className="p-6 space-y-4 hover:border-primary/50 transition-colors">
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <h3 className="font-mono font-semibold text-lg flex items-center gap-2">
                        <GitBranch className="h-5 w-5 text-muted-foreground" />
                        {repo.full_name}
                      </h3>
                      {repo.repo_url && (
                        <a
                          href={repo.repo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
                        >
                          View on GitHub
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Projects */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {projects.length > 0 ? (
                      projects.map(project => (
                        <Link
                          key={project.id}
                          href={`/protected/projects/${project.id}`}
                        >
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-accent text-xs font-mono hover:bg-primary/20 transition-colors">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                            {project.name}
                          </span>
                        </Link>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Not linked to any projects
                      </span>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground font-mono">
                    <span>{commitCount} commit{commitCount === 1 ? "" : "s"}</span>
                    {repo.default_branch && (
                      <span>• {repo.default_branch}</span>
                    )}
                    {repo.updated_at && (
                      <span>
                        • Synced {new Date(repo.updated_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric"
                        })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2">
                  <FetchCommitsButton repositoryId={repo.id} size="sm" />
                  <Link href={`/protected/repositories/${repo.id}`}>
                    <Button variant="outline" size="sm">
                      Settings
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-12 text-center space-y-4">
          <GitBranch className="h-12 w-12 text-muted-foreground mx-auto" />
          <div className="space-y-2">
            <h3 className="font-mono font-semibold text-xl">No repositories yet</h3>
            <p className="text-muted-foreground">
              Connect your GitHub repositories to start tracking commits as proof of work
            </p>
          </div>
          <Link href="/protected/repositories/connect">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Connect Repository
            </Button>
          </Link>
        </Card>
      )}
    </div>
  );
}
