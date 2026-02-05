-- Backfill subscription fields for existing profiles that don't have them set
UPDATE profiles
SET
  subscription_status = COALESCE(subscription_status, 'free'),
  subscription_plan = COALESCE(subscription_plan, 'free'),
  summaries_used_this_period = COALESCE(summaries_used_this_period, 0),
  period_start = COALESCE(period_start, now())
WHERE
  subscription_status IS NULL
  OR subscription_plan IS NULL
  OR summaries_used_this_period IS NULL
  OR period_start IS NULL;
