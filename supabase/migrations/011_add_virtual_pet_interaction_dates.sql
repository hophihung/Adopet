-- =====================================================
-- ADD INTERACTION DATE TRACKING FOR VIRTUAL PETS
-- Thêm tracking cho feed, clean, play và minigame actions
-- =====================================================

-- Thêm columns để track last feed, clean, play và minigame date
ALTER TABLE public.virtual_pets
ADD COLUMN IF NOT EXISTS last_feed_date date,
ADD COLUMN IF NOT EXISTS last_clean_date date,
ADD COLUMN IF NOT EXISTS last_play_time timestamptz,
ADD COLUMN IF NOT EXISTS last_minigame_date date;

-- Tạo index để tối ưu queries
CREATE INDEX IF NOT EXISTS idx_virtual_pets_last_feed_date ON public.virtual_pets(last_feed_date);
CREATE INDEX IF NOT EXISTS idx_virtual_pets_last_clean_date ON public.virtual_pets(last_clean_date);
CREATE INDEX IF NOT EXISTS idx_virtual_pets_last_play_time ON public.virtual_pets(last_play_time);
CREATE INDEX IF NOT EXISTS idx_virtual_pets_last_minigame_date ON public.virtual_pets(last_minigame_date);

