"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { createQuickNote } from "@/app/protected/actions";
import { Loader2 } from "lucide-react";

export function QuickNoteForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Auto-focus the textarea on mount
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
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
      <textarea
        ref={textareaRef}
        name="content"
        placeholder="What did you work on today? No formatting needed, just write..."
        className="w-full min-h-[120px] p-4 rounded-lg border border-input bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
        disabled={isSubmitting}
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
