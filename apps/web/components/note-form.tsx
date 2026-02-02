"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProjectHashtagInput } from "@/components/project-hashtag-input";
import { createNote, updateNote } from "@/app/protected/notes/actions";
import { Loader2 } from "lucide-react";

interface NoteFormProps {
  note?: {
    id: string;
    title: string | null;
    content: string;
    project_id: string;
  };
  projects: {
    id: string;
    name: string;
  }[];
}

export function NoteForm({ note, projects }: NoteFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isEditing = !!note;

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    const result = isEditing
      ? await updateNote(note.id, formData)
      : await createNote(formData);

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
        <Label htmlFor="title" className="font-mono">
          Title (optional)
        </Label>
        <Input
          id="title"
          name="title"
          defaultValue={note?.title || ""}
          placeholder="Optional - leave blank for quick notes"
          disabled={isSubmitting}
          className="font-mono"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="content" className="font-mono">
          Note *
        </Label>
        <ProjectHashtagInput
          defaultValue={note?.content}
          defaultProjectId={note?.project_id}
          projects={projects}
          placeholder="What did you work on? Type #projectname to assign to a project..."
          rows={12}
          required
          disabled={isSubmitting}
          autoFocus
        />
      </div>

      {error && (
        <div className="text-sm text-destructive">
          {error}
        </div>
      )}

      {success && (
        <div className="text-sm text-primary font-mono">
          Note updated!
        </div>
      )}

      <Button type="submit" disabled={isSubmitting} className="gap-2">
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {isEditing ? "Updating..." : "Creating..."}
          </>
        ) : (
          isEditing ? "Update Note" : "Create Note"
        )}
      </Button>
    </form>
  );
}
