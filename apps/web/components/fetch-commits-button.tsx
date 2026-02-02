"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { fetchCommitsAction } from "@/app/protected/repositories/actions";
import { Loader2, RefreshCw } from "lucide-react";

interface FetchCommitsButtonProps {
  repositoryId: string;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
}

export function FetchCommitsButton({
  repositoryId,
  size = "default",
  variant = "outline"
}: FetchCommitsButtonProps) {
  const [isFetching, setIsFetching] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFetch() {
    setIsFetching(true);
    setMessage(null);
    setError(null);

    const result = await fetchCommitsAction(repositoryId);

    if (result.error) {
      setError(result.error);
    } else if (result.success) {
      setMessage(`Fetched ${result.count} commit${result.count === 1 ? "" : "s"}`);
      setTimeout(() => setMessage(null), 3000);
    }

    setIsFetching(false);
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={handleFetch}
        disabled={isFetching}
        size={size}
        variant={variant}
        className="gap-2"
      >
        {isFetching ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Fetching...
          </>
        ) : (
          <>
            <RefreshCw className="h-4 w-4" />
            Fetch Commits
          </>
        )}
      </Button>
      {message && (
        <span className="text-sm text-primary font-mono">{message}</span>
      )}
      {error && (
        <span className="text-sm text-destructive">{error}</span>
      )}
    </div>
  );
}
