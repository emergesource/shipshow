-- Add subscription fields to profiles table
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_plan text DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_current_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS summaries_used_this_period integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS period_start timestamptz DEFAULT now();

-- Create index for fast customer lookups
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id
  ON profiles(stripe_customer_id);

-- Create subscription events table for audit trail
CREATE TABLE IF NOT EXISTS subscription_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  stripe_event_id text UNIQUE,
  event_data jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on subscription_events
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;

-- Users can only read their own subscription events
CREATE POLICY "Users can view own subscription events"
  ON subscription_events FOR SELECT
  USING (auth.uid() = user_id);

-- Create index for event lookups
CREATE INDEX IF NOT EXISTS idx_subscription_events_user_id
  ON subscription_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_events_stripe_id
  ON subscription_events(stripe_event_id);
