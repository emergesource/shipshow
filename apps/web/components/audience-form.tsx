"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createAudience, updateAudience } from "@/app/protected/audiences/actions";
import { Loader2 } from "lucide-react";

interface AudienceFormProps {
  audience?: {
    id: string;
    name: string;
    description: string | null;
  };
}

export function AudienceForm({ audience }: AudienceFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isEditing = !!audience;

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    const result = isEditing
      ? await updateAudience(audience.id, formData)
      : await createAudience(formData);

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
          Audience Name *
        </Label>
        <Input
          id="name"
          name="name"
          defaultValue={audience?.name}
          placeholder="e.g., CTO, Client, Manager"
          required
          disabled={isSubmitting}
          className="font-mono"
        />
        <p className="text-xs text-muted-foreground">
          Who is this update for?
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="font-mono">
          Description
        </Label>
        <textarea
          id="description"
          name="description"
          defaultValue={audience?.description || ""}
          placeholder="Technical leadership focused on architecture and engineering strategy"
          rows={4}
          disabled={isSubmitting}
          className="w-full p-3 rounded-md border border-input bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
        />
        <p className="text-xs text-muted-foreground">
          Help the AI understand this audience&apos;s interests and level of detail
        </p>
      </div>

      {error && (
        <div className="text-sm text-destructive">
          {error}
        </div>
      )}

      {success && (
        <div className="text-sm text-primary font-mono">
          Audience updated!
        </div>
      )}

      <Button type="submit" disabled={isSubmitting} className="gap-2">
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {isEditing ? "Updating..." : "Creating..."}
          </>
        ) : (
          isEditing ? "Update Audience" : "Create Audience"
        )}
      </Button>
    </form>
  );
}
