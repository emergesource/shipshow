"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createProject, updateProject } from "@/app/protected/projects/actions";
import { Loader2 } from "lucide-react";

interface ProjectFormProps {
  project?: {
    id: string;
    name: string;
    description: string | null;
  };
}

export function ProjectForm({ project }: ProjectFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isEditing = !!project;

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
