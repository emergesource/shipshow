"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { generateSummary } from "@/app/protected/summaries/actions";
import { fetchCommitsAction, fetchGitHubBranches } from "@/app/protected/repositories/actions";
import { Loader2, Calendar, FileText, GitBranch, Sparkles, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Project {
  id: string;
  name: string;
}

interface Audience {
  id: string;
  name: string;
  description: string | null;
}

interface SummaryFormProps {
  projects: Project[];
  audiences: Audience[];
  defaultProjectId?: string;
}

type TimePeriod = "today" | "this_week" | "this_month" | "custom";

export function SummaryForm({ projects, audiences, defaultProjectId }: SummaryFormProps) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedProject, setSelectedProject] = useState(defaultProjectId || "");
  const [selectedAudience, setSelectedAudience] = useState("");
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("this_week");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const [previewCounts, setPreviewCounts] = useState<{
    notes: number;
    commits: number;
    todoistAddedOrUpdatedTasks: number;
    todoistCompletedTasks: number;
  } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const [repositories, setRepositories] = useState<Array<{
    id: string;
    name: string;
    full_name: string;
    default_branch: string;
    selected_branch: string;
    branches: string[];
  }>>([]);
  const [repoCommitCounts, setRepoCommitCounts] = useState<Record<string, number>>({});
  const [fetchingCommits, setFetchingCommits] = useState<Record<string, boolean>>({});
  const [loadingBranches, setLoadingBranches] = useState<Record<string, boolean>>({});

  // Calculate date range based on period
  const getDateRange = useCallback((): { start: string; end: string } | null => {
    const now = new Date();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    let start: Date;
    const end = endOfToday;

    switch (timePeriod) {
      case "today":
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        break;
      case "this_week":
        const dayOfWeek = now.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        start = new Date(now);
        start.setDate(now.getDate() - daysToMonday);
        start.setHours(0, 0, 0, 0);
        break;
      case "this_month":
        start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        break;
      case "custom":
        if (!customStartDate || !customEndDate) return null;
        return {
          start: new Date(customStartDate + "T00:00:00").toISOString(),
          end: new Date(customEndDate + "T23:59:59").toISOString()
        };
      default:
        return null;
    }

    return {
      start: start.toISOString(),
      end: end.toISOString()
    };
  }, [timePeriod, customStartDate, customEndDate]);

  // Load repositories when project changes
  useEffect(() => {
    async function loadRepositories() {
      if (!selectedProject) {
        setRepositories([]);
        return;
      }

      try {
        const supabase = createClient();
        const { data: projectRepos } = await supabase
          .from("project_repositories")
          .select(`
            repositories(id, name, full_name, default_branch)
          `)
          .eq("project_id", selectedProject);

        const repos = projectRepos?.map(pr => pr.repositories).filter(Boolean) || [];
        const reposWithBranches = await Promise.all(
          repos.map(async (repo) => {
            setLoadingBranches(prev => ({ ...prev, [repo.id]: true }));
            const result = await fetchGitHubBranches(repo.id);
            const branches = result.branches || [repo.default_branch || "main"];
            setLoadingBranches(prev => ({ ...prev, [repo.id]: false }));

            return {
              id: repo.id,
              name: repo.name,
              full_name: repo.full_name,
              default_branch: repo.default_branch || "main",
              selected_branch: repo.default_branch || "main",
              branches
            };
          })
        );

        setRepositories(reposWithBranches);
      } catch (err) {
        console.error("Error loading repositories:", err);
      }
    }

    loadRepositories();
  }, [selectedProject]);

  // Load preview counts when project or time period changes
  useEffect(() => {
    async function loadPreview() {
      if (!selectedProject) {
        setPreviewCounts(null);
        setRepoCommitCounts({});
        return;
      }

      const dateRange = getDateRange();
      if (!dateRange) {
        setPreviewCounts(null);
        setRepoCommitCounts({});
        return;
      }

      setLoadingPreview(true);
      try {
        const supabase = createClient();

        // Count notes
        const { count: notesCount } = await supabase
          .from("notes")
          .select("*", { count: "exact", head: true })
          .eq("project_id", selectedProject)
          .gte("created_at", dateRange.start)
          .lte("created_at", dateRange.end);

        // Get repository IDs for project
        const repoIds = repositories.map(r => r.id);

        let commitsCount = 0;
        const repoCounts: Record<string, number> = {};

        if (repoIds.length > 0) {
          // Count total commits
          const { count } = await supabase
            .from("commits")
            .select("*", { count: "exact", head: true })
            .in("repository_id", repoIds)
            .gte("committed_at", dateRange.start)
            .lte("committed_at", dateRange.end);

          commitsCount = count || 0;

          // Count commits per repository
          for (const repoId of repoIds) {
            const { count: repoCount } = await supabase
              .from("commits")
              .select("*", { count: "exact", head: true })
              .eq("repository_id", repoId)
              .gte("committed_at", dateRange.start)
              .lte("committed_at", dateRange.end);

            repoCounts[repoId] = repoCount || 0;
          }
        }

        // Fetch Todoist tasks if project has todoist_project_id
        let todoistAddedOrUpdatedTasks = 0;
        let todoistCompletedTasks = 0;

        const { data: project } = await supabase
          .from("projects")
          .select("todoist_project_id")
          .eq("id", selectedProject)
          .single();

        if (project?.todoist_project_id) {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
              const todoistResponse = await fetch(
                `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/todoist-fetch-data`,
                {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    type: 'tasks',
                    project_id: project.todoist_project_id,
                    since: dateRange.start,
                    until: dateRange.end
                  })
                }
              );

              if (todoistResponse.ok) {
                const todoistResult = await todoistResponse.json();
                todoistAddedOrUpdatedTasks = (todoistResult.tasks_added_or_updated || []).length;
                todoistCompletedTasks = (todoistResult.tasks_completed || []).length;
              }
            }
          } catch (error) {
            console.error("Error fetching Todoist tasks for preview:", error);
          }
        }

        setPreviewCounts({
          notes: notesCount || 0,
          commits: commitsCount,
          todoistAddedOrUpdatedTasks,
          todoistCompletedTasks
        });
        setRepoCommitCounts(repoCounts);
      } catch (err) {
        console.error("Error loading preview:", err);
      } finally {
        setLoadingPreview(false);
      }
    }

    loadPreview();
  }, [selectedProject, timePeriod, customStartDate, customEndDate, getDateRange, repositories]);

  function handleBranchChange(repoId: string, branch: string) {
    setRepositories(prev => prev.map(repo =>
      repo.id === repoId ? { ...repo, selected_branch: branch } : repo
    ));
  }

  async function fetchCommitsForRepo(repoId: string) {
    setFetchingCommits(prev => ({ ...prev, [repoId]: true }));

    try {
      // Call the server action to fetch commits
      const result = await fetchCommitsAction(repoId);

      if (result?.error) {
        console.error("Error fetching commits:", result.error);
        setError(result.error);
      } else {
        // Refresh preview counts after fetching
        const dateRange = getDateRange();
        if (dateRange) {
          const supabase = createClient();

          // Count total commits across all repos
          const { count } = await supabase
            .from("commits")
            .select("*", { count: "exact", head: true })
            .in("repository_id", repositories.map(r => r.id))
            .gte("committed_at", dateRange.start)
            .lte("committed_at", dateRange.end);

          // Count commits for this specific repo
          const { count: repoCount } = await supabase
            .from("commits")
            .select("*", { count: "exact", head: true })
            .eq("repository_id", repoId)
            .gte("committed_at", dateRange.start)
            .lte("committed_at", dateRange.end);

          setPreviewCounts(prev => prev ? {
            ...prev,
            commits: count || 0
          } : null);

          setRepoCommitCounts(prev => ({
            ...prev,
            [repoId]: repoCount || 0
          }));
        }
      }
    } catch (err) {
      console.error("Error fetching commits:", err);
    } finally {
      setFetchingCommits(prev => ({ ...prev, [repoId]: false }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedProject || !selectedAudience) {
      setError("Please select a project and audience");
      return;
    }

    const dateRange = getDateRange();
    if (!dateRange) {
      setError("Please select a valid time period");
      return;
    }

    if (previewCounts && previewCounts.notes === 0 && previewCounts.commits === 0 && previewCounts.todoistAddedOrUpdatedTasks === 0 && previewCounts.todoistCompletedTasks === 0) {
      setError("No notes, commits, or tasks found in this time period");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("project_id", selectedProject);
      formData.append("audience_id", selectedAudience);
      formData.append("period_start", dateRange.start);
      formData.append("period_end", dateRange.end);

      // Pass repository branches as JSON
      const repoBranches: Record<string, string> = {};
      repositories.forEach(repo => {
        repoBranches[repo.id] = repo.selected_branch;
      });
      formData.append("repository_branches", JSON.stringify(repoBranches));

      const result = await generateSummary(formData);

      if (result?.error) {
        setError(result.error);
        setIsGenerating(false);
      } else if (result?.summaryId) {
        // Redirect to the summary page
        router.push(`/protected/summaries/${result.summaryId}`);
      }
    } catch (err) {
      console.error("Error generating summary:", err);
      setError("Failed to generate summary");
      setIsGenerating(false);
    }
  }

  const canGenerate = selectedProject && selectedAudience && getDateRange() !== null;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Project Selection */}
      <div className="space-y-2">
        <Label htmlFor="project" className="font-mono">
          Project *
        </Label>
        <select
          id="project"
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          required
          disabled={isGenerating}
          className="w-full p-3 rounded-md border border-input bg-background text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
        >
          <option value="">Select a project</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
        {projects.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No projects found. Create a project first.
          </p>
        )}
      </div>

      {/* Time Period Selection */}
      <div className="space-y-3">
        <Label className="font-mono">Time Period *</Label>
        <div className="grid grid-cols-3 gap-2">
          <Button
            type="button"
            variant={timePeriod === "today" ? "default" : "outline"}
            onClick={() => setTimePeriod("today")}
            disabled={isGenerating}
            className="gap-2"
          >
            <Calendar className="h-4 w-4" />
            Today
          </Button>
          <Button
            type="button"
            variant={timePeriod === "this_week" ? "default" : "outline"}
            onClick={() => setTimePeriod("this_week")}
            disabled={isGenerating}
            className="gap-2"
          >
            <Calendar className="h-4 w-4" />
            This Week
          </Button>
          <Button
            type="button"
            variant={timePeriod === "this_month" ? "default" : "outline"}
            onClick={() => setTimePeriod("this_month")}
            disabled={isGenerating}
            className="gap-2"
          >
            <Calendar className="h-4 w-4" />
            This Month
          </Button>
        </div>

        <Button
          type="button"
          variant={timePeriod === "custom" ? "default" : "outline"}
          onClick={() => setTimePeriod("custom")}
          disabled={isGenerating}
          className="w-full gap-2"
        >
          <Calendar className="h-4 w-4" />
          Custom Date Range
        </Button>

        {timePeriod === "custom" && (
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="space-y-2">
              <Label htmlFor="start_date" className="text-xs font-mono">
                Start Date
              </Label>
              <input
                type="date"
                id="start_date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                required
                disabled={isGenerating}
                className="w-full p-2 rounded-md border border-input bg-background text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date" className="text-xs font-mono">
                End Date
              </Label>
              <input
                type="date"
                id="end_date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                required
                disabled={isGenerating}
                className="w-full p-2 rounded-md border border-input bg-background text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        )}
      </div>

      {/* Audience Selection */}
      <div className="space-y-2">
        <Label htmlFor="audience" className="font-mono">
          Audience *
        </Label>
        <select
          id="audience"
          value={selectedAudience}
          onChange={(e) => setSelectedAudience(e.target.value)}
          required
          disabled={isGenerating}
          className="w-full p-3 rounded-md border border-input bg-background text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
        >
          <option value="">Select an audience</option>
          {audiences.map((audience) => (
            <option key={audience.id} value={audience.id}>
              {audience.name}
            </option>
          ))}
        </select>
        {audiences.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No audiences found. Create an audience first.
          </p>
        )}
      </div>

      {/* Preview */}
      {selectedProject && previewCounts && (
        <div className="p-4 rounded-lg border bg-muted/30 space-y-2">
          <p className="text-sm font-mono font-semibold">Preview</p>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span className="font-mono">
                {loadingPreview ? "..." : previewCounts.notes} notes
              </span>
            </div>

            {repositories.length > 0 ? (
              repositories.map((repo) => (
                <div key={repo.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <GitBranch className="h-4 w-4 flex-shrink-0" />
                  <select
                    value={repo.selected_branch}
                    onChange={(e) => handleBranchChange(repo.id, e.target.value)}
                    disabled={isGenerating || loadingBranches[repo.id]}
                    className="text-xs px-1.5 py-0.5 rounded border border-input bg-background font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {loadingBranches[repo.id] ? (
                      <option>Loading...</option>
                    ) : (
                      repo.branches.map(branch => (
                        <option key={branch} value={branch}>{branch}</option>
                      ))
                    )}
                  </select>
                  <span className="font-mono">
                    {loadingPreview ? "..." : (repoCommitCounts[repo.id] || 0)} commits
                  </span>
                  <button
                    type="button"
                    onClick={() => fetchCommitsForRepo(repo.id)}
                    disabled={isGenerating || fetchingCommits[repo.id]}
                    className="p-1 hover:bg-muted rounded transition-colors disabled:opacity-50"
                  >
                    {fetchingCommits[repo.id] ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              ))
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <GitBranch className="h-4 w-4" />
                <span className="font-mono">
                  {loadingPreview ? "..." : previewCounts.commits} commits
                </span>
              </div>
            )}

            {(previewCounts.todoistAddedOrUpdatedTasks > 0 || previewCounts.todoistCompletedTasks > 0) && (
              <>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Sparkles className="h-4 w-4" />
                  <span className="font-mono">
                    {loadingPreview ? "..." : previewCounts.todoistAddedOrUpdatedTasks} tasks added/updated
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Sparkles className="h-4 w-4" />
                  <span className="font-mono">
                    {loadingPreview ? "..." : previewCounts.todoistCompletedTasks} tasks completed
                  </span>
                </div>
              </>
            )}
          </div>

          {previewCounts.notes === 0 && previewCounts.commits === 0 && previewCounts.todoistAddedOrUpdatedTasks === 0 && previewCounts.todoistCompletedTasks === 0 && (
            <p className="text-xs text-destructive">
              No work found in this time period
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Generate Button */}
      <Button
        type="submit"
        disabled={!canGenerate || isGenerating || (previewCounts?.notes === 0 && previewCounts?.commits === 0 && previewCounts?.todoistAddedOrUpdatedTasks === 0 && previewCounts?.todoistCompletedTasks === 0)}
        size="lg"
        className="gap-2"
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating Summary...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Generate Summary
          </>
        )}
      </Button>

      <p className="text-xs text-muted-foreground">
        This will use AI to create a summary from your notes, commits, and tasks. It may take 10-30 seconds.
      </p>
    </form>
  );
}
