-- =====================================================
-- ADD PET PASSES TABLE
-- Theo dõi các pet đã pass (swipe left) để không hiển thị lại
-- Giống như Tinder - một lần pass là vĩnh viễn
-- =====================================================

-- Tạo bảng pet_passes để theo dõi các pet đã pass
CREATE TABLE IF NOT EXISTS public.pet_passes (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  pet_id uuid REFERENCES public.pets(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  passed_at timestamptz DEFAULT now(),
  UNIQUE(pet_id, user_id) -- Prevent duplicate passes
);

-- Enable RLS cho pet_passes
ALTER TABLE public.pet_passes ENABLE ROW LEVEL SECURITY;

-- Policies cho pet_passes
CREATE POLICY "Users can view their own passes"
  ON public.pet_passes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can pass pets"
  ON public.pet_passes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_pet_passes_user_id ON public.pet_passes(user_id);
CREATE INDEX IF NOT EXISTS idx_pet_passes_pet_id ON public.pet_passes(pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_passes_passed_at ON public.pet_passes(passed_at DESC);

-- =====================================================
-- COMPLETED! 🎉
-- Bây giờ có thể track các pet đã pass và filter chúng ra khỏi danh sách
-- =====================================================

