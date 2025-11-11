-- =====================================================
-- AUTO APPROVE REELS ON MODERATION PASS
-- Tự động approve reels nếu moderation pass (is_sensitive = false và is_pet_related = true)
-- =====================================================

-- Update function moderate_reel_content để tự động approve nếu moderation pass
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
  -- Update metadata
  UPDATE public.reels
  SET 
    is_sensitive = is_sensitive_param,
    is_pet_related = is_pet_related_param,
    moderation_reason = moderation_reason_param,
    updated_at = NOW(),
    -- Tự động approve nếu moderation pass (không nhạy cảm và liên quan đến pet)
    status = CASE
      WHEN is_sensitive_param = false AND is_pet_related_param = true THEN 'approved'
      WHEN is_sensitive_param = true THEN 'rejected'
      WHEN is_pet_related_param = false THEN 'rejected'
      ELSE 'pending' -- Giữ pending nếu có vấn đề
    END
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
-- - Function moderate_reel_content sẽ tự động approve reels nếu:
--   - is_sensitive = false (không nhạy cảm)
--   - is_pet_related = true (liên quan đến pet)
-- - Reels sẽ bị reject nếu:
--   - is_sensitive = true (nhạy cảm)
--   - is_pet_related = false (không liên quan đến pet)
-- =====================================================

