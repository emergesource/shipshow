import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { NoteForm } from "@/components/note-form";
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

export default async function NewNotePage() {
  const user = await getUser();
  const projects = await getProjects();

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <div className="space-y-4">
        <Link
          href="/protected/notes"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors font-mono"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Notes
        </Link>
        <div className="space-y-2">
          <h1 className="font-mono text-4xl font-bold">New Note</h1>
          <p className="text-xl text-muted-foreground">
            Capture what you worked on - no structure required
          </p>
        </div>
      </div>

      {/* Form */}
      <Card className="p-8">
        <NoteForm projects={projects} />
      </Card>
    </div>
  );
}
