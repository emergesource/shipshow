import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, Users, Sparkles } from "lucide-react";
import { SYSTEM_AUDIENCE_TEMPLATES } from "@/lib/audiences";
import { addSystemAudience } from "./actions";

export const dynamic = 'force-dynamic';

async function getUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  return data.claims;
}

async function getAudiences() {
  const supabase = await createClient();

  const { data: audiences } = await supabase
    .from("audiences")
    .select("*")
    .order("created_at", { ascending: false });

  return audiences || [];
}

export default async function AudiencesPage() {
  const user = await getUser();
  const audiences = await getAudiences();

  // Get IDs of system templates already added
  const addedTemplateIds = audiences
    .filter(a => a.system_template_id)
    .map(a => a.system_template_id);

  // Filter available templates
  const availableTemplates = SYSTEM_AUDIENCE_TEMPLATES.filter(
    t => !addedTemplateIds.includes(t.id)
  );

  async function handleAddTemplate(templateId: string) {
    "use server";
    await addSystemAudience(templateId);
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="font-mono text-4xl font-bold">Audiences</h1>
          <p className="text-xl text-muted-foreground">
            Define who your updates are for
          </p>
        </div>
        <Link href="/protected/audiences/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Custom Audience
          </Button>
        </Link>
      </div>

      {/* System Templates Section */}
      {availableTemplates.length > 0 && (
        <Card className="p-6 space-y-4 bg-primary/5 border-primary/20">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="font-mono text-lg font-semibold">Quick Add Common Audiences</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Add pre-defined audiences with one click. You can customize them after adding.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {availableTemplates.map((template) => (
              <form key={template.id} action={handleAddTemplate.bind(null, template.id)}>
                <Card className="p-4 space-y-3 hover:border-primary/50 transition-colors h-full">
                  <div className="space-y-1">
                    <h3 className="font-mono font-semibold">{template.name}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {template.description}
                    </p>
                  </div>
                  <Button type="submit" size="sm" variant="outline" className="w-full gap-1">
                    <Plus className="h-3 w-3" />
                    Add {template.name}
                  </Button>
                </Card>
              </form>
            ))}
          </div>
        </Card>
      )}

      {/* User's Audiences Grid */}
      {audiences.length > 0 ? (
        <div>
          <h2 className="font-mono text-xl font-semibold mb-4">Your Audiences</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {audiences.map((audience) => (
              <Link key={audience.id} href={`/protected/audiences/${audience.id}`}>
                <Card className="p-6 space-y-4 hover:border-primary/50 transition-colors h-full">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <Users className="h-6 w-6 text-primary" />
                      {audience.is_system_template && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                          Template
                        </span>
                      )}
                    </div>
                    <h3 className="font-mono font-semibold text-xl">{audience.name}</h3>
                    {audience.description && (
                      <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3">
                        {audience.description}
                      </p>
                    )}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <Card className="p-12 text-center space-y-4">
          <Users className="h-12 w-12 text-muted-foreground mx-auto" />
          <div className="space-y-2">
            <h3 className="font-mono font-semibold text-xl">No audiences yet</h3>
            <p className="text-muted-foreground">
              Add a system template or create a custom audience to get started
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
