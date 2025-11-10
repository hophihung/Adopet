-- =====================================================
-- FIX ensure_seller_has_subscription TO SYNC BOTH plan AND plan_id
-- Sửa function để insert cả plan (text) và plan_id (uuid) để đồng bộ với UI
-- =====================================================

-- Sửa function ensure_seller_has_subscription để insert cả plan (text) và plan_id (uuid)
CREATE OR REPLACE FUNCTION ensure_seller_has_subscription(user_profile_id uuid)
RETURNS void AS $$
DECLARE
  free_plan_id uuid;
  free_plan_name text;
  existing_subscription uuid;
BEGIN
  -- Lấy ID và name của free plan
  SELECT id, name INTO free_plan_id, free_plan_name
  FROM public.subscription_plans
  WHERE name = 'free' AND is_active = true
  LIMIT 1;

  -- Kiểm tra xem đã có subscription chưa
  SELECT id INTO existing_subscription
  FROM public.subscriptions
  WHERE profile_id = user_profile_id
  LIMIT 1;

  -- Nếu chưa có subscription và có free plan, tạo subscription mới với cả plan và plan_id
  IF existing_subscription IS NULL AND free_plan_id IS NOT NULL THEN
    INSERT INTO public.subscriptions (
      profile_id,
      plan,
      plan_id,
      status,
      billing_cycle,
      start_date
    )
    VALUES (
      user_profile_id,
      free_plan_name,
      free_plan_id,
      'active',
      'monthly',
      now()
    )
    ON CONFLICT (profile_id) DO UPDATE
    SET 
      plan = EXCLUDED.plan,
      plan_id = EXCLUDED.plan_id,
      status = 'active',
      updated_at = now();
  -- Nếu đã có subscription nhưng thiếu plan hoặc plan_id, cập nhật
  ELSIF existing_subscription IS NOT NULL AND free_plan_id IS NOT NULL THEN
    UPDATE public.subscriptions
    SET 
      plan = COALESCE(plan, free_plan_name),
      plan_id = COALESCE(plan_id, free_plan_id),
      status = 'active',
      updated_at = now()
    WHERE profile_id = user_profile_id
      AND (plan IS NULL OR plan_id IS NULL);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMPLETED! 🎉
-- - Function ensure_seller_has_subscription giờ insert/cập nhật cả plan (text) và plan_id (uuid)
-- - Đảm bảo đồng bộ với UI
-- =====================================================

