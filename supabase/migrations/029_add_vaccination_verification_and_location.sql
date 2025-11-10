-- =====================================================
-- ADD VACCINATION VERIFICATION AND LOCATION FEATURES
-- Thêm tính năng xác minh tiêm phòng và location-based matching
-- =====================================================

-- 1. Thêm các cột mới vào bảng pets
ALTER TABLE public.pets 
ADD COLUMN IF NOT EXISTS vaccination_images text[], -- Array of vaccination certificate image URLs
ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'approved' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS latitude double precision, -- Vĩ độ
ADD COLUMN IF NOT EXISTS longitude double precision, -- Kinh độ
ADD COLUMN IF NOT EXISTS verified_at timestamptz, -- Thời gian được admin duyệt
ADD COLUMN IF NOT EXISTS verified_by uuid REFERENCES public.profiles(id); -- Admin đã duyệt

-- 2. Thêm location fields vào profiles để track user location
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS latitude double precision,
ADD COLUMN IF NOT EXISTS longitude double precision,
ADD COLUMN IF NOT EXISTS location_updated_at timestamptz,
ADD COLUMN IF NOT EXISTS location_permission_granted boolean DEFAULT false;

-- 3. Tạo index để tối ưu location-based queries
CREATE INDEX IF NOT EXISTS idx_pets_verification_status ON public.pets(verification_status);
CREATE INDEX IF NOT EXISTS idx_pets_latitude ON public.pets(latitude) WHERE latitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pets_longitude ON public.pets(longitude) WHERE longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_latitude ON public.profiles(latitude) WHERE latitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_longitude ON public.profiles(longitude) WHERE longitude IS NOT NULL;

-- 5. Tạo function để tính khoảng cách Haversine (km)
CREATE OR REPLACE FUNCTION calculate_distance_km(
  lat1 double precision,
  lon1 double precision,
  lat2 double precision,
  lon2 double precision
)
RETURNS double precision AS $$
DECLARE
  earth_radius_km double precision := 6371.0;
  dlat double precision;
  dlon double precision;
  a double precision;
  c double precision;
BEGIN
  -- Convert degrees to radians
  dlat := radians(lat2 - lat1);
  dlon := radians(lon2 - lon1);
  
  -- Haversine formula
  a := sin(dlat / 2) * sin(dlat / 2) +
       cos(radians(lat1)) * cos(radians(lat2)) *
       sin(dlon / 2) * sin(dlon / 2);
  c := 2 * atan2(sqrt(a), sqrt(1 - a));
  
  RETURN earth_radius_km * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 6. Tạo function để tìm pets trong bán kính (km)
CREATE OR REPLACE FUNCTION find_pets_nearby(
  user_lat double precision,
  user_lng double precision,
  radius_km double precision DEFAULT 50,
  limit_count integer DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  name text,
  type text,
  distance_km numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.type,
    calculate_distance_km(user_lat, user_lng, p.latitude, p.longitude)::numeric(10, 2) as distance_km
  FROM public.pets p
  WHERE p.is_available = true
    AND p.verification_status = 'approved'
    AND p.latitude IS NOT NULL
    AND p.longitude IS NOT NULL
    AND calculate_distance_km(user_lat, user_lng, p.latitude, p.longitude) <= radius_km
  ORDER BY distance_km
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Tạo function để admin duyệt/reject pet vaccination
CREATE OR REPLACE FUNCTION admin_verify_pet_vaccination(
  pet_id_param uuid,
  admin_id_param uuid,
  status_param text,
  rejection_reason text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  IF status_param NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid status. Must be approved or rejected';
  END IF;

  UPDATE public.pets
  SET 
    verification_status = status_param,
    verified_at = now(),
    verified_by = admin_id_param
  WHERE id = pet_id_param;

  -- Nếu reject, có thể lưu lý do vào một bảng riêng (tùy chọn)
  -- Hoặc có thể thêm cột rejection_reason vào pets table
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Tạo trigger để tự động set verification_status = 'pending' khi có vaccination_images
CREATE OR REPLACE FUNCTION auto_set_verification_pending()
RETURNS TRIGGER AS $$
BEGIN
  -- Nếu có vaccination_images và vaccination_status là 'up_to_date' hoặc 'partial'
  IF NEW.vaccination_images IS NOT NULL 
     AND array_length(NEW.vaccination_images, 1) > 0
     AND NEW.vaccination_status IN ('up_to_date', 'partial')
     AND (OLD.verification_status IS NULL OR OLD.verification_status = 'approved') THEN
    NEW.verification_status := 'pending';
  END IF;
  
  -- Nếu không có vaccination_images hoặc vaccination_status là 'not_vaccinated' hoặc 'unknown'
  IF (NEW.vaccination_images IS NULL OR array_length(NEW.vaccination_images, 1) = 0)
     OR NEW.vaccination_status IN ('not_vaccinated', 'unknown') THEN
    NEW.verification_status := 'approved'; -- Không cần verify nếu không có vaccination
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_set_verification_pending ON public.pets;
CREATE TRIGGER trigger_auto_set_verification_pending
  BEFORE INSERT OR UPDATE ON public.pets
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_verification_pending();

-- 9. Cập nhật RLS policies để chỉ hiển thị pets đã được approved
-- (Có thể cần điều chỉnh tùy theo yêu cầu)

-- =====================================================
-- COMPLETED! 🎉
-- - Thêm vaccination_images và verification_status vào pets
-- - Thêm location fields vào pets và profiles
-- - Tạo functions để tìm pets nearby
-- - Tạo function để admin verify vaccination
-- - Auto set verification_status = 'pending' khi có vaccination images
-- =====================================================

