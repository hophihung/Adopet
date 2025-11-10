-- =====================================================
-- FIX LOCATION COLUMN TYPES
-- Sửa kiểu dữ liệu location từ numeric sang double precision
-- =====================================================

-- 1. Nếu cột latitude/longitude đã tồn tại với kiểu numeric, đổi sang double precision
DO $$
BEGIN
  -- Kiểm tra và đổi kiểu cho pets table
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'pets' 
    AND column_name = 'latitude'
    AND data_type = 'numeric'
  ) THEN
    ALTER TABLE public.pets 
    ALTER COLUMN latitude TYPE double precision USING latitude::double precision;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'pets' 
    AND column_name = 'longitude'
    AND data_type = 'numeric'
  ) THEN
    ALTER TABLE public.pets 
    ALTER COLUMN longitude TYPE double precision USING longitude::double precision;
  END IF;

  -- Kiểm tra và đổi kiểu cho profiles table
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'latitude'
    AND data_type = 'numeric'
  ) THEN
    ALTER TABLE public.profiles 
    ALTER COLUMN latitude TYPE double precision USING latitude::double precision;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'longitude'
    AND data_type = 'numeric'
  ) THEN
    ALTER TABLE public.profiles 
    ALTER COLUMN longitude TYPE double precision USING longitude::double precision;
  END IF;
END $$;

-- 2. Drop và recreate indexes với đúng kiểu dữ liệu
DROP INDEX IF EXISTS idx_pets_location;
DROP INDEX IF EXISTS idx_profiles_location;
DROP INDEX IF EXISTS idx_pets_latitude;
DROP INDEX IF EXISTS idx_pets_longitude;
DROP INDEX IF EXISTS idx_profiles_latitude;
DROP INDEX IF EXISTS idx_profiles_longitude;

CREATE INDEX IF NOT EXISTS idx_pets_latitude ON public.pets(latitude) WHERE latitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pets_longitude ON public.pets(longitude) WHERE longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_latitude ON public.profiles(latitude) WHERE latitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_longitude ON public.profiles(longitude) WHERE longitude IS NOT NULL;

-- =====================================================
-- COMPLETED! 🎉
-- - Đổi kiểu dữ liệu location từ numeric sang double precision
-- - Recreate indexes với đúng kiểu dữ liệu
-- =====================================================

