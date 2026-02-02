import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { ProjectForm } from "@/components/project-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export const dynamic = 'force-dynamic';

async function getUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  return data.claims;
}

export default async function NewProjectPage() {
  const user = await getUser();

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Header */}
      <div className="space-y-4">
        <Link
          href="/protected/projects"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors font-mono"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Projects
        </Link>
        <div className="space-y-2">
          <h1 className="font-mono text-4xl font-bold">New Project</h1>
          <p className="text-xl text-muted-foreground">
            Create a project to organize your notes and repositories
          </p>
        </div>
      </div>

      {/* Form */}
      <Card className="p-8">
        <ProjectForm />
      </Card>
    </div>
  );
}
