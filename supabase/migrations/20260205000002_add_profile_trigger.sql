-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, subscription_status, subscription_plan, summaries_used_this_period, period_start)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    'free',
    'free',
    0,
    now()
  );
  RETURN NEW;
END;
$$;

-- Trigger to call function on user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill profiles for existing users who don't have one
INSERT INTO public.profiles (id, name, subscription_status, subscription_plan, summaries_used_this_period, period_start)
SELECT
  id,
  COALESCE(raw_user_meta_data->>'name', email) as name,
  'free',
  'free',
  0,
  now()
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;
