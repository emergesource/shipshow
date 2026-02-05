"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function createCheckoutSession(formData: FormData) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: "Not authenticated" };
  }

  const priceId = formData.get("priceId") as string;
  if (!priceId) {
    return { error: "Price ID required" };
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { error: "No active session" };
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/stripe-create-checkout-session`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ priceId })
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return { error: result.error || "Failed to create checkout session" };
    }

    // Redirect to Stripe Checkout
    redirect(result.url);
  } catch (error) {
    // Next.js redirect() throws a NEXT_REDIRECT error to perform the redirect
    // We need to re-throw it so Next.js can handle it properly
    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
      throw error;
    }
    console.error("Error creating checkout session:", error);
    return { error: "Failed to create checkout session" };
  }
}

export async function createPortalSession() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: "Not authenticated" };
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { error: "No active session" };
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/stripe-create-portal-session`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return { error: result.error || "Failed to create portal session" };
    }

    // Redirect to Stripe Customer Portal
    redirect(result.url);
  } catch (error) {
    // Next.js redirect() throws a NEXT_REDIRECT error to perform the redirect
    // We need to re-throw it so Next.js can handle it properly
    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
      throw error;
    }
    console.error("Error creating portal session:", error);
    return { error: "Failed to create portal session" };
  }
}
