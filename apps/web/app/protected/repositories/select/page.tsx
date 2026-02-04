"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { fetchGitHubRepos, addGitHubRepositories, fetchGitHubUsername } from "@/app/protected/repositories/actions";
import { Loader2, GitBranch, ExternalLink, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
  };
  html_url: string;
  description: string | null;
  default_branch: string;
  updated_at: string;
}

interface Project {
  id: string;
  name: string;
}

// Helper to determine if repo is from an organization
// We'll fetch the user's GitHub username and compare it to repo.owner.login
function isOrgRepo(repo: GitHubRepo, username: string): boolean {
  return username && repo.owner.login !== username;
}

function getReAuthUrl(): string {
  const githubClientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redirectUri = `${appUrl}/protected/repositories/callback`;
  const scope = "repo";
  const state = Math.random().toString(36).substring(7);

  return `https://github.com/login/oauth/authorize?client_id=${githubClientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}&prompt=consent`;
}

export default function SelectRepositoriesPage() {
  const router = useRouter();
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedRepos, setSelectedRepos] = useState<Set<number>>(new Set());
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [githubUsername, setGithubUsername] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        // Fetch GitHub username
        const usernameResult = await fetchGitHubUsername();
        if (!usernameResult.error && usernameResult.username) {
          setGithubUsername(usernameResult.username);
        }

        // Fetch GitHub repos
        const reposResult = await fetchGitHubRepos();
        if (reposResult.error) {
          setError(reposResult.error);
          return;
        }
        setRepos(reposResult.repos || []);

        // Fetch user's projects
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data: projectsData } = await supabase
          .from("projects")
          .select("id, name")
          .order("name");

        setProjects(projectsData || []);
      } catch (err) {
        console.error("Error loading data:", err);
        setError("Failed to load repositories");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  function toggleRepo(repoId: number) {
    const newSet = new Set(selectedRepos);
    if (newSet.has(repoId)) {
      newSet.delete(repoId);
    } else {
      newSet.add(repoId);
    }
    setSelectedRepos(newSet);
  }

  function toggleProject(projectId: string) {
    const newSet = new Set(selectedProjects);
    if (newSet.has(projectId)) {
      newSet.delete(projectId);
    } else {
      newSet.add(projectId);
    }
    setSelectedProjects(newSet);
  }

  async function handleRefresh() {
    setLoading(true);
    setError(null);
    try {
      const reposResult = await fetchGitHubRepos();
      if (reposResult.error) {
        setError(reposResult.error);
        return;
      }
      setRepos(reposResult.repos || []);
    } catch (err) {
      console.error("Error refreshing repositories:", err);
      setError("Failed to refresh repositories");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (selectedRepos.size === 0) {
      setError("Please select at least one repository");
      return;
    }

    if (selectedProjects.size === 0) {
      setError("Please select at least one project");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const selectedRepoData = repos.filter(r => selectedRepos.has(r.id));

      const formData = new FormData();
      formData.append("selected_repos", JSON.stringify(selectedRepoData));
      selectedProjects.forEach(projectId => {
        formData.append("project_ids", projectId);
      });

      await addGitHubRepositories(formData);
      // Redirect handled by server action
    } catch (err) {
      console.error("Error adding repositories:", err);
      setError("Failed to add repositories");
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground font-mono">Loading repositories...</p>
        </div>
      </div>
    );
  }

  if (error && repos.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="p-12 max-w-md space-y-6 text-center">
          <div className="space-y-2">
            <h2 className="font-mono text-2xl font-bold">Error</h2>
            <p className="text-destructive">{error}</p>
          </div>
          <div className="flex gap-2 justify-center">
            <Link href="/protected/repositories/connect">
              <Button>Try Again</Button>
            </Link>
            <Link href="/protected/repositories">
              <Button variant="outline">Back to Repositories</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

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
        <div className="space-y-2">
          <h1 className="font-mono text-4xl font-bold">Select Repositories</h1>
          <p className="text-xl text-muted-foreground">
            Choose repositories to import and assign to projects
          </p>
        </div>
      </div>

      {/* Organization Help Banner */}
      <Card className="p-4 bg-muted/50 border-primary/20">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 flex-1">
            <p className="text-sm font-medium">Don&apos;t see your organization&apos;s repositories?</p>
            <p className="text-xs text-muted-foreground">
              You may need to grant Shipshow access to your organizations.
              Click &quot;Re-authorize GitHub&quot; and grant access to the organizations you want to use.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
            >
              Refresh List
            </Button>
            <a href={getReAuthUrl()}>
              <Button size="sm" variant="default">
                Re-authorize GitHub
              </Button>
            </a>
          </div>
        </div>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Project Selection */}
        <Card className="p-6 space-y-4">
          <div className="space-y-2">
            <h2 className="font-mono text-xl font-bold">Assign to Projects</h2>
            <p className="text-sm text-muted-foreground">
              Selected repositories will be linked to these projects
            </p>
          </div>
          {projects.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-3">
              {projects.map(project => (
                <div key={project.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`project-${project.id}`}
                    checked={selectedProjects.has(project.id)}
                    onCheckedChange={() => toggleProject(project.id)}
                  />
                  <label
                    htmlFor={`project-${project.id}`}
                    className="text-sm font-medium leading-none cursor-pointer"
                  >
                    {project.name}
                  </label>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              No projects found.{" "}
              <Link href="/protected/projects/new" className="text-primary hover:underline">
                Create a project first
              </Link>
            </div>
          )}
        </Card>

        {/* Repository Selection */}
        <Card className="p-6 space-y-4">
          <div className="space-y-2">
            <h2 className="font-mono text-xl font-bold">
              Your Repositories ({repos.length})
            </h2>
            <p className="text-sm text-muted-foreground">
              Select which repositories to import
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {repos.map(repo => (
              <div
                key={repo.id}
                className={`border rounded-lg p-4 space-y-2 transition-colors ${
                  selectedRepos.has(repo.id)
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2 flex-1">
                    <Checkbox
                      id={`repo-${repo.id}`}
                      checked={selectedRepos.has(repo.id)}
                      onCheckedChange={() => toggleRepo(repo.id)}
                      className="mt-1"
                    />
                    <label
                      htmlFor={`repo-${repo.id}`}
                      className="flex-1 cursor-pointer space-y-1"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <GitBranch className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="font-mono font-semibold text-sm">
                          {repo.full_name}
                        </span>
                        {isOrgRepo(repo, githubUsername) && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                            Organization
                          </span>
                        )}
                      </div>
                      {repo.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {repo.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{repo.default_branch}</span>
                        <span>
                          • Updated {new Date(repo.updated_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric"
                          })}
                        </span>
                      </div>
                    </label>
                  </div>
                  <a
                    href={repo.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {error && (
          <div className="text-sm text-destructive text-center">
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {selectedRepos.size} repository{selectedRepos.size === 1 ? "" : "ies"} selected,{" "}
            {selectedProjects.size} project{selectedProjects.size === 1 ? "" : "s"} assigned
          </p>
          <Button
            type="submit"
            disabled={submitting || selectedRepos.size === 0 || selectedProjects.size === 0}
            size="lg"
            className="gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Adding Repositories...
              </>
            ) : (
              `Add ${selectedRepos.size} Repositories`
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
