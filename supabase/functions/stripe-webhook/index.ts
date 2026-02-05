import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.38.0';
import Stripe from 'npm:stripe@14.11.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
});

const cryptoProvider = Stripe.createSubtleCryptoProvider();

serve(async (req) => {
  const signature = req.headers.get('Stripe-Signature');
  const body = await req.text();

  if (!signature) {
    return new Response('No signature', { status: 400 });
  }

  try {
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET not configured');
    }

    // Verify webhook signature
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      cryptoProvider
    );

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Webhook event received:', event.type);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;

        if (!userId) {
          console.error('No user ID in session metadata');
          break;
        }

        // For subscriptions, wait for subscription event
        if (session.mode === 'subscription') {
          console.log('Subscription checkout completed, waiting for subscription.created event');
        }

        // Log event
        await supabase.from('subscription_events').insert({
          user_id: userId,
          event_type: event.type,
          stripe_event_id: event.id,
          event_data: session,
        });
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Find user by customer ID
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (!profile) {
          console.error('No user found for customer:', customerId);
          break;
        }

        // Update subscription status
        await supabase
          .from('profiles')
          .update({
            subscription_status: subscription.status,
            subscription_plan: 'individual', // Determine from price ID if multiple plans
            subscription_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          })
          .eq('id', profile.id);

        // Log event
        await supabase.from('subscription_events').insert({
          user_id: profile.id,
          event_type: event.type,
          stripe_event_id: event.id,
          event_data: subscription,
        });

        console.log('Subscription updated for user:', profile.id);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (!profile) {
          console.error('No user found for customer:', customerId);
          break;
        }

        // Revert to free tier
        await supabase
          .from('profiles')
          .update({
            subscription_status: 'free',
            subscription_plan: 'free',
            subscription_current_period_end: null,
          })
          .eq('id', profile.id);

        // Log event
        await supabase.from('subscription_events').insert({
          user_id: profile.id,
          event_type: event.type,
          stripe_event_id: event.id,
          event_data: subscription,
        });

        console.log('Subscription deleted for user:', profile.id);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (!profile) break;

        // Update status to past_due
        await supabase
          .from('profiles')
          .update({ subscription_status: 'past_due' })
          .eq('id', profile.id);

        // Log event
        await supabase.from('subscription_events').insert({
          user_id: profile.id,
          event_type: event.type,
          stripe_event_id: event.id,
          event_data: invoice,
        });

        console.log('Payment failed for user:', profile.id);
        break;
      }

      default:
        console.log('Unhandled event type:', event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
