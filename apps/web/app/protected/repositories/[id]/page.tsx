import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { RepositoryForm } from "@/components/repository-form";
import { DeleteRepositoryButton } from "@/components/delete-repository-button";
import { FetchCommitsButton } from "@/components/fetch-commits-button";
import Link from "next/link";
import { ArrowLeft, Clock, GitCommit, ExternalLink } from "lucide-react";

export const dynamic = 'force-dynamic';

async function getUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  return data.claims;
}

async function getRepository(id: string) {
  const supabase = await createClient();

  const { data: repo } = await supabase
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
      commits(
        id,
        sha,
        message,
        author,
        committed_at
      ),
      project_repositories(
        projects(id, name)
      )
    `)
    .eq("id", id)
    .single();

  if (!repo) {
    notFound();
  }

  // Sort commits by date (most recent first)
  const sortedCommits = repo.commits
    ? [...repo.commits].sort(
        (a, b) => new Date(b.committed_at).getTime() - new Date(a.committed_at).getTime()
      ).slice(0, 10)
    : [];

  return { ...repo, commits: sortedCommits };
}

async function getAllProjects() {
  const supabase = await createClient();

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name")
    .order("name", { ascending: true });

  return projects || [];
}

export default async function RepositoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser();
  const repository = await getRepository(id);
  const allProjects = await getAllProjects();

  const linkedProjectIds = repository.project_repositories
    ?.map(pr => pr.projects.id) || [];

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <div className="space-y-4">
        <Link
          href="/protected/repositories"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors font-mono"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Repositories
        </Link>
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <h1 className="font-mono text-4xl font-bold">{repository.full_name}</h1>
            <div className="flex items-center gap-4">
              {repository.repo_url && (
                <a
                  href={repository.repo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  View on GitHub
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
              <p className="text-sm text-muted-foreground font-mono">
                Added {new Date(repository.created_at).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric"
                })}
              </p>
            </div>
          </div>
          <DeleteRepositoryButton repositoryId={id} />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Settings */}
        <div className="space-y-4">
          <h2 className="font-mono text-2xl font-bold">Settings</h2>
          <Card className="p-6">
            <RepositoryForm
              repository={{
                id: repository.id,
                name: repository.name || "",
                owner: repository.owner || "",
                full_name: repository.full_name || "",
                default_branch: repository.default_branch
              }}
              userProjects={allProjects}
              linkedProjectIds={linkedProjectIds}
            />
          </Card>
        </div>

        {/* Activity */}
        <div className="space-y-6">
          {/* Commit Stats */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-mono text-xl font-semibold flex items-center gap-2">
                <GitCommit className="h-5 w-5 text-muted-foreground" />
                Recent Commits
              </h3>
              <FetchCommitsButton repositoryId={id} size="sm" />
            </div>

            {repository.commits && repository.commits.length > 0 ? (
              <div className="space-y-3">
                {repository.commits.map((commit) => (
                  <Card key={commit.id} className="p-4 space-y-2">
                    <div className="flex items-start gap-2">
                      <GitCommit className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="text-sm leading-relaxed line-clamp-2">
                          {commit.message}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-mono">{commit.author}</span>
                          <span>•</span>
                          <span className="font-mono">{commit.sha.substring(0, 7)}</span>
                          <span>•</span>
                          <Clock className="h-3 w-3" />
                          <span>
                            {new Date(commit.committed_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit"
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
                {repository.commits.length === 10 && (
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    Showing 10 most recent commits
                  </p>
                )}
              </div>
            ) : (
              <Card className="p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  No commits yet. Click "Fetch Commits" to import from GitHub.
                </p>
              </Card>
            )}
          </div>

          {/* Linked Projects */}
          <div className="space-y-4">
            <h3 className="font-mono text-xl font-semibold">Linked Projects</h3>
            {repository.project_repositories && repository.project_repositories.length > 0 ? (
              <div className="space-y-2">
                {repository.project_repositories.map(pr => (
                  <Link key={pr.projects.id} href={`/protected/projects/${pr.projects.id}`}>
                    <Card className="p-3 hover:border-primary/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                        <span className="font-mono text-sm">{pr.projects.name}</span>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <Card className="p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Not linked to any projects. Edit settings to link.
                </p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
