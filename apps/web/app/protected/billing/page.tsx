import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, CreditCard, Zap } from "lucide-react";
import { createCheckoutSession, createPortalSession } from "./actions";

export const dynamic = 'force-dynamic';

async function getUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  return data.claims;
}

async function getSubscriptionInfo() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_status, subscription_plan, subscription_current_period_end, summaries_used_this_period")
    .eq("id", user.id)
    .single();

  return profile;
}

export default async function BillingPage() {
  const user = await getUser();
  const subscription = await getSubscriptionInfo();

  const isActive = subscription?.subscription_status === 'active';
  const isFree = !isActive || subscription?.subscription_plan === 'free';

  const TIER_LIMITS: Record<string, number> = {
    free: 5,
    individual: 30
  };
  const limit = TIER_LIMITS[subscription?.subscription_plan || 'free'];
  const used = subscription?.summaries_used_this_period || 0;

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="space-y-2">
        <h1 className="font-mono text-4xl font-bold">Billing</h1>
        <p className="text-muted-foreground">Manage your subscription and usage</p>
      </div>

      {/* Current Plan */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-mono font-semibold text-lg">Current Plan</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {isFree ? 'Free' : 'Individual'} - {limit} summaries per {isFree ? 'month' : 'billing period'}
              </p>
            </div>
            {isActive && (
              <form action={createPortalSession}>
                <Button variant="outline" size="sm">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Manage Subscription
                </Button>
              </form>
            )}
          </div>

          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground font-mono">Usage this period</span>
              <span className="font-mono text-lg">
                {used} / {limit}
              </span>
            </div>
            <div className="mt-2 w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${Math.min((used / limit) * 100, 100)}%` }}
              />
            </div>
          </div>

          {subscription?.subscription_current_period_end && (
            <p className="text-xs text-muted-foreground">
              Your limit resets on {new Date(subscription.subscription_current_period_end).toLocaleDateString()}
            </p>
          )}
        </div>
      </Card>

      {/* Upgrade Options */}
      {isFree && (
        <div className="space-y-4">
          <h3 className="font-mono text-xl font-semibold">Upgrade to Individual</h3>
          <Card className="p-6">
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-4xl font-bold">$12</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Perfect for individuals tracking their own work
                  </p>
                </div>
                <form action={createCheckoutSession}>
                  <input type="hidden" name="priceId" value={process.env.NEXT_PUBLIC_STRIPE_INDIVIDUAL_PRICE_ID} />
                  <Button size="lg" className="gap-2">
                    <Zap className="h-4 w-4" />
                    Upgrade Now
                  </Button>
                </form>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-sm">30 summaries per month</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-sm">Unlimited projects & audiences</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-sm">GitHub & Todoist integrations</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-sm">All output channels (Email, Twitter, LinkedIn)</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
