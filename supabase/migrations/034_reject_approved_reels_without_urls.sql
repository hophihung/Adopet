-- =====================================================
-- REJECT APPROVED REELS WITHOUT VALID URLs
-- Reject các reels đã được approve nhưng không có video_url hoặc image_url
-- =====================================================

-- Reject các reels approved mà không có video_url hoặc image_url
UPDATE public.reels
SET 
  status = 'rejected',
  moderation_reason = 'Reel được approve nhưng không có video_url hoặc image_url hợp lệ',
  updated_at = NOW()
WHERE status = 'approved'
  AND (
    -- Video reels không có video_url
    (media_type = 'video' AND (video_url IS NULL OR video_url = ''))
    OR
    -- Image reels không có image_url hoặc thumbnail_url
    (media_type = 'image' AND (image_url IS NULL OR image_url = '') AND (thumbnail_url IS NULL OR thumbnail_url = ''))
    OR
    -- Reels không có media_type hoặc không có URL nào cả
    (
      (media_type IS NULL OR media_type = '')
      AND (video_url IS NULL OR video_url = '')
      AND (image_url IS NULL OR image_url = '')
      AND (thumbnail_url IS NULL OR thumbnail_url = '')
    )
  );

-- Log số lượng reels bị reject
DO $$
DECLARE
  rejected_count INTEGER;
BEGIN
  GET DIAGNOSTICS rejected_count = ROW_COUNT;
  RAISE NOTICE 'Rejected % approved reels without valid URLs', rejected_count;
END $$;

-- =====================================================
-- COMPLETED! 🎉
-- - Các reels approved mà không có video_url/image_url hợp lệ đã bị reject
-- - Video reels phải có video_url
-- - Image reels phải có image_url hoặc thumbnail_url
-- =====================================================

