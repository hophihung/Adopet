-- =====================================================
-- APPROVE PENDING REELS WITH VALID MODERATION
-- Approve các reels đang pending nhưng đã có moderation result pass
-- =====================================================

-- Approve các reels pending mà đã được moderation và pass (không nhạy cảm và liên quan đến pet)
UPDATE public.reels
SET 
  status = 'approved',
  updated_at = NOW()
WHERE status = 'pending'
  AND is_sensitive = false
  AND is_pet_related = true
  AND (
    -- Có video_url hoặc image_url
    (video_url IS NOT NULL AND video_url != '')
    OR (image_url IS NOT NULL AND image_url != '')
  );

-- Log số lượng reels được approve
DO $$
DECLARE
  approved_count INTEGER;
BEGIN
  GET DIAGNOSTICS approved_count = ROW_COUNT;
  RAISE NOTICE 'Approved % pending reels with valid moderation', approved_count;
END $$;

-- =====================================================
-- COMPLETED! 🎉
-- - Các reels pending với moderation pass (is_sensitive = false, is_pet_related = true) 
--   đã được tự động approve
-- - Reels phải có video_url hoặc image_url để được approve
-- =====================================================

