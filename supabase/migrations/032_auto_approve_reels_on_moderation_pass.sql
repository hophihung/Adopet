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
DECLARE
  reel_record RECORD;
BEGIN
  -- Lấy thông tin reel để kiểm tra URLs
  SELECT video_url, image_url, thumbnail_url, media_type INTO reel_record
  FROM public.reels
  WHERE id = reel_id_param;
  
  -- Kiểm tra reel có URLs hợp lệ không
  IF reel_record.media_type = 'video' THEN
    -- Video reels phải có video_url
    IF reel_record.video_url IS NULL OR reel_record.video_url = '' THEN
      -- Reject nếu không có video_url
      UPDATE public.reels
      SET 
        is_sensitive = is_sensitive_param,
        is_pet_related = is_pet_related_param,
        moderation_reason = COALESCE(moderation_reason_param, 'Video reel không có video_url'),
        status = 'rejected',
        updated_at = NOW()
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
        COALESCE(moderation_reason_param, 'Video reel không có video_url')
      );
      RETURN;
    END IF;
  ELSIF reel_record.media_type = 'image' THEN
    -- Image reels phải có image_url hoặc thumbnail_url
    IF (reel_record.image_url IS NULL OR reel_record.image_url = '') 
       AND (reel_record.thumbnail_url IS NULL OR reel_record.thumbnail_url = '') THEN
      -- Reject nếu không có image_url hoặc thumbnail_url
      UPDATE public.reels
      SET 
        is_sensitive = is_sensitive_param,
        is_pet_related = is_pet_related_param,
        moderation_reason = COALESCE(moderation_reason_param, 'Image reel không có image_url hoặc thumbnail_url'),
        status = 'rejected',
        updated_at = NOW()
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
        COALESCE(moderation_reason_param, 'Image reel không có image_url hoặc thumbnail_url')
      );
      RETURN;
    END IF;
  ELSE
    -- Reels không có media_type hoặc không có URL nào cả
    IF (reel_record.video_url IS NULL OR reel_record.video_url = '')
       AND (reel_record.image_url IS NULL OR reel_record.image_url = '')
       AND (reel_record.thumbnail_url IS NULL OR reel_record.thumbnail_url = '') THEN
      -- Reject nếu không có URL nào
      UPDATE public.reels
      SET 
        is_sensitive = is_sensitive_param,
        is_pet_related = is_pet_related_param,
        moderation_reason = COALESCE(moderation_reason_param, 'Reel không có video_url, image_url hoặc thumbnail_url'),
        status = 'rejected',
        updated_at = NOW()
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
        COALESCE(moderation_reason_param, 'Reel không có video_url, image_url hoặc thumbnail_url')
      );
      RETURN;
    END IF;
  END IF;
  
  -- Update metadata và approve/reject dựa trên moderation result
  UPDATE public.reels
  SET 
    is_sensitive = is_sensitive_param,
    is_pet_related = is_pet_related_param,
    moderation_reason = moderation_reason_param,
    updated_at = NOW(),
    -- Chỉ approve nếu moderation pass VÀ có URLs hợp lệ
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
--   - Có video_url (cho video reels) hoặc image_url/thumbnail_url (cho image reels)
-- - Reels sẽ bị reject nếu:
--   - is_sensitive = true (nhạy cảm)
--   - is_pet_related = false (không liên quan đến pet)
--   - Video reels không có video_url
--   - Image reels không có image_url hoặc thumbnail_url
--   - Reels không có URL nào cả
-- =====================================================

