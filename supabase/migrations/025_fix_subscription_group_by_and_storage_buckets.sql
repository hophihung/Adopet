-- =====================================================
-- FIX SUBSCRIPTION GROUP BY ERROR AND UPDATE STORAGE BUCKETS
-- Sửa lỗi GROUP BY trong get_user_plan_info và cập nhật storage buckets
-- =====================================================

-- 1. Sửa function get_user_plan_info - thêm s.created_at vào GROUP BY
DROP FUNCTION IF EXISTS get_user_plan_info(uuid);
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
  GROUP BY sp.id, sp.name, sp.display_name, sp.price_monthly, sp.price_yearly, sp.color, sp.icon, sp.is_popular, s.created_at
  ORDER BY s.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Cập nhật bucket 'reels' để hỗ trợ cả image types
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
WHERE id = 'reels';

-- 3. Tạo hoặc cập nhật bucket 'post-images'
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-images',
  'post-images',
  true,
  10485760, -- 10MB limit (10 * 1024 * 1024)
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

-- 4. Tạo RLS policies cho post-images bucket (nếu chưa có)
-- Policy: Anyone can view images (public bucket)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Anyone can view post images'
  ) THEN
    CREATE POLICY "Anyone can view post images"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'post-images');
  END IF;
END $$;

-- Policy: Authenticated users can upload images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can upload post images'
  ) THEN
    CREATE POLICY "Authenticated users can upload post images"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'post-images');
  END IF;
END $$;

-- Policy: Users can update their own images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can update their own post images'
  ) THEN
    CREATE POLICY "Users can update their own post images"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (bucket_id = 'post-images' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;

-- Policy: Users can delete their own images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can delete their own post images'
  ) THEN
    CREATE POLICY "Users can delete their own post images"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (bucket_id = 'post-images' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;

-- =====================================================
-- COMPLETED! 🎉
-- - Fixed GROUP BY error in get_user_plan_info function
-- - Updated reels bucket to support image types
-- - Created/updated post-images bucket with correct MIME types
-- =====================================================

