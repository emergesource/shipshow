"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { regenerateSummary } from "@/app/protected/summaries/actions";
import { RefreshCw, Loader2 } from "lucide-react";

interface RegenerateSummaryButtonProps {
  summaryId: string;
}

export function RegenerateSummaryButton({ summaryId }: RegenerateSummaryButtonProps) {
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRegenerate() {
    setIsRegenerating(true);
    setError(null);

    try {
      const result = await regenerateSummary(summaryId);

      if (result?.error) {
        setError(result.error);
        setIsRegenerating(false);
        setShowConfirm(false);
      } else {
        // Success - page will auto-refresh from revalidatePath
        setIsRegenerating(false);
        setShowConfirm(false);
      }
    } catch (err) {
      console.error("Error regenerating summary:", err);
      setError("Failed to regenerate summary");
      setIsRegenerating(false);
      setShowConfirm(false);
    }
  }

  if (showConfirm) {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="default"
          size="sm"
          onClick={handleRegenerate}
          disabled={isRegenerating}
          className="gap-2"
        >
          {isRegenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Regenerating...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              Confirm Regenerate
            </>
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowConfirm(false)}
          disabled={isRegenerating}
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowConfirm(true)}
        className="gap-2"
      >
        <RefreshCw className="h-4 w-4" />
        Regenerate
      </Button>
      {error && (
        <div className="text-xs text-destructive">
          {error}
        </div>
      )}
    </>
  );
}
