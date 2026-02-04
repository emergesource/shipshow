import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { SummaryForm } from "@/components/summary-form";
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

async function getProjects() {
  const supabase = await createClient();

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name")
    .order("name", { ascending: true });

  return projects || [];
}

async function getAudiences() {
  const supabase = await createClient();

  const { data: audiences } = await supabase
    .from("audiences")
    .select("id, name, description")
    .order("name", { ascending: true });

  return audiences || [];
}

export default async function NewSummaryPage() {
  const user = await getUser();
  const projects = await getProjects();
  const audiences = await getAudiences();

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <div className="space-y-4">
        <Link
          href="/protected/summaries"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors font-mono"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Summaries
        </Link>
        <div className="space-y-2">
          <h1 className="font-mono text-4xl font-bold">Generate Summary</h1>
          <p className="text-xl text-muted-foreground">
            Create an AI-generated summary from your project work
          </p>
        </div>
      </div>

      {/* Form */}
      <Card className="p-8">
        <SummaryForm projects={projects} audiences={audiences} />
      </Card>
    </div>
  );
}
