"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";

function GitHubCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handleCallback() {
      const code = searchParams.get("code");
      const error = searchParams.get("error");

      if (error) {
        setStatus("error");
        setError(error === "access_denied" ? "GitHub authorization was denied" : error);
        return;
      }

      if (!code) {
        setStatus("error");
        setError("No authorization code received from GitHub");
        return;
      }

      try {
        // Get current session token
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error("Not authenticated");
        }

        // Call edge function to exchange code for token
        const response = await fetch(
          `${supabaseUrl}/functions/v1/github-oauth-callback?code=${code}`,
          {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${session.access_token}`,
              "Content-Type": "application/json"
            }
          }
        );

        const result = await response.json();

        if (!response.ok || result.error) {
          throw new Error(result.error || "Failed to connect GitHub");
        }

        setStatus("success");

        // Redirect to select page after 1 second
        setTimeout(() => {
          router.push("/protected/repositories/select");
        }, 1000);
      } catch (err) {
        console.error("Error in GitHub callback:", err);
        setStatus("error");
        setError(err instanceof Error ? err.message : "Failed to connect GitHub");
      }
    }

    handleCallback();
  }, [searchParams, router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="p-12 max-w-md space-y-6 text-center">
        {status === "loading" && (
          <>
            <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto" />
            <div className="space-y-2">
              <h2 className="font-mono text-2xl font-bold">Connecting GitHub...</h2>
              <p className="text-muted-foreground">
                Please wait while we complete the authorization
              </p>
            </div>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle className="h-16 w-16 text-primary mx-auto" />
            <div className="space-y-2">
              <h2 className="font-mono text-2xl font-bold">Connected!</h2>
              <p className="text-muted-foreground">
                Redirecting you to select repositories...
              </p>
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="h-16 w-16 text-destructive mx-auto" />
            <div className="space-y-2">
              <h2 className="font-mono text-2xl font-bold">Connection Failed</h2>
              <p className="text-muted-foreground">
                {error || "Something went wrong"}
              </p>
            </div>
            <div className="flex gap-2 justify-center pt-4">
              <Link href="/protected/repositories/connect">
                <Button>Try Again</Button>
              </Link>
              <Link href="/protected/repositories">
                <Button variant="outline">Back to Repositories</Button>
              </Link>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

export default function GitHubCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="p-12 max-w-md space-y-6 text-center">
          <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto" />
          <div className="space-y-2">
            <h2 className="font-mono text-2xl font-bold">Loading...</h2>
            <p className="text-muted-foreground">Please wait</p>
          </div>
        </Card>
      </div>
    }>
      <GitHubCallbackContent />
    </Suspense>
  );
}
