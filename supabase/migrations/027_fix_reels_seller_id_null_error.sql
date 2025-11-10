-- =====================================================
-- FIX REELS SELLER_ID NULL ERROR
-- Sửa lỗi "null value in column seller_id violates not-null constraint"
-- Đảm bảo bảng reels chỉ dùng user_id, không dùng seller_id
-- =====================================================

-- 1. Kiểm tra và migrate từ seller_id sang user_id nếu cần
DO $$
BEGIN
  -- Nếu có cột seller_id nhưng chưa có user_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reels' 
    AND column_name = 'seller_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reels' 
    AND column_name = 'user_id'
  ) THEN
    -- Thêm cột user_id
    ALTER TABLE public.reels 
    ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    
    -- Migrate data: seller_id -> user_id (seller_id là profiles.id = auth.users.id)
    UPDATE public.reels 
    SET user_id = seller_id 
    WHERE user_id IS NULL;
    
    -- Make user_id NOT NULL
    ALTER TABLE public.reels 
    ALTER COLUMN user_id SET NOT NULL;
    
    -- Drop NOT NULL constraint từ seller_id (nếu có)
    ALTER TABLE public.reels 
    ALTER COLUMN seller_id DROP NOT NULL;
  END IF;
  
  -- Nếu có cả seller_id và user_id, đảm bảo user_id được set từ seller_id nếu null
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reels' 
    AND column_name = 'seller_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reels' 
    AND column_name = 'user_id'
  ) THEN
    -- Update user_id từ seller_id nếu user_id null
    UPDATE public.reels 
    SET user_id = seller_id 
    WHERE user_id IS NULL AND seller_id IS NOT NULL;
    
    -- Drop NOT NULL constraint từ seller_id
    ALTER TABLE public.reels 
    ALTER COLUMN seller_id DROP NOT NULL;
  END IF;
END $$;

-- 2. Đảm bảo user_id có NOT NULL constraint
DO $$
BEGIN
  -- Kiểm tra xem user_id có NOT NULL constraint chưa
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reels' 
    AND column_name = 'user_id'
    AND is_nullable = 'YES'
  ) THEN
    -- Set NOT NULL cho user_id
    ALTER TABLE public.reels 
    ALTER COLUMN user_id SET NOT NULL;
  END IF;
END $$;

-- 3. Tạo trigger để tự động set user_id từ seller_id nếu có (backward compatibility)
CREATE OR REPLACE FUNCTION ensure_reel_user_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Nếu user_id null nhưng có seller_id, set user_id = seller_id
  IF NEW.user_id IS NULL AND NEW.seller_id IS NOT NULL THEN
    NEW.user_id := NEW.seller_id;
  END IF;
  
  -- Nếu seller_id null nhưng có user_id, set seller_id = user_id (backward compatibility)
  IF NEW.seller_id IS NULL AND NEW.user_id IS NOT NULL THEN
    NEW.seller_id := NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger cũ nếu có
DROP TRIGGER IF EXISTS trigger_ensure_reel_user_id ON public.reels;

-- Tạo trigger mới
CREATE TRIGGER trigger_ensure_reel_user_id
  BEFORE INSERT OR UPDATE ON public.reels
  FOR EACH ROW
  EXECUTE FUNCTION ensure_reel_user_id();

-- =====================================================
-- COMPLETED! 🎉
-- - Đảm bảo user_id được set đúng khi insert
-- - Tạo trigger để tự động sync user_id và seller_id
-- - Drop NOT NULL constraint từ seller_id nếu có
-- =====================================================

