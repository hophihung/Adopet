-- Fix subscription issues and set default to free plan
-- Run this in Supabase SQL Editor

-- 1. Fix your current subscription (replace with your actual profile_id)
UPDATE public.subscriptions 
SET 
  plan = 'free',
  status = 'active',
  start_date = now(),
  end_date = null,
  updated_at = now()
WHERE profile_id = 'a41f5edb-680c-409c-be37-6bd3d...' -- Replace with your actual profile_id
AND status = 'canceled';

-- 2. Create function to auto-create free subscription for new users
CREATE OR REPLACE FUNCTION auto_create_free_subscription()
RETURNS TRIGGER AS $$
BEGIN
  -- Tạo free subscription cho user mới
  INSERT INTO public.subscriptions (profile_id, plan, status, start_date)
  VALUES (NEW.id, 'free', 'active', now())
  ON CONFLICT (profile_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create trigger for auto-free-subscription
DROP TRIGGER IF EXISTS trigger_auto_create_free_subscription ON public.profiles;
CREATE TRIGGER trigger_auto_create_free_subscription
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_free_subscription();

-- 4. Create free subscriptions for existing users who don't have any
INSERT INTO public.subscriptions (profile_id, plan, status, start_date)
SELECT 
  p.id,
  'free',
  'active',
  now()
FROM public.profiles p
LEFT JOIN public.subscriptions s ON p.id = s.profile_id
WHERE s.profile_id IS NULL;

-- 5. Fix the increment_usage function (if not already fixed)
CREATE OR REPLACE FUNCTION increment_usage(
  user_profile_id uuid,
  feature_key text,
  increment_by integer DEFAULT 1
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.usage_tracking (user_id, feature_key, feature_count)
  VALUES (user_profile_id, increment_usage.feature_key, increment_by)
  ON CONFLICT (user_id, feature_key, reset_date)
  DO UPDATE SET 
    feature_count = public.usage_tracking.feature_count + EXCLUDED.feature_count,
    created_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Remove the pet_created tracking trigger (not needed)
DROP TRIGGER IF EXISTS trigger_track_pet_creation ON public.pets;
DROP FUNCTION IF EXISTS track_pet_creation();
