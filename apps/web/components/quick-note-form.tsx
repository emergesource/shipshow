"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ProjectHashtagInput } from "@/components/project-hashtag-input";
import { createQuickNote } from "@/app/protected/actions";
import { Loader2 } from "lucide-react";

interface QuickNoteFormProps {
  projects: {
    id: string;
    name: string;
  }[];
}

export function QuickNoteForm({ projects }: QuickNoteFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    // Submit on Cmd/Ctrl + Enter
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      formRef.current?.requestSubmit();
    }
  }

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    const result = await createQuickNote(formData);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
      formRef.current?.reset();
      // Clear success message after 2 seconds
      setTimeout(() => setSuccess(false), 2000);
    }

    setIsSubmitting(false);
  }

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-4">
      <ProjectHashtagInput
        projects={projects}
        placeholder="What did you work on today? Type #projectname to assign..."
        rows={6}
        required
        disabled={isSubmitting}
        autoFocus
        onKeyDown={handleKeyDown}
      />

      {error && (
        <div className="text-sm text-destructive">
          {error}
        </div>
      )}

      {success && (
        <div className="text-sm text-primary font-mono">
          Note saved!
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button type="submit" disabled={isSubmitting} className="gap-2">
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save note"
          )}
        </Button>
        <p className="text-xs text-muted-foreground font-mono">
          Cmd/Ctrl + Enter to save
        </p>
      </div>
    </form>
  );
}
