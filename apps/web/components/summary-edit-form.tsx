"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { updateSummary } from "@/app/protected/summaries/actions";
import { Loader2, Save } from "lucide-react";

interface SummaryEditFormProps {
  summary: {
    id: string;
    text: string;
  };
}

export function SummaryEditForm({ summary }: SummaryEditFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [text, setText] = useState(summary.text);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (text === summary.text) {
      return; // No changes
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const formData = new FormData();
      formData.append("text", text);

      const result = await updateSummary(summary.id, formData);

      if (result?.error) {
        setError(result.error);
      } else if (result?.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 2000);
      }
    } catch (err) {
      console.error("Error updating summary:", err);
      setError("Failed to update summary");
    } finally {
      setIsSubmitting(false);
    }
  }

  const hasChanges = text !== summary.text;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="text" className="font-mono">
          Summary Text
        </Label>
        <textarea
          id="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={12}
          disabled={isSubmitting}
          className="w-full p-4 rounded-md border border-input bg-background text-foreground leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
        />
        <p className="text-xs text-muted-foreground">
          You can edit the AI-generated summary to refine the message
        </p>
      </div>

      {error && (
        <div className="text-sm text-destructive">
          {error}
        </div>
      )}

      {success && (
        <div className="text-sm text-primary font-mono">
          Summary updated!
        </div>
      )}

      <Button
        type="submit"
        disabled={!hasChanges || isSubmitting}
        className="gap-2"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="h-4 w-4" />
            Save Changes
          </>
        )}
      </Button>
    </form>
  );
}
