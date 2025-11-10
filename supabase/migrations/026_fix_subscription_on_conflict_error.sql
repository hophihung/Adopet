-- =====================================================
-- FIX SUBSCRIPTION ON CONFLICT ERROR
-- Sửa lỗi "there is no unique or exclusion constraint matching the ON CONFLICT specification"
-- =====================================================

-- 1. Đảm bảo bảng subscriptions có unique constraint trên profile_id
-- (Chỉ tạo nếu chưa có)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'subscriptions_profile_id_key' 
    AND conrelid = 'public.subscriptions'::regclass
  ) THEN
    -- Tạo unique constraint trên profile_id
    ALTER TABLE public.subscriptions 
    ADD CONSTRAINT subscriptions_profile_id_key UNIQUE (profile_id);
  END IF;
END $$;

-- 2. Tạo function ensure_seller_has_subscription (nếu chưa có)
CREATE OR REPLACE FUNCTION ensure_seller_has_subscription(user_profile_id uuid)
RETURNS void AS $$
DECLARE
  free_plan_id uuid;
  existing_subscription uuid;
BEGIN
  -- Lấy ID của free plan
  SELECT id INTO free_plan_id
  FROM public.subscription_plans
  WHERE name = 'free'
  LIMIT 1;

  -- Kiểm tra xem đã có subscription chưa
  SELECT id INTO existing_subscription
  FROM public.subscriptions
  WHERE profile_id = user_profile_id
  LIMIT 1;

  -- Nếu chưa có subscription và có free plan, tạo subscription mới
  IF existing_subscription IS NULL AND free_plan_id IS NOT NULL THEN
    INSERT INTO public.subscriptions (
      profile_id,
      plan_id,
      status,
      billing_cycle,
      start_date
    )
    VALUES (
      user_profile_id,
      free_plan_id,
      'active',
      'monthly',
      now()
    )
    ON CONFLICT (profile_id) DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Xóa các trigger cũ có thể gây lỗi ON CONFLICT
DROP TRIGGER IF EXISTS trigger_auto_create_free_subscription ON public.profiles;
DROP TRIGGER IF EXISTS trigger_auto_create_subscription_for_seller ON public.profiles;

-- 4. Xóa function auto_create_free_subscription nếu có (vì có thể dùng ON CONFLICT sai)
DROP FUNCTION IF EXISTS auto_create_free_subscription();

-- =====================================================
-- COMPLETED! 🎉
-- - Đảm bảo unique constraint trên subscriptions.profile_id
-- - Tạo function ensure_seller_has_subscription
-- - Xóa các trigger/function cũ có thể gây lỗi
-- =====================================================

