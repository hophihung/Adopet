-- =====================================================
-- FIX REELS STATUS DEFAULT AND APPROVAL SYSTEM
-- Đảm bảo default status = 'pending' và chỉ fetch reels đã approved
-- =====================================================

-- 1. Đảm bảo default status = 'pending' (không phải 'approved')
DO $$
BEGIN
  -- Kiểm tra và sửa default value nếu cần
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reels' 
    AND column_name = 'status'
    AND column_default != '''pending''::text'
  ) THEN
    -- Sửa default value về 'pending'
    ALTER TABLE public.reels 
    ALTER COLUMN status SET DEFAULT 'pending';
  END IF;
END $$;

-- 2. Đảm bảo tất cả reels mới tạo có status = 'pending' nếu null
UPDATE public.reels 
SET status = 'pending' 
WHERE status IS NULL;

-- 3. Đảm bảo RLS policy chỉ cho phép xem reels đã approved
DROP POLICY IF EXISTS "Anyone can view approved reels" ON public.reels;
CREATE POLICY "Anyone can view approved reels"
  ON public.reels FOR SELECT
  USING (status = 'approved');

-- 4. Đảm bảo users có thể xem reels của chính họ (dù status là gì)
DROP POLICY IF EXISTS "Users can view their own reels" ON public.reels;
CREATE POLICY "Users can view their own reels"
  ON public.reels FOR SELECT
  USING (auth.uid() = user_id);

-- 5. Tạo function để admin approve/reject reel
CREATE OR REPLACE FUNCTION approve_reel(reel_id_param uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.reels
  SET 
    status = 'approved',
    updated_at = NOW()
  WHERE id = reel_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION reject_reel(reel_id_param uuid, reason_param text DEFAULT NULL)
RETURNS void AS $$
BEGIN
  UPDATE public.reels
  SET 
    status = 'rejected',
    moderation_reason = reason_param,
    updated_at = NOW()
  WHERE id = reel_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Tạo view để dễ quản lý reels chờ duyệt (cho admin)
CREATE OR REPLACE VIEW pending_reels AS
SELECT 
  r.id,
  r.user_id,
  r.video_url,
  r.image_url,
  r.thumbnail_url,
  r.caption,
  r.status,
  r.created_at,
  p.full_name as user_name,
  p.email as user_email
FROM public.reels r
LEFT JOIN public.profiles p ON r.user_id = p.id
WHERE r.status = 'pending'
ORDER BY r.created_at DESC;

-- 7. Đảm bảo index cho status để query nhanh
CREATE INDEX IF NOT EXISTS idx_reels_status_approved 
ON public.reels(status, created_at DESC) 
WHERE status = 'approved';

CREATE INDEX IF NOT EXISTS idx_reels_status_pending 
ON public.reels(status, created_at DESC) 
WHERE status = 'pending';

-- =====================================================
-- COMPLETED! 🎉
-- - Default status = 'pending' cho reels mới
-- - Chỉ fetch reels có status = 'approved'
-- - Users có thể xem reels của chính họ
-- - Functions để approve/reject reel
-- - View để quản lý reels chờ duyệt
-- =====================================================

