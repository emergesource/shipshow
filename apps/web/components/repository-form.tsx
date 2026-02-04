"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { updateRepository, fetchGitHubBranches } from "@/app/protected/repositories/actions";
import { Loader2 } from "lucide-react";

interface RepositoryFormProps {
  repository: {
    id: string;
    name: string;
    owner: string;
    full_name: string;
    default_branch: string | null;
  };
  userProjects: Array<{ id: string; name: string }>;
  linkedProjectIds: string[];
}

export function RepositoryForm({
  repository,
  userProjects,
  linkedProjectIds
}: RepositoryFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(
    new Set(linkedProjectIds)
  );
  const [branches, setBranches] = useState<string[]>([repository.default_branch || "main"]);
  const [loadingBranches, setLoadingBranches] = useState(true);

  useEffect(() => {
    async function loadBranches() {
      setLoadingBranches(true);
      const result = await fetchGitHubBranches(repository.id);
      if (result.branches) {
        setBranches(result.branches);
      }
      setLoadingBranches(false);
    }

    loadBranches();
  }, [repository.id]);

  function toggleProject(projectId: string) {
    const newSet = new Set(selectedProjects);
    if (newSet.has(projectId)) {
      newSet.delete(projectId);
    } else {
      newSet.add(projectId);
    }
    setSelectedProjects(newSet);
  }

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    // Add selected projects to formData
    selectedProjects.forEach(projectId => {
      formData.append("project_ids", projectId);
    });

    const result = await updateRepository(repository.id, formData);

    if (result?.error) {
      setError(result.error);
      setIsSubmitting(false);
    } else if (result?.success) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
      setIsSubmitting(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name" className="font-mono">
          Repository
        </Label>
        <Input
          id="name"
          value={repository.full_name}
          disabled
          className="font-mono bg-muted"
        />
        <p className="text-xs text-muted-foreground">
          Repository name cannot be changed
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="default_branch" className="font-mono">
          Default Branch
        </Label>
        <select
          id="default_branch"
          name="default_branch"
          defaultValue={repository.default_branch || "main"}
          disabled={isSubmitting || loadingBranches}
          className="w-full p-3 rounded-md border border-input bg-background text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
        >
          {loadingBranches ? (
            <option>Loading branches...</option>
          ) : (
            branches.map(branch => (
              <option key={branch} value={branch}>{branch}</option>
            ))
          )}
        </select>
        <p className="text-xs text-muted-foreground">
          Select the branch to use for fetching commits
        </p>
      </div>

      <div className="space-y-3">
        <Label className="font-mono">Projects</Label>
        <p className="text-xs text-muted-foreground">
          Select which projects this repository belongs to
        </p>
        <div className="space-y-2">
          {userProjects.length > 0 ? (
            userProjects.map(project => (
              <div key={project.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`project-${project.id}`}
                  checked={selectedProjects.has(project.id)}
                  onCheckedChange={() => toggleProject(project.id)}
                  disabled={isSubmitting}
                />
                <label
                  htmlFor={`project-${project.id}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {project.name}
                </label>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              No projects available. Create a project first.
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="text-sm text-destructive">
          {error}
        </div>
      )}

      {success && (
        <div className="text-sm text-primary font-mono">
          Repository updated!
        </div>
      )}

      <Button type="submit" disabled={isSubmitting} className="gap-2">
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Updating...
          </>
        ) : (
          "Update Repository"
        )}
      </Button>
    </form>
  );
}
