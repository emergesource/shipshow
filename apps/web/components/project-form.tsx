"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createProject, updateProject } from "@/app/protected/projects/actions";
import { fetchTodoistProjects } from "@/app/protected/integrations/todoist/actions";
import { Loader2, ExternalLink } from "lucide-react";
import Link from "next/link";

interface ProjectFormProps {
  project?: {
    id: string;
    name: string;
    description: string | null;
    todoist_project_id: string | null;
  };
  hasTodoistConnection?: boolean;
}

export function ProjectForm({ project, hasTodoistConnection }: ProjectFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [todoistProjects, setTodoistProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingTodoist, setLoadingTodoist] = useState(false);
  const [selectedTodoistProject, setSelectedTodoistProject] = useState(project?.todoist_project_id || "");

  const isEditing = !!project;

  // Sync state with prop changes (prevents "wobbly" behavior after form submission)
  useEffect(() => {
    setSelectedTodoistProject(project?.todoist_project_id || "");
  }, [project?.todoist_project_id]);

  // Fetch Todoist projects if connected
  useEffect(() => {
    async function loadTodoistProjects() {
      if (!hasTodoistConnection) return;

      setLoadingTodoist(true);
      const result = await fetchTodoistProjects();

      if (result.projects) {
        setTodoistProjects(result.projects);
      }

      setLoadingTodoist(false);
    }

    loadTodoistProjects();
  }, [hasTodoistConnection]);

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    const result = isEditing
      ? await updateProject(project.id, formData)
      : await createProject(formData);

    if (result?.error) {
      setError(result.error);
      setIsSubmitting(false);
    } else if (result?.success) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
      setIsSubmitting(false);
    }
    // If creating, redirect happens automatically in the action
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name" className="font-mono">
          Project Name *
        </Label>
        <Input
          id="name"
          name="name"
          defaultValue={project?.name}
          placeholder="My Awesome Project"
          required
          disabled={isSubmitting}
          className="font-mono"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="font-mono">
          Description
        </Label>
        <textarea
          id="description"
          name="description"
          defaultValue={project?.description || ""}
          placeholder="What is this project about?"
          rows={4}
          disabled={isSubmitting}
          className="w-full p-3 rounded-md border border-input bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
        />
        <p className="text-xs text-muted-foreground">
          Optional: Add a description to help remember what this project is for
        </p>
      </div>

      {/* Todoist Integration */}
      {hasTodoistConnection && (
        <div className="space-y-2">
          <Label htmlFor="todoist_project_id" className="font-mono">
            Todoist Project
          </Label>
          {loadingTodoist ? (
            <div className="w-full p-3 rounded-md border border-input bg-muted text-muted-foreground font-mono">
              Loading Todoist projects...
            </div>
          ) : (
            <select
              id="todoist_project_id"
              name="todoist_project_id"
              value={selectedTodoistProject}
              onChange={(e) => setSelectedTodoistProject(e.target.value)}
              disabled={isSubmitting}
              className="w-full p-3 rounded-md border border-input bg-background text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            >
              <option value="">No Todoist project linked</option>
              {todoistProjects.map(tp => (
                <option key={tp.id} value={tp.id}>{tp.name}</option>
              ))}
            </select>
          )}
          <p className="text-xs text-muted-foreground">
            Link a Todoist project to include tasks in your summaries
          </p>
        </div>
      )}

      {!hasTodoistConnection && isEditing && (
        <div className="p-4 border border-dashed rounded-md space-y-2">
          <p className="text-sm text-muted-foreground">
            Connect Todoist to include tasks in your summaries
          </p>
          <Link href="/protected/integrations">
            <Button type="button" variant="outline" size="sm" className="gap-2">
              <ExternalLink className="h-3.5 w-3.5" />
              Go to Integrations
            </Button>
          </Link>
        </div>
      )}

      {error && (
        <div className="text-sm text-destructive">
          {error}
        </div>
      )}

      {success && (
        <div className="text-sm text-primary font-mono">
          Project updated!
        </div>
      )}

      <Button type="submit" disabled={isSubmitting} className="gap-2">
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {isEditing ? "Updating..." : "Creating..."}
          </>
        ) : (
          isEditing ? "Update Project" : "Create Project"
        )}
      </Button>
    </form>
  );
}
