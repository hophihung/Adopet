-- =====================================================
-- REEL ADMIN APPROVAL FLOW
-- - Ngăn tự động approve reels sau khi moderation
-- - Thêm thông tin người duyệt / từ chối
-- - Cho phép admin xem danh sách reels chờ duyệt
-- =====================================================

-- 1. Thêm cột audit cho reels (nếu chưa có)
ALTER TABLE public.reels
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz;

-- 2. Cập nhật function moderate_reel_content để KHÔNG tự approve
DROP FUNCTION IF EXISTS moderate_reel_content(UUID, BOOLEAN, BOOLEAN, NUMERIC, TEXT);

CREATE OR REPLACE FUNCTION moderate_reel_content(
  reel_id_param UUID,
  is_sensitive_param BOOLEAN,
  is_pet_related_param BOOLEAN,
  confidence_score_param NUMERIC DEFAULT NULL,
  moderation_reason_param TEXT DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  reel_record RECORD;
  rejection_reason TEXT;
BEGIN
  -- Lấy thông tin reel để kiểm tra URLs
  SELECT video_url, image_url, thumbnail_url, media_type INTO reel_record
  FROM public.reels
  WHERE id = reel_id_param;

  -- Mặc định sử dụng lý do do moderation trả về
  rejection_reason := COALESCE(moderation_reason_param, '');

  -- Validate nội dung nhạy cảm
  IF is_sensitive_param = TRUE THEN
    UPDATE public.reels
    SET 
      is_sensitive = TRUE,
      is_pet_related = is_pet_related_param,
      moderation_reason = NULLIF(rejection_reason, ''),
      status = 'rejected',
      rejected_by = NULL,
      rejected_at = NOW(),
      updated_at = NOW()
    WHERE id = reel_id_param;
    RETURN;
  END IF;

  -- Validate nội dung không liên quan đến pet
  IF is_pet_related_param = FALSE THEN
    UPDATE public.reels
    SET 
      is_sensitive = is_sensitive_param,
      is_pet_related = FALSE,
      moderation_reason = NULLIF(rejection_reason, ''),
      status = 'rejected',
      rejected_by = NULL,
      rejected_at = NOW(),
      updated_at = NOW()
    WHERE id = reel_id_param;
    RETURN;
  END IF;

  -- Validate URL hợp lệ
  IF reel_record.media_type = 'video' THEN
    IF reel_record.video_url IS NULL OR reel_record.video_url = '' THEN
      UPDATE public.reels
      SET 
        is_sensitive = is_sensitive_param,
        is_pet_related = is_pet_related_param,
        moderation_reason = 'Video reel không có video_url hợp lệ',
        status = 'rejected',
        rejected_by = NULL,
        rejected_at = NOW(),
        updated_at = NOW()
      WHERE id = reel_id_param;
      RETURN;
    END IF;
  ELSIF reel_record.media_type = 'image' THEN
    IF (reel_record.image_url IS NULL OR reel_record.image_url = '')
       AND (reel_record.thumbnail_url IS NULL OR reel_record.thumbnail_url = '') THEN
      UPDATE public.reels
      SET 
        is_sensitive = is_sensitive_param,
        is_pet_related = is_pet_related_param,
        moderation_reason = 'Image reel không có image_url/thumbnail_url hợp lệ',
        status = 'rejected',
        rejected_by = NULL,
        rejected_at = NOW(),
        updated_at = NOW()
      WHERE id = reel_id_param;
      RETURN;
    END IF;
  END IF;

  -- Nếu vượt qua moderation, chỉ cập nhật metadata và giữ status = 'pending'
  UPDATE public.reels
  SET 
    is_sensitive = is_sensitive_param,
    is_pet_related = is_pet_related_param,
    moderation_reason = NULL,
    updated_at = NOW()
  WHERE id = reel_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Cập nhật function approve_reel để lưu admin
DROP FUNCTION IF EXISTS approve_reel(UUID);

CREATE OR REPLACE FUNCTION approve_reel(
  reel_id_param uuid,
  admin_id_param uuid DEFAULT auth.uid()
)
RETURNS void AS $$
BEGIN
  UPDATE public.reels
  SET 
    status = 'approved',
    approved_by = admin_id_param,
    approved_at = NOW(),
    rejected_by = NULL,
    rejected_at = NULL,
    moderation_reason = NULL,
    updated_at = NOW()
  WHERE id = reel_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Cập nhật function reject_reel để lưu admin & lý do
DROP FUNCTION IF EXISTS reject_reel(UUID, TEXT);

CREATE OR REPLACE FUNCTION reject_reel(
  reel_id_param uuid,
  reason_param text DEFAULT NULL,
  admin_id_param uuid DEFAULT auth.uid()
)
RETURNS void AS $$
BEGIN
  UPDATE public.reels
  SET 
    status = 'rejected',
    moderation_reason = reason_param,
    rejected_by = admin_id_param,
    rejected_at = NOW(),
    updated_at = NOW()
  WHERE id = reel_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Cho phép admin xem tất cả reels để duyệt
DROP POLICY IF EXISTS "Admins can moderate reels" ON public.reels;

CREATE POLICY "Admins can moderate reels"
  ON public.reels FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (
          p.role = 'admin'
          OR p.email ILIKE '%admin%'
        )
    )
  );

-- 6. Cập nhật view pending_reels để bao gồm metadata mới
DROP VIEW IF EXISTS pending_reels;

CREATE OR REPLACE VIEW pending_reels AS
SELECT 
  r.*,
  p.full_name AS user_name,
  p.email AS user_email
FROM public.reels r
LEFT JOIN public.profiles p ON r.user_id = p.id
WHERE r.status = 'pending'
ORDER BY r.created_at DESC;

-- =====================================================
-- COMPLETED
-- - Moderation không tự approve nữa
-- - Lưu thông tin admin approve / reject
-- - Admin (role/email chứa 'admin') có thể xem reels pending
-- =====================================================

