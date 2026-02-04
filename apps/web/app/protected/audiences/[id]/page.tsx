import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { AudienceForm } from "@/components/audience-form";
import { DeleteAudienceButton } from "@/components/delete-audience-button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = 'force-dynamic';

async function getUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  return data.claims;
}

async function getAudience(id: string) {
  const supabase = await createClient();

  const { data: audience } = await supabase
    .from("audiences")
    .select("*")
    .eq("id", id)
    .single();

  if (!audience) {
    notFound();
  }

  return audience;
}

export default async function AudiencePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  const { id } = await params;
  const audience = await getAudience(id);

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Header */}
      <div className="space-y-4">
        <Link
          href="/protected/audiences"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors font-mono"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Audiences
        </Link>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h1 className="font-mono text-4xl font-bold">{audience.name}</h1>
              {audience.is_system_template && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
                  Template
                </span>
              )}
            </div>
            <p className="text-xl text-muted-foreground">
              Edit audience details
            </p>
          </div>
          <DeleteAudienceButton audienceId={audience.id} />
        </div>
      </div>

      {/* Edit Form */}
      <Card className="p-8">
        <AudienceForm audience={audience} />
      </Card>

      {/* Metadata */}
      <Card className="p-6 bg-muted/30">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground font-mono">Created</span>
            <span className="font-mono">
              {new Date(audience.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric"
              })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground font-mono">Last updated</span>
            <span className="font-mono">
              {new Date(audience.updated_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric"
              })}
            </span>
          </div>
          {audience.is_system_template && (
            <div className="flex justify-between">
              <span className="text-muted-foreground font-mono">Type</span>
              <span className="font-mono">System Template</span>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
