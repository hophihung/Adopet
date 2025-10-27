-- =====================================================
-- AUTO CREATE SUBSCRIPTION FOR SELLERS
-- Tự động tạo subscription free plan khi user chọn role seller
-- =====================================================

-- 1. Tạo function để tự động tạo subscription cho seller
CREATE OR REPLACE FUNCTION auto_create_subscription_for_seller()
RETURNS TRIGGER AS $$
DECLARE
  free_plan_id uuid;
BEGIN
  -- Chỉ tạo subscription khi role là 'seller'
  IF NEW.role = 'seller' THEN
    -- Lấy ID của free plan
    SELECT id INTO free_plan_id
    FROM public.subscription_plans
    WHERE name = 'free'
    LIMIT 1;
    
    -- Nếu không tìm thấy free plan, tạo mặc định
    IF free_plan_id IS NULL THEN
      INSERT INTO public.subscription_plans (name, display_name, description, price_monthly, price_yearly, color, icon, is_popular, sort_order)
      VALUES ('free', 'Free', 'Perfect for getting started', 0, 0, '#10b981', 'heart', false, 1)
      RETURNING id INTO free_plan_id;
    END IF;
    
    -- Tạo subscription free plan cho seller
    INSERT INTO public.subscriptions (
      profile_id,
      plan_id,
      plan, -- Giữ backward compatibility
      status,
      start_date,
      end_date,
      billing_cycle,
      auto_renew
    ) VALUES (
      NEW.id,
      free_plan_id,
      'free',
      'active',
      now(),
      now() + INTERVAL '1 year', -- Free plan không giới hạn thời gian
      'monthly',
      false -- Free plan không auto renew
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Tạo trigger để tự động tạo subscription khi tạo profile
DROP TRIGGER IF EXISTS trigger_auto_create_subscription_for_seller ON public.profiles;
CREATE TRIGGER trigger_auto_create_subscription_for_seller
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_subscription_for_seller();

-- 3. Tạo function để kiểm tra và tạo subscription cho seller hiện tại (nếu chưa có)
CREATE OR REPLACE FUNCTION ensure_seller_has_subscription(user_profile_id uuid)
RETURNS void AS $$
DECLARE
  user_role text;
  existing_subscription_count integer;
  free_plan_id uuid;
BEGIN
  -- Lấy role của user
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = user_profile_id;
  
  -- Chỉ xử lý nếu role là seller
  IF user_role = 'seller' THEN
    -- Kiểm tra xem đã có subscription chưa
    SELECT COUNT(*) INTO existing_subscription_count
    FROM public.subscriptions
    WHERE profile_id = user_profile_id;
    
    -- Nếu chưa có subscription, tạo free plan
    IF existing_subscription_count = 0 THEN
      -- Lấy ID của free plan
      SELECT id INTO free_plan_id
      FROM public.subscription_plans
      WHERE name = 'free'
      LIMIT 1;
      
      -- Nếu không tìm thấy free plan, tạo mặc định
      IF free_plan_id IS NULL THEN
        INSERT INTO public.subscription_plans (name, display_name, description, price_monthly, price_yearly, color, icon, is_popular, sort_order)
        VALUES ('free', 'Free', 'Perfect for getting started', 0, 0, '#10b981', 'heart', false, 1)
        RETURNING id INTO free_plan_id;
      END IF;
      
      -- Tạo subscription free plan
      INSERT INTO public.subscriptions (
        profile_id,
        plan_id,
        plan,
        status,
        start_date,
        end_date,
        billing_cycle,
        auto_renew
      ) VALUES (
        user_profile_id,
        free_plan_id,
        'free',
        'active',
        now(),
        now() + INTERVAL '1 year',
        'monthly',
        false
      );
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Tạo function để lấy thông tin subscription của user (bao gồm cả free plan)
CREATE OR REPLACE FUNCTION get_user_subscription_info(user_profile_id uuid)
RETURNS TABLE (
  subscription_id uuid,
  plan_id uuid,
  plan_name text,
  plan_display_name text,
  status text,
  start_date timestamptz,
  end_date timestamptz,
  billing_cycle text,
  auto_renew boolean,
  is_free_plan boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id as subscription_id,
    s.plan_id,
    sp.name as plan_name,
    sp.display_name as plan_display_name,
    s.status,
    s.start_date,
    s.end_date,
    s.billing_cycle,
    s.auto_renew,
    (sp.name = 'free') as is_free_plan
  FROM public.subscriptions s
  JOIN public.subscription_plans sp ON s.plan_id = sp.id
  WHERE s.profile_id = user_profile_id
    AND s.status = 'active'
  ORDER BY s.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Cập nhật function get_user_plan_info để xử lý trường hợp chưa có subscription
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
  usage_today jsonb,
  is_free_plan boolean,
  subscription_status text
) AS $$
DECLARE
  user_role text;
  subscription_exists boolean := false;
BEGIN
  -- Lấy role của user
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = user_profile_id;
  
  -- Nếu là seller và chưa có subscription, tạo free plan
  IF user_role = 'seller' THEN
    PERFORM ensure_seller_has_subscription(user_profile_id);
  END IF;
  
  -- Kiểm tra xem có subscription không
  SELECT EXISTS(
    SELECT 1 FROM public.subscriptions 
    WHERE profile_id = user_profile_id AND status = 'active'
  ) INTO subscription_exists;
  
  -- Nếu không có subscription, trả về null
  IF NOT subscription_exists THEN
    RETURN;
  END IF;
  
  -- Trả về thông tin plan
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
    ) as usage_today,
    (sp.name = 'free') as is_free_plan,
    s.status as subscription_status
  FROM public.subscriptions s
  JOIN public.subscription_plans sp ON s.plan_id = sp.id
  LEFT JOIN public.plan_features pf ON sp.id = pf.plan_id
  WHERE s.profile_id = user_profile_id 
    AND s.status = 'active'
  GROUP BY sp.id, sp.name, sp.display_name, sp.price_monthly, sp.price_yearly, sp.color, sp.icon, sp.is_popular, s.status
  ORDER BY s.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Tạo function để redirect seller đến subscription page nếu cần
CREATE OR REPLACE FUNCTION should_redirect_to_subscription(user_profile_id uuid)
RETURNS boolean AS $$
DECLARE
  user_role text;
  subscription_count integer;
  is_free_plan boolean;
BEGIN
  -- Lấy role của user
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = user_profile_id;
  
  -- Nếu không phải seller, không redirect
  IF user_role != 'seller' THEN
    RETURN false;
  END IF;
  
  -- Đảm bảo seller có subscription
  PERFORM ensure_seller_has_subscription(user_profile_id);
  
  -- Kiểm tra xem có subscription không
  SELECT COUNT(*) INTO subscription_count
  FROM public.subscriptions
  WHERE profile_id = user_profile_id AND status = 'active';
  
  -- Nếu chưa có subscription, redirect
  IF subscription_count = 0 THEN
    RETURN true;
  END IF;
  
  -- Kiểm tra xem có phải free plan không
  SELECT (sp.name = 'free') INTO is_free_plan
  FROM public.subscriptions s
  JOIN public.subscription_plans sp ON s.plan_id = sp.id
  WHERE s.profile_id = user_profile_id AND s.status = 'active'
  ORDER BY s.created_at DESC
  LIMIT 1;
  
  -- Nếu là free plan, có thể redirect để upgrade (tùy chọn)
  -- Ở đây chúng ta không redirect free plan users
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Cập nhật RLS policy để cho phép tạo subscription
CREATE POLICY "Users can create their own subscription"
  ON public.subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = profile_id);

-- 8. Tạo dữ liệu mẫu cho free plan nếu chưa có
INSERT INTO public.subscription_plans (name, display_name, description, price_monthly, price_yearly, color, icon, is_popular, sort_order)
VALUES ('free', 'Free', 'Perfect for getting started', 0, 0, '#10b981', 'heart', false, 1)
ON CONFLICT (name) DO NOTHING;

-- 9. Tạo free plan features nếu chưa có
INSERT INTO public.plan_features (plan_id, feature_key, feature_name, feature_value, feature_type, description, icon, sort_order)
SELECT 
  sp.id,
  'pet_limit',
  'Pet Listings',
  '3',
  'number',
  'Maximum pets you can list',
  'paw-print',
  1
FROM public.subscription_plans sp 
WHERE sp.name = 'free'
ON CONFLICT DO NOTHING;

-- =====================================================
-- COMPLETED! 🎉
-- Sellers will now automatically get free subscription
-- =====================================================
