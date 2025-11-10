-- =====================================================
-- FIX MODERATE_REEL_CONTENT AUTO APPROVE
-- Sửa function moderate_reel_content để KHÔNG tự động approve
-- Chỉ update is_sensitive và is_pet_related, giữ status = 'pending' để admin duyệt thủ công
-- =====================================================

-- Drop và recreate function moderate_reel_content
-- KHÔNG tự động approve, chỉ update metadata
DROP FUNCTION IF EXISTS moderate_reel_content(UUID, BOOLEAN, BOOLEAN, NUMERIC, TEXT);

CREATE OR REPLACE FUNCTION moderate_reel_content(
  reel_id_param UUID,
  is_sensitive_param BOOLEAN,
  is_pet_related_param BOOLEAN,
  confidence_score_param NUMERIC DEFAULT NULL,
  moderation_reason_param TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  -- Chỉ update metadata, KHÔNG thay đổi status
  -- Status sẽ được admin duyệt thủ công qua approve_reel() hoặc reject_reel()
  UPDATE public.reels
  SET 
    is_sensitive = is_sensitive_param,
    is_pet_related = is_pet_related_param,
    moderation_reason = moderation_reason_param,
    updated_at = NOW()
    -- KHÔNG set status ở đây, giữ nguyên status = 'pending'
  WHERE id = reel_id_param;

  -- Log moderation result
  INSERT INTO public.content_moderation_logs (
    reel_id,
    moderation_type,
    is_sensitive,
    is_pet_related,
    confidence_score,
    moderation_reason
  ) VALUES (
    reel_id_param,
    'video',
    is_sensitive_param,
    is_pet_related_param,
    confidence_score_param,
    moderation_reason_param
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMPLETED! 🎉
-- - Function moderate_reel_content KHÔNG tự động approve nữa
-- - Reels sẽ giữ status = 'pending' sau khi moderation
-- - Admin cần duyệt thủ công qua approve_reel() hoặc reject_reel()
-- =====================================================

