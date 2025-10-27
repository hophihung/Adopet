-- =====================================================
-- ENHANCE PETS TABLE FOR SUBSCRIPTION SYSTEM
-- Bổ sung các thuộc tính cần thiết cho hệ thống quản lý pet
-- =====================================================

-- Thêm các cột mới vào bảng pets
ALTER TABLE public.pets 
ADD COLUMN IF NOT EXISTS breed text,
ADD COLUMN IF NOT EXISTS weight_kg numeric(5,2),
ADD COLUMN IF NOT EXISTS color text,
ADD COLUMN IF NOT EXISTS health_status text CHECK (health_status IN ('healthy', 'sick', 'vaccinated', 'needs_attention')),
ADD COLUMN IF NOT EXISTS vaccination_status text CHECK (vaccination_status IN ('up_to_date', 'partial', 'not_vaccinated', 'unknown')),
ADD COLUMN IF NOT EXISTS spayed_neutered boolean,
ADD COLUMN IF NOT EXISTS microchipped boolean,
ADD COLUMN IF NOT EXISTS house_trained boolean,
ADD COLUMN IF NOT EXISTS good_with_kids boolean,
ADD COLUMN IF NOT EXISTS good_with_pets boolean,
ADD COLUMN IF NOT EXISTS energy_level text CHECK (energy_level IN ('low', 'medium', 'high')),
ADD COLUMN IF NOT EXISTS size text CHECK (size IN ('small', 'medium', 'large', 'extra_large')),
ADD COLUMN IF NOT EXISTS special_needs text,
ADD COLUMN IF NOT EXISTS adoption_fee numeric(10,2),
ADD COLUMN IF NOT EXISTS contact_phone text,
ADD COLUMN IF NOT EXISTS contact_email text,
ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS like_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS featured_until timestamptz,
ADD COLUMN IF NOT EXISTS last_viewed_at timestamptz;

-- Tạo index để tối ưu performance
CREATE INDEX IF NOT EXISTS idx_pets_seller_id ON public.pets(seller_id);
CREATE INDEX IF NOT EXISTS idx_pets_type ON public.pets(type);
CREATE INDEX IF NOT EXISTS idx_pets_is_available ON public.pets(is_available);
CREATE INDEX IF NOT EXISTS idx_pets_created_at ON public.pets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pets_price ON public.pets(price);
CREATE INDEX IF NOT EXISTS idx_pets_location ON public.pets(location);
CREATE INDEX IF NOT EXISTS idx_pets_is_featured ON public.pets(is_featured);
CREATE INDEX IF NOT EXISTS idx_pets_view_count ON public.pets(view_count DESC);
CREATE INDEX IF NOT EXISTS idx_pets_like_count ON public.pets(like_count DESC);

-- Tạo bảng pet_likes để theo dõi lượt thích
CREATE TABLE IF NOT EXISTS public.pet_likes (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  pet_id uuid REFERENCES public.pets(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(pet_id, user_id) -- Prevent duplicate likes
);

-- Enable RLS cho pet_likes
ALTER TABLE public.pet_likes ENABLE ROW LEVEL SECURITY;

-- Policies cho pet_likes
CREATE POLICY "Anyone can view pet_likes"
  ON public.pet_likes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can like pets"
  ON public.pet_likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike their own likes"
  ON public.pet_likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Tạo bảng pet_views để theo dõi lượt xem
CREATE TABLE IF NOT EXISTS public.pet_views (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  pet_id uuid REFERENCES public.pets(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address inet,
  user_agent text,
  viewed_at timestamptz DEFAULT now()
);

-- Enable RLS cho pet_views
ALTER TABLE public.pet_views ENABLE ROW LEVEL SECURITY;

-- Policies cho pet_views
CREATE POLICY "Anyone can view pet_views"
  ON public.pet_views FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create pet_views"
  ON public.pet_views FOR INSERT
  USING (true);

-- Tạo function để cập nhật view_count
CREATE OR REPLACE FUNCTION update_pet_view_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.pets 
  SET view_count = view_count + 1,
      last_viewed_at = now()
  WHERE id = NEW.pet_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger để tự động cập nhật view_count
DROP TRIGGER IF EXISTS trigger_update_pet_view_count ON public.pet_views;
CREATE TRIGGER trigger_update_pet_view_count
  AFTER INSERT ON public.pet_views
  FOR EACH ROW
  EXECUTE FUNCTION update_pet_view_count();

-- Tạo function để cập nhật like_count
CREATE OR REPLACE FUNCTION update_pet_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.pets SET like_count = like_count + 1 WHERE id = NEW.pet_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.pets SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.pet_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger để tự động cập nhật like_count
DROP TRIGGER IF EXISTS trigger_update_pet_like_count ON public.pet_likes;
CREATE TRIGGER trigger_update_pet_like_count
  AFTER INSERT OR DELETE ON public.pet_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_pet_like_count();

-- Tạo function để kiểm tra giới hạn pet theo subscription
CREATE OR REPLACE FUNCTION check_pet_limit()
RETURNS TRIGGER AS $$
DECLARE
  current_count integer;
  user_plan text;
  pet_limit integer;
BEGIN
  -- Lấy subscription plan của user
  SELECT s.plan INTO user_plan
  FROM public.subscriptions s
  WHERE s.profile_id = NEW.seller_id
    AND s.status = 'active'
  ORDER BY s.created_at DESC
  LIMIT 1;
  
  -- Nếu không có subscription, mặc định là free
  IF user_plan IS NULL THEN
    user_plan := 'free';
  END IF;
  
  -- Xác định giới hạn theo plan
  CASE user_plan
    WHEN 'free' THEN pet_limit := 4;
    WHEN 'premium' THEN pet_limit := 6;
    WHEN 'pro' THEN pet_limit := 9;
    ELSE pet_limit := 4;
  END CASE;
  
  -- Đếm số pet hiện tại của user
  SELECT COUNT(*) INTO current_count
  FROM public.pets
  WHERE seller_id = NEW.seller_id;
  
  -- Kiểm tra giới hạn
  IF current_count >= pet_limit THEN
    RAISE EXCEPTION 'User has reached the pet limit for their subscription plan (%)', user_plan;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger để kiểm tra giới hạn pet khi tạo mới
DROP TRIGGER IF EXISTS trigger_check_pet_limit ON public.pets;
CREATE TRIGGER trigger_check_pet_limit
  BEFORE INSERT ON public.pets
  FOR EACH ROW
  EXECUTE FUNCTION check_pet_limit();

-- Cập nhật policies để cho phép tất cả authenticated users tạo pet (không chỉ seller)
DROP POLICY IF EXISTS "Sellers can create pets" ON public.pets;
CREATE POLICY "Authenticated users can create pets"
  ON public.pets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = seller_id);

-- Thêm policy để cho phép tất cả users xem pets (không chỉ available)
DROP POLICY IF EXISTS "Pets are viewable by everyone" ON public.pets;
CREATE POLICY "Anyone can view pets"
  ON public.pets FOR SELECT
  USING (true);

-- Thêm policy để user có thể xem pets của mình (kể cả không available)
CREATE POLICY "Users can view own pets"
  ON public.pets FOR SELECT
  USING (auth.uid() = seller_id);

-- Enable realtime cho các bảng mới
ALTER PUBLICATION supabase_realtime ADD TABLE public.pet_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pet_views;

-- =====================================================
-- COMPLETED! 🎉
-- Run this in Supabase SQL Editor
-- =====================================================
