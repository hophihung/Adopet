-- =====================================================
-- ADD NEARBY PETS FEATURE
-- Thêm tính năng tìm pets gần nhau với search radius để giao dịch
-- =====================================================

-- 1. Thêm cột search_radius_km vào profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS search_radius_km double precision DEFAULT 50 CHECK (search_radius_km >= 1 AND search_radius_km <= 500);

-- 2. Tạo function để tìm pets gần nhau (của những người trong phạm vi)
CREATE OR REPLACE FUNCTION find_nearby_pets(
  user_id_param uuid,
  radius_km double precision DEFAULT NULL,
  limit_count integer DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  seller_id uuid,
  name text,
  type text,
  age_months integer,
  breed text,
  gender text,
  description text,
  location text,
  price numeric,
  images text[],
  is_available boolean,
  distance_km numeric,
  seller_name text,
  seller_avatar_url text,
  created_at timestamptz
) AS $$
DECLARE
  user_lat double precision;
  user_lng double precision;
  search_radius double precision;
BEGIN
  -- Lấy location của user hiện tại
  SELECT latitude, longitude, COALESCE(search_radius_km, 50)
  INTO user_lat, user_lng, search_radius
  FROM public.profiles
  WHERE id = user_id_param;

  -- Nếu không có location, return empty
  IF user_lat IS NULL OR user_lng IS NULL THEN
    RETURN;
  END IF;

  -- Sử dụng radius từ parameter hoặc từ profile
  IF radius_km IS NOT NULL THEN
    search_radius := radius_km;
  END IF;

  -- Tìm pets của những người gần nhau (không bao gồm chính user đó)
  RETURN QUERY
  SELECT 
    p.id,
    p.seller_id,
    p.name,
    p.type,
    p.age_months,
    p.breed,
    p.gender,
    p.description,
    p.location,
    p.price,
    p.images,
    p.is_available,
    calculate_distance_km(user_lat, user_lng, seller_profile.latitude, seller_profile.longitude)::numeric(10, 2) as distance_km,
    seller_profile.full_name as seller_name,
    seller_profile.avatar_url as seller_avatar_url,
    p.created_at
  FROM public.pets p
  INNER JOIN public.profiles seller_profile ON p.seller_id = seller_profile.id
  WHERE p.seller_id != user_id_param
    AND p.is_available = true
    AND seller_profile.latitude IS NOT NULL
    AND seller_profile.longitude IS NOT NULL
    AND calculate_distance_km(user_lat, user_lng, seller_profile.latitude, seller_profile.longitude) <= search_radius
  ORDER BY distance_km ASC, p.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Tạo index để tối ưu performance (nếu chưa có)
CREATE INDEX IF NOT EXISTS idx_profiles_location_composite 
ON public.profiles(latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- 4. Tạo index cho search_radius_km
CREATE INDEX IF NOT EXISTS idx_profiles_search_radius 
ON public.profiles(search_radius_km) 
WHERE search_radius_km IS NOT NULL;

-- =====================================================
-- COMPLETED! 🎉
-- - Thêm search_radius_km column vào profiles (1-500km)
-- - Tạo function find_nearby_pets để tìm pets của người gần nhau
-- - Tạo indexes để tối ưu performance
-- =====================================================

