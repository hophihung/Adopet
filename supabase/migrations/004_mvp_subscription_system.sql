-- =====================================================
-- MVP SUBSCRIPTION SYSTEM - Tối ưu cho Pet Adoption App
-- Hệ thống subscription đơn giản, dễ sử dụng cho MVP
-- =====================================================

-- 1. Tạo bảng subscription_plans (đơn giản hóa cho MVP)
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL UNIQUE, -- 'free', 'premium', 'pro'
  display_name text NOT NULL, -- 'Free', 'Premium', 'Pro'
  description text,
  price_monthly numeric(10,2) DEFAULT 0,
  price_yearly numeric(10,2) DEFAULT 0,
  currency text DEFAULT 'VND',
  color text DEFAULT '#6366f1', -- Màu sắc cho UI
  icon text DEFAULT 'star', -- Icon cho UI
  is_active boolean DEFAULT true,
  is_popular boolean DEFAULT false, -- Gói phổ biến
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Tạo bảng plan_features (tối ưu cho MVP)
CREATE TABLE IF NOT EXISTS public.plan_features (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  plan_id uuid REFERENCES public.subscription_plans(id) ON DELETE CASCADE NOT NULL,
  feature_key text NOT NULL, -- 'pet_limit', 'match_limit', 'reel_limit', etc.
  feature_name text NOT NULL, -- 'Pet Limit', 'Daily Matches', 'Reel Posts', etc.
  feature_value text NOT NULL, -- '4', '50', 'unlimited', etc.
  feature_type text DEFAULT 'number' CHECK (feature_type IN ('number', 'boolean', 'text', 'unlimited')),
  description text,
  icon text, -- Icon cho feature
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 3. Cập nhật bảng subscriptions để hỗ trợ MVP
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES public.subscription_plans(id),
ADD COLUMN IF NOT EXISTS payment_method text, -- 'stripe', 'paypal', 'momo', 'zalopay'
ADD COLUMN IF NOT EXISTS payment_id text, -- ID từ payment gateway
ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz, -- Thời gian kết thúc trial
ADD COLUMN IF NOT EXISTS auto_renew boolean DEFAULT true, -- Tự động gia hạn
ADD COLUMN IF NOT EXISTS billing_cycle text DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly'));

-- 4. Tạo bảng usage_tracking để theo dõi sử dụng (quan trọng cho MVP)
CREATE TABLE IF NOT EXISTS public.usage_tracking (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  feature_key text NOT NULL, -- 'pet_created', 'match_made', 'reel_posted'
  feature_count integer DEFAULT 1,
  reset_date date DEFAULT CURRENT_DATE, -- Ngày reset counter
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, feature_key, reset_date)
);

-- 5. Tạo index tối ưu
CREATE INDEX IF NOT EXISTS idx_subscription_plans_name ON public.subscription_plans(name);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_is_active ON public.subscription_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_is_popular ON public.subscription_plans(is_popular);
CREATE INDEX IF NOT EXISTS idx_plan_features_plan_id ON public.plan_features(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_features_feature_key ON public.plan_features(feature_key);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON public.subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_id ON public.usage_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_reset_date ON public.usage_tracking(reset_date);

-- 6. Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies
CREATE POLICY "Anyone can view active subscription plans"
  ON public.subscription_plans FOR SELECT
  USING (is_active = true);

CREATE POLICY "Anyone can view plan features"
  ON public.plan_features FOR SELECT
  USING (true);

CREATE POLICY "Users can view their own usage tracking"
  ON public.usage_tracking FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage tracking"
  ON public.usage_tracking FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own usage tracking"
  ON public.usage_tracking FOR UPDATE
  USING (auth.uid() = user_id);

-- 8. Tạo dữ liệu MVP Plans
INSERT INTO public.subscription_plans (name, display_name, description, price_monthly, price_yearly, color, icon, is_popular, sort_order) VALUES
('free', 'Free', 'Perfect for getting started', 0, 0, '#10b981', 'heart', false, 1),
('premium', 'Premium', 'Most popular choice', 99000, 990000, '#f59e0b', 'star', true, 2),
('pro', 'Pro', 'For power users', 199000, 1990000, '#8b5cf6', 'crown', false, 3)
ON CONFLICT (name) DO NOTHING;

-- 9. Tạo features cho MVP (tập trung vào core features)
-- Free Plan features
INSERT INTO public.plan_features (plan_id, feature_key, feature_name, feature_value, feature_type, description, icon, sort_order)
SELECT sp.id, 'pet_limit', 'Pet Listings', '3', 'number', 'Maximum pets you can list', 'paw-print', 1
FROM public.subscription_plans sp WHERE sp.name = 'free';

INSERT INTO public.plan_features (plan_id, feature_key, feature_name, feature_value, feature_type, description, icon, sort_order)
SELECT sp.id, 'daily_matches', 'Daily Matches', '10', 'number', 'Maximum matches per day', 'heart', 2
FROM public.subscription_plans sp WHERE sp.name = 'free';

INSERT INTO public.plan_features (plan_id, feature_key, feature_name, feature_value, feature_type, description, icon, sort_order)
SELECT sp.id, 'reel_posts', 'Reel Posts', '5', 'number', 'Maximum reel posts per day', 'video', 3
FROM public.subscription_plans sp WHERE sp.name = 'free';

INSERT INTO public.plan_features (plan_id, feature_key, feature_name, feature_value, feature_type, description, icon, sort_order)
SELECT sp.id, 'featured_pets', 'Featured Pets', 'false', 'boolean', 'Show pets in featured section', 'star', 4
FROM public.subscription_plans sp WHERE sp.name = 'free';

INSERT INTO public.plan_features (plan_id, feature_key, feature_name, feature_value, feature_type, description, icon, sort_order)
SELECT sp.id, 'analytics', 'Analytics', 'false', 'boolean', 'View pet performance analytics', 'bar-chart', 5
FROM public.subscription_plans sp WHERE sp.name = 'free';

-- Premium Plan features
INSERT INTO public.plan_features (plan_id, feature_key, feature_name, feature_value, feature_type, description, icon, sort_order)
SELECT sp.id, 'pet_limit', 'Pet Listings', '10', 'number', 'Maximum pets you can list', 'paw-print', 1
FROM public.subscription_plans sp WHERE sp.name = 'premium';

INSERT INTO public.plan_features (plan_id, feature_key, feature_name, feature_value, feature_type, description, icon, sort_order)
SELECT sp.id, 'daily_matches', 'Daily Matches', '50', 'number', 'Maximum matches per day', 'heart', 2
FROM public.subscription_plans sp WHERE sp.name = 'premium';

INSERT INTO public.plan_features (plan_id, feature_key, feature_name, feature_value, feature_type, description, icon, sort_order)
SELECT sp.id, 'reel_posts', 'Reel Posts', '20', 'number', 'Maximum reel posts per day', 'video', 3
FROM public.subscription_plans sp WHERE sp.name = 'premium';

INSERT INTO public.plan_features (plan_id, feature_key, feature_name, feature_value, feature_type, description, icon, sort_order)
SELECT sp.id, 'featured_pets', 'Featured Pets', 'true', 'boolean', 'Show pets in featured section', 'star', 4
FROM public.subscription_plans sp WHERE sp.name = 'premium';

INSERT INTO public.plan_features (plan_id, feature_key, feature_name, feature_value, feature_type, description, icon, sort_order)
SELECT sp.id, 'analytics', 'Analytics', 'true', 'boolean', 'View pet performance analytics', 'bar-chart', 5
FROM public.subscription_plans sp WHERE sp.name = 'premium';

INSERT INTO public.plan_features (plan_id, feature_key, feature_name, feature_value, feature_type, description, icon, sort_order)
SELECT sp.id, 'priority_support', 'Priority Support', 'true', 'boolean', 'Get faster customer support', 'headphones', 6
FROM public.subscription_plans sp WHERE sp.name = 'premium';

-- Pro Plan features
INSERT INTO public.plan_features (plan_id, feature_key, feature_name, feature_value, feature_type, description, icon, sort_order)
SELECT sp.id, 'pet_limit', 'Pet Listings', 'unlimited', 'unlimited', 'Unlimited pet listings', 'paw-print', 1
FROM public.subscription_plans sp WHERE sp.name = 'pro';

INSERT INTO public.plan_features (plan_id, feature_key, feature_name, feature_value, feature_type, description, icon, sort_order)
SELECT sp.id, 'daily_matches', 'Daily Matches', 'unlimited', 'unlimited', 'Unlimited daily matches', 'heart', 2
FROM public.subscription_plans sp WHERE sp.name = 'pro';

INSERT INTO public.plan_features (plan_id, feature_key, feature_name, feature_value, feature_type, description, icon, sort_order)
SELECT sp.id, 'reel_posts', 'Reel Posts', 'unlimited', 'unlimited', 'Unlimited reel posts', 'video', 3
FROM public.subscription_plans sp WHERE sp.name = 'pro';

INSERT INTO public.plan_features (plan_id, feature_key, feature_name, feature_value, feature_type, description, icon, sort_order)
SELECT sp.id, 'featured_pets', 'Featured Pets', 'true', 'boolean', 'Show pets in featured section', 'star', 4
FROM public.subscription_plans sp WHERE sp.name = 'pro';

INSERT INTO public.plan_features (plan_id, feature_key, feature_name, feature_value, feature_type, description, icon, sort_order)
SELECT sp.id, 'analytics', 'Advanced Analytics', 'true', 'boolean', 'Advanced pet performance analytics', 'bar-chart', 5
FROM public.subscription_plans sp WHERE sp.name = 'pro';

INSERT INTO public.plan_features (plan_id, feature_key, feature_name, feature_value, feature_type, description, icon, sort_order)
SELECT sp.id, 'priority_support', '24/7 Support', 'true', 'boolean', '24/7 priority customer support', 'headphones', 6
FROM public.subscription_plans sp WHERE sp.name = 'pro';

INSERT INTO public.plan_features (plan_id, feature_key, feature_name, feature_value, feature_type, description, icon, sort_order)
SELECT sp.id, 'api_access', 'API Access', 'true', 'boolean', 'Access to API for integrations', 'code', 7
FROM public.subscription_plans sp WHERE sp.name = 'pro';

-- 10. Functions cho MVP
-- Function lấy thông tin plan của user (tối ưu cho MVP)
CREATE OR REPLACE FUNCTION get_user_plan_info(user_profile_id uuid)
RETURNS TABLE (
  plan_id uuid,
  plan_name text,
  plan_display_name text,
  plan_price_monthly numeric,
  plan_price_yearly numeric,
  plan_color text,
  plan_icon text,
  is_popular boolean,
  features jsonb,
  usage_today jsonb
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sp.id as plan_id,
    sp.name as plan_name,
    sp.display_name as plan_display_name,
    sp.price_monthly,
    sp.price_yearly,
    sp.color,
    sp.icon,
    sp.is_popular,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'key', pf.feature_key,
          'name', pf.feature_name,
          'value', pf.feature_value,
          'type', pf.feature_type,
          'description', pf.description,
          'icon', pf.icon
        ) ORDER BY pf.sort_order
      ) FILTER (WHERE pf.id IS NOT NULL),
      '[]'::jsonb
    ) as features,
    COALESCE(
      (SELECT jsonb_object_agg(ut.feature_key, ut.feature_count)
       FROM public.usage_tracking ut
       WHERE ut.user_id = user_profile_id 
         AND ut.reset_date = CURRENT_DATE),
      '{}'::jsonb
    ) as usage_today
  FROM public.subscriptions s
  JOIN public.subscription_plans sp ON s.plan_id = sp.id
  LEFT JOIN public.plan_features pf ON sp.id = pf.plan_id
  WHERE s.profile_id = user_profile_id 
    AND s.status = 'active'
  GROUP BY sp.id, sp.name, sp.display_name, sp.price_monthly, sp.price_yearly, sp.color, sp.icon, sp.is_popular
  ORDER BY s.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function kiểm tra giới hạn feature (tối ưu cho MVP)
CREATE OR REPLACE FUNCTION check_feature_limit(
  user_profile_id uuid,
  feature_key text,
  current_count integer DEFAULT 0
)
RETURNS boolean AS $$
DECLARE
  feature_limit text;
  daily_usage integer := 0;
  is_unlimited boolean := false;
BEGIN
  -- Lấy giới hạn từ plan
  SELECT pf.feature_value INTO feature_limit
  FROM public.subscriptions s
  JOIN public.subscription_plans sp ON s.plan_id = sp.id
  JOIN public.plan_features pf ON sp.id = pf.plan_id
  WHERE s.profile_id = user_profile_id 
    AND s.status = 'active'
    AND pf.feature_key = check_feature_limit.feature_key
  ORDER BY s.created_at DESC
  LIMIT 1;
  
  -- Nếu không có feature, mặc định là không cho phép
  IF feature_limit IS NULL THEN
    RETURN false;
  END IF;
  
  -- Kiểm tra unlimited
  IF feature_limit = 'unlimited' THEN
    RETURN true;
  END IF;
  
  -- Lấy usage hôm nay
  SELECT COALESCE(ut.feature_count, 0) INTO daily_usage
  FROM public.usage_tracking ut
  WHERE ut.user_id = user_profile_id 
    AND ut.feature_key = check_feature_limit.feature_key
    AND ut.reset_date = CURRENT_DATE;
  
  -- Kiểm tra giới hạn
  RETURN (daily_usage + current_count) < feature_limit::integer;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function tăng usage counter
CREATE OR REPLACE FUNCTION increment_usage(
  user_profile_id uuid,
  feature_key text,
  increment_by integer DEFAULT 1
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.usage_tracking (user_id, feature_key, feature_count)
  VALUES (user_profile_id, feature_key, increment_by)
  ON CONFLICT (user_id, feature_key, reset_date)
  DO UPDATE SET 
    feature_count = usage_tracking.feature_count + increment_by,
    created_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function reset daily usage (chạy hàng ngày)
CREATE OR REPLACE FUNCTION reset_daily_usage()
RETURNS void AS $$
BEGIN
  -- Xóa usage cũ hơn 7 ngày
  DELETE FROM public.usage_tracking 
  WHERE reset_date < CURRENT_DATE - INTERVAL '7 days';
  
  -- Reset usage hôm nay (nếu có)
  UPDATE public.usage_tracking 
  SET feature_count = 0
  WHERE reset_date = CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Cập nhật trigger check_pet_limit để sử dụng hệ thống mới
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
  SELECT check_feature_limit(NEW.seller_id, 'pet_limit', current_count) INTO can_add_pet;
  
  IF NOT can_add_pet THEN
    RAISE EXCEPTION 'You have reached the pet limit for your subscription plan. Please upgrade to add more pets.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 12. Tạo trigger cho usage tracking
CREATE OR REPLACE FUNCTION track_pet_creation()
RETURNS TRIGGER AS $$
BEGIN
  -- Tăng counter pet_created
  PERFORM increment_usage(NEW.seller_id, 'pet_created');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_track_pet_creation
  AFTER INSERT ON public.pets
  FOR EACH ROW
  EXECUTE FUNCTION track_pet_creation();

-- 13. Migrate existing subscriptions
UPDATE public.subscriptions 
SET plan_id = sp.id
FROM public.subscription_plans sp
WHERE subscriptions.plan = sp.name;

-- 14. Tạo trigger updated_at
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

-- 15. Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.subscription_plans;
ALTER PUBLICATION supabase_realtime ADD TABLE public.plan_features;
ALTER PUBLICATION supabase_realtime ADD TABLE public.usage_tracking;

-- 16. Tạo function admin để quản lý
CREATE OR REPLACE FUNCTION admin_get_all_plans()
RETURNS TABLE (
  id uuid,
  name text,
  display_name text,
  price_monthly numeric,
  price_yearly numeric,
  is_active boolean,
  is_popular boolean,
  subscriber_count bigint,
  features jsonb
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sp.id,
    sp.name,
    sp.display_name,
    sp.price_monthly,
    sp.price_yearly,
    sp.is_active,
    sp.is_popular,
    COUNT(s.id) as subscriber_count,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'key', pf.feature_key,
          'name', pf.feature_name,
          'value', pf.feature_value,
          'type', pf.feature_type
        ) ORDER BY pf.sort_order
      ) FILTER (WHERE pf.id IS NOT NULL),
      '[]'::jsonb
    ) as features
  FROM public.subscription_plans sp
  LEFT JOIN public.subscriptions s ON sp.id = s.plan_id AND s.status = 'active'
  LEFT JOIN public.plan_features pf ON sp.id = pf.plan_id
  GROUP BY sp.id, sp.name, sp.display_name, sp.price_monthly, sp.price_yearly, sp.is_active, sp.is_popular
  ORDER BY sp.sort_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- MVP SUBSCRIPTION SYSTEM COMPLETED! 🎉
-- Ready for production use
-- =====================================================
