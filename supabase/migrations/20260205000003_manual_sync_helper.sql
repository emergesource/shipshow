-- Helper query to manually update subscription status
-- Replace the values with actual data from your Stripe dashboard

-- First, find your Stripe customer ID from the Stripe dashboard
-- Then update your profile with subscription details

-- Example (replace with your actual values):
/*
UPDATE profiles
SET
  subscription_status = 'active',
  subscription_plan = 'individual',
  subscription_current_period_end = '2026-03-05 16:46:54+00', -- Replace with actual period end from Stripe
  summaries_used_this_period = 0,
  period_start = now()
WHERE id = '03424aa3-0de8-43a2-a43f-c2ed8022d2ec';
*/

-- To find the subscription end date, go to:
-- Stripe Dashboard → Customers → [Your Customer] → Subscriptions → Current period: [date]
