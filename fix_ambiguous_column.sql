-- Fix ambiguous column reference in increment_usage function
-- The issue is in the ON CONFLICT DO UPDATE clause where feature_key is ambiguous

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
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

