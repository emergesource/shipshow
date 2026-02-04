import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { checkGitHubConnection } from "@/app/protected/repositories/actions";
import Link from "next/link";
import { ArrowLeft, GitBranch } from "lucide-react";

export const dynamic = 'force-dynamic';

async function getUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  return data.claims;
}

export default async function ConnectRepositoryPage() {
  const user = await getUser();
  const { connected } = await checkGitHubConnection();

  // If already connected, redirect to select page
  if (connected) {
    redirect("/protected/repositories/select");
  }

  // Generate GitHub OAuth URL
  const githubClientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redirectUri = `${appUrl}/protected/repositories/callback`;
  const scope = "repo";
  const state = Math.random().toString(36).substring(7); // Simple state for CSRF protection

  const githubOAuthUrl = `https://github.com/login/oauth/authorize?client_id=${githubClientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}`;

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <div className="space-y-4">
        <Link
          href="/protected/repositories"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors font-mono"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Repositories
        </Link>
        <div className="space-y-2">
          <h1 className="font-mono text-4xl font-bold">Connect Repository</h1>
          <p className="text-xl text-muted-foreground">
            Connect your GitHub account to import repositories
          </p>
        </div>
      </div>

      {/* GitHub OAuth Card */}
      <Card className="p-8 space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-lg">
              <GitBranch className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h2 className="font-mono text-2xl font-bold">Connect with GitHub</h2>
              <p className="text-muted-foreground">
                Recommended method - automatically fetch commits
              </p>
            </div>
          </div>

          <div className="space-y-3 pl-14">
            <p className="text-foreground leading-relaxed">
              Connecting with GitHub allows Shipshow to:
            </p>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Access your repositories and commit history</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Automatically fetch new commits as proof of work</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Generate accurate summaries based on your actual commits</span>
              </li>
            </ul>
          </div>

          {/* Organization Access Guidance */}
          <div className="pl-14 pt-4 border-t space-y-2">
            <p className="text-sm font-semibold text-foreground">
              Accessing Organization Repositories
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              During authorization, GitHub will show your organizations. Click &quot;Grant&quot; next to each
              organization to access their repositories. Some organizations require admin approval
              before apps can access their repos.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 pl-14">
          <a href={githubOAuthUrl}>
            <Button size="lg" className="gap-2">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              Connect with GitHub
            </Button>
          </a>
          <div className="text-xs text-muted-foreground">
            <p>Secure OAuth authentication</p>
            <p>Your credentials are never stored</p>
          </div>
        </div>
      </Card>

      {/* Manual Entry (Future) */}
      <Card className="p-8 space-y-4 bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-muted rounded-lg">
            <GitBranch className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h2 className="font-mono text-2xl font-bold">Manual Entry</h2>
            <p className="text-muted-foreground">
              Add repository information manually
            </p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground pl-14">
          Coming soon: Manually add repositories from GitLab, Bitbucket, or other providers.
          For now, use GitHub OAuth for the best experience.
        </p>
      </Card>
    </div>
  );
}
