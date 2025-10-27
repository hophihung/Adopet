-- =====================================================
-- NORMALIZE SUBSCRIPTION PLANS SYSTEM
-- Tạo hệ thống quản lý subscription plans được normalize
-- =====================================================

-- 1. Tạo bảng subscription_plans
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL UNIQUE, -- 'free', 'premium', 'pro'
  display_name text NOT NULL, -- 'Free Plan', 'Premium Plan', 'Pro Plan'
  description text,
  price_monthly numeric(10,2) DEFAULT 0, -- Giá hàng tháng
  price_yearly numeric(10,2) DEFAULT 0, -- Giá hàng năm
  currency text DEFAULT 'VND',
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Tạo bảng plan_features để lưu các tính năng của từng plan
CREATE TABLE IF NOT EXISTS public.plan_features (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  plan_id uuid REFERENCES public.subscription_plans(id) ON DELETE CASCADE NOT NULL,
  feature_key text NOT NULL, -- 'pet_limit', 'post_limit', 'featured_pets', etc.
  feature_name text NOT NULL, -- 'Pet Limit', 'Post Limit', 'Featured Pets', etc.
  feature_value text NOT NULL, -- '4', 'unlimited', 'true', etc.
  feature_type text DEFAULT 'number' CHECK (feature_type IN ('number', 'boolean', 'text', 'unlimited')),
  description text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 3. Thêm cột plan_id vào bảng subscriptions (thay thế cho plan text)
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES public.subscription_plans(id);

-- 4. Tạo index để tối ưu performance
CREATE INDEX IF NOT EXISTS idx_subscription_plans_name ON public.subscription_plans(name);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_is_active ON public.subscription_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_plan_features_plan_id ON public.plan_features(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_features_feature_key ON public.plan_features(feature_key);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON public.subscriptions(plan_id);

-- 5. Enable RLS cho các bảng mới
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_features ENABLE ROW LEVEL SECURITY;

-- 6. Policies cho subscription_plans (public read, admin write)
CREATE POLICY "Anyone can view subscription plans"
  ON public.subscription_plans FOR SELECT
  USING (is_active = true);

CREATE POLICY "Authenticated users can view all subscription plans"
  ON public.subscription_plans FOR SELECT
  TO authenticated
  USING (true);

-- 7. Policies cho plan_features (public read, admin write)
CREATE POLICY "Anyone can view plan features"
  ON public.plan_features FOR SELECT
  USING (true);

-- 8. Tạo function để lấy thông tin plan của user
CREATE OR REPLACE FUNCTION get_user_plan_info(user_profile_id uuid)
RETURNS TABLE (
  plan_name text,
  plan_display_name text,
  plan_price_monthly numeric,
  plan_price_yearly numeric,
  features jsonb
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sp.name,
    sp.display_name,
    sp.price_monthly,
    sp.price_yearly,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'key', pf.feature_key,
          'name', pf.feature_name,
          'value', pf.feature_value,
          'type', pf.feature_type,
          'description', pf.description
        ) ORDER BY pf.sort_order
      ) FILTER (WHERE pf.id IS NOT NULL),
      '[]'::jsonb
    ) as features
  FROM public.subscriptions s
  JOIN public.subscription_plans sp ON s.plan_id = sp.id
  LEFT JOIN public.plan_features pf ON sp.id = pf.plan_id
  WHERE s.profile_id = user_profile_id 
    AND s.status = 'active'
  GROUP BY sp.id, sp.name, sp.display_name, sp.price_monthly, sp.price_yearly
  ORDER BY s.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Tạo function để kiểm tra giới hạn feature của user
CREATE OR REPLACE FUNCTION check_user_feature_limit(
  user_profile_id uuid,
  feature_key text,
  current_count integer DEFAULT 0
)
RETURNS boolean AS $$
DECLARE
  feature_limit text;
  is_unlimited boolean := false;
BEGIN
  -- Lấy giới hạn feature từ plan của user
  SELECT pf.feature_value INTO feature_limit
  FROM public.subscriptions s
  JOIN public.subscription_plans sp ON s.plan_id = sp.id
  JOIN public.plan_features pf ON sp.id = pf.plan_id
  WHERE s.profile_id = user_profile_id 
    AND s.status = 'active'
    AND pf.feature_key = feature_key
  ORDER BY s.created_at DESC
  LIMIT 1;
  
  -- Nếu không tìm thấy feature, mặc định là không cho phép
  IF feature_limit IS NULL THEN
    RETURN false;
  END IF;
  
  -- Kiểm tra nếu là unlimited
  IF feature_limit = 'unlimited' THEN
    RETURN true;
  END IF;
  
  -- Kiểm tra giới hạn số
  RETURN current_count < feature_limit::integer;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Cập nhật function check_pet_limit để sử dụng hệ thống mới
CREATE OR REPLACE FUNCTION check_pet_limit()
RETURNS TRIGGER AS $$
DECLARE
  current_count integer;
  can_add_pet boolean;
BEGIN
  -- Đếm số pet hiện tại của user
  SELECT COUNT(*) INTO current_count
  FROM public.pets
  WHERE seller_id = NEW.seller_id;
  
  -- Kiểm tra giới hạn pet
  SELECT check_user_feature_limit(NEW.seller_id, 'pet_limit', current_count) INTO can_add_pet;
  
  IF NOT can_add_pet THEN
    RAISE EXCEPTION 'User has reached the pet limit for their subscription plan';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 11. Tạo dữ liệu mẫu cho các plan
INSERT INTO public.subscription_plans (name, display_name, description, price_monthly, price_yearly, sort_order) VALUES
('free', 'Free Plan', 'Basic plan for new users', 0, 0, 1),
('premium', 'Premium Plan', 'Advanced features for active users', 99000, 990000, 2),
('pro', 'Pro Plan', 'Full features for professional users', 199000, 1990000, 3)
ON CONFLICT (name) DO NOTHING;

-- 12. Tạo features cho từng plan
-- Free Plan features
INSERT INTO public.plan_features (plan_id, feature_key, feature_name, feature_value, feature_type, description, sort_order)
SELECT 
  sp.id,
  'pet_limit',
  'Pet Limit',
  '4',
  'number',
  'Maximum number of pets you can list',
  1
FROM public.subscription_plans sp WHERE sp.name = 'free';

INSERT INTO public.plan_features (plan_id, feature_key, feature_name, feature_value, feature_type, description, sort_order)
SELECT 
  sp.id,
  'post_limit',
  'Post Limit',
  '10',
  'number',
  'Maximum number of posts per month',
  2
FROM public.subscription_plans sp WHERE sp.name = 'free';

INSERT INTO public.plan_features (plan_id, feature_key, feature_name, feature_value, feature_type, description, sort_order)
SELECT 
  sp.id,
  'featured_pets',
  'Featured Pets',
  'false',
  'boolean',
  'Can feature pets in search results',
  3
FROM public.subscription_plans sp WHERE sp.name = 'free';

INSERT INTO public.plan_features (plan_id, feature_key, feature_name, feature_value, feature_type, description, sort_order)
SELECT 
  sp.id,
  'analytics',
  'Analytics',
  'false',
  'boolean',
  'View detailed analytics for your pets',
  4
FROM public.subscription_plans sp WHERE sp.name = 'free';

-- Premium Plan features
INSERT INTO public.plan_features (plan_id, feature_key, feature_name, feature_value, feature_type, description, sort_order)
SELECT 
  sp.id,
  'pet_limit',
  'Pet Limit',
  '6',
  'number',
  'Maximum number of pets you can list',
  1
FROM public.subscription_plans sp WHERE sp.name = 'premium';

INSERT INTO public.plan_features (plan_id, feature_key, feature_name, feature_value, feature_type, description, sort_order)
SELECT 
  sp.id,
  'post_limit',
  'Post Limit',
  '50',
  'number',
  'Maximum number of posts per month',
  2
FROM public.subscription_plans sp WHERE sp.name = 'premium';

INSERT INTO public.plan_features (plan_id, feature_key, feature_name, feature_value, feature_type, description, sort_order)
SELECT 
  sp.id,
  'featured_pets',
  'Featured Pets',
  'true',
  'boolean',
  'Can feature pets in search results',
  3
FROM public.subscription_plans sp WHERE sp.name = 'premium';

INSERT INTO public.plan_features (plan_id, feature_key, feature_name, feature_value, feature_type, description, sort_order)
SELECT 
  sp.id,
  'analytics',
  'Analytics',
  'true',
  'boolean',
  'View detailed analytics for your pets',
  4
FROM public.subscription_plans sp WHERE sp.name = 'premium';

INSERT INTO public.plan_features (plan_id, feature_key, feature_name, feature_value, feature_type, description, sort_order)
SELECT 
  sp.id,
  'priority_support',
  'Priority Support',
  'true',
  'boolean',
  'Get priority customer support',
  5
FROM public.subscription_plans sp WHERE sp.name = 'premium';

-- Pro Plan features
INSERT INTO public.plan_features (plan_id, feature_key, feature_name, feature_value, feature_type, description, sort_order)
SELECT 
  sp.id,
  'pet_limit',
  'Pet Limit',
  'unlimited',
  'unlimited',
  'Unlimited pets you can list',
  1
FROM public.subscription_plans sp WHERE sp.name = 'pro';

INSERT INTO public.plan_features (plan_id, feature_key, feature_name, feature_value, feature_type, description, sort_order)
SELECT 
  sp.id,
  'post_limit',
  'Post Limit',
  'unlimited',
  'unlimited',
  'Unlimited posts per month',
  2
FROM public.subscription_plans sp WHERE sp.name = 'pro';

INSERT INTO public.plan_features (plan_id, feature_key, feature_name, feature_value, feature_type, description, sort_order)
SELECT 
  sp.id,
  'featured_pets',
  'Featured Pets',
  'true',
  'boolean',
  'Can feature pets in search results',
  3
FROM public.subscription_plans sp WHERE sp.name = 'pro';

INSERT INTO public.plan_features (plan_id, feature_key, feature_name, feature_value, feature_type, description, sort_order)
SELECT 
  sp.id,
  'analytics',
  'Analytics',
  'true',
  'boolean',
  'View detailed analytics for your pets',
  4
FROM public.subscription_plans sp WHERE sp.name = 'pro';

INSERT INTO public.plan_features (plan_id, feature_key, feature_name, feature_value, feature_type, description, sort_order)
SELECT 
  sp.id,
  'priority_support',
  'Priority Support',
  'true',
  'boolean',
  'Get priority customer support',
  5
FROM public.subscription_plans sp WHERE sp.name = 'pro';

INSERT INTO public.plan_features (plan_id, feature_key, feature_name, feature_value, feature_type, description, sort_order)
SELECT 
  sp.id,
  'api_access',
  'API Access',
  'true',
  'boolean',
  'Access to API for integrations',
  6
FROM public.subscription_plans sp WHERE sp.name = 'pro';

INSERT INTO public.plan_features (plan_id, feature_key, feature_name, feature_value, feature_type, description, sort_order)
SELECT 
  sp.id,
  'white_label',
  'White Label',
  'true',
  'boolean',
  'Remove Adopet branding',
  7
FROM public.subscription_plans sp WHERE sp.name = 'pro';

-- 13. Migrate existing subscriptions to use plan_id
UPDATE public.subscriptions 
SET plan_id = sp.id
FROM public.subscription_plans sp
WHERE subscriptions.plan = sp.name;

-- 14. Tạo trigger để tự động cập nhật updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_subscription_plans_updated_at ON public.subscription_plans;
CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 15. Enable realtime cho các bảng mới
ALTER PUBLICATION supabase_realtime ADD TABLE public.subscription_plans;
ALTER PUBLICATION supabase_realtime ADD TABLE public.plan_features;

-- =====================================================
-- COMPLETED! 🎉
-- Run this in Supabase SQL Editor
-- =====================================================
