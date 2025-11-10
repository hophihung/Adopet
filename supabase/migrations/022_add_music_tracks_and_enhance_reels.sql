-- =====================================================
-- ADD MUSIC TRACKS AND ENHANCE REELS
-- Thêm tính năng nhạc cho reels và hỗ trợ cả image/video
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLE: music_tracks
-- Quản lý nhạc nền cho reels
-- =====================================================
CREATE TABLE IF NOT EXISTS public.music_tracks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  audio_url TEXT NOT NULL, -- URL từ Supabase Storage
  cover_image_url TEXT, -- Ảnh bìa nhạc
  duration INTEGER NOT NULL, -- Thời lượng (giây)
  is_premium BOOLEAN DEFAULT false, -- true = cần subscription, false = miễn phí
  category TEXT, -- Thể loại: pop, edm, acoustic, etc.
  tags TEXT[], -- Tags để search
  usage_count INTEGER DEFAULT 0, -- Số lần được sử dụng
  is_active BOOLEAN DEFAULT true, -- Có hiển thị không
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ALTER TABLE: reels
-- Thêm các cột mới cho image/video và nhạc
-- =====================================================
DO $$ 
BEGIN
  -- Add media_type column (image or video)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reels' 
    AND column_name = 'media_type'
  ) THEN
    ALTER TABLE public.reels 
    ADD COLUMN media_type TEXT DEFAULT 'video' CHECK (media_type IN ('image', 'video'));
  END IF;

  -- Add image_url column (for image reels)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reels' 
    AND column_name = 'image_url'
  ) THEN
    ALTER TABLE public.reels 
    ADD COLUMN image_url TEXT;
  END IF;

  -- Make video_url nullable (vì có thể là image)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reels' 
    AND column_name = 'video_url'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.reels 
    ALTER COLUMN video_url DROP NOT NULL;
  END IF;

  -- Add music_track_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reels' 
    AND column_name = 'music_track_id'
  ) THEN
    ALTER TABLE public.reels 
    ADD COLUMN music_track_id UUID REFERENCES public.music_tracks(id) ON DELETE SET NULL;
  END IF;

  -- Add music_start_time column (để sync nhạc với video, tính bằng giây)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reels' 
    AND column_name = 'music_start_time'
  ) THEN
    ALTER TABLE public.reels 
    ADD COLUMN music_start_time INTEGER DEFAULT 0;
  END IF;

  -- Add music_volume column (0.0 - 1.0)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reels' 
    AND column_name = 'music_volume'
  ) THEN
    ALTER TABLE public.reels 
    ADD COLUMN music_volume NUMERIC(3, 2) DEFAULT 0.5 CHECK (music_volume >= 0 AND music_volume <= 1);
  END IF;
END $$;

-- =====================================================
-- INDEXES for performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_music_tracks_is_premium ON public.music_tracks(is_premium, is_active);
CREATE INDEX IF NOT EXISTS idx_music_tracks_category ON public.music_tracks(category) WHERE category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_music_tracks_tags ON public.music_tracks USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_reels_media_type ON public.reels(media_type);
CREATE INDEX IF NOT EXISTS idx_reels_music_track_id ON public.reels(music_track_id);

-- =====================================================
-- FUNCTION: Increment music track usage
-- =====================================================
CREATE OR REPLACE FUNCTION increment_music_track_usage(track_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.music_tracks
  SET usage_count = usage_count + 1,
      updated_at = NOW()
  WHERE id = track_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: Get available music tracks for user
-- Trả về nhạc free + nhạc premium nếu user có subscription
-- =====================================================
CREATE OR REPLACE FUNCTION get_available_music_tracks(user_id_param UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  artist TEXT,
  audio_url TEXT,
  cover_image_url TEXT,
  duration INTEGER,
  is_premium BOOLEAN,
  category TEXT,
  tags TEXT[],
  usage_count INTEGER,
  can_use BOOLEAN -- true nếu user có thể dùng (free hoặc có subscription)
) AS $$
DECLARE
  has_subscription BOOLEAN := false;
BEGIN
  -- Check if user has active premium subscription
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    JOIN public.subscription_plans sp ON s.plan_id = sp.id
    WHERE s.profile_id = user_id_param
      AND s.status = 'active'
      AND sp.name != 'free'
  ) INTO has_subscription;

  -- Return all tracks that user can use
  RETURN QUERY
  SELECT 
    mt.id,
    mt.title,
    mt.artist,
    mt.audio_url,
    mt.cover_image_url,
    mt.duration,
    mt.is_premium,
    mt.category,
    mt.tags,
    mt.usage_count,
    (NOT mt.is_premium OR has_subscription) as can_use
  FROM public.music_tracks mt
  WHERE mt.is_active = true
  ORDER BY mt.is_premium ASC, mt.usage_count DESC, mt.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- RLS POLICIES for music_tracks
-- =====================================================
ALTER TABLE public.music_tracks ENABLE ROW LEVEL SECURITY;

-- Anyone can view music tracks (public)
CREATE POLICY "Anyone can view music tracks"
  ON public.music_tracks FOR SELECT
  USING (is_active = true);

-- Only admins can insert/update/delete (sẽ implement sau)
-- CREATE POLICY "Admins can manage music tracks"
--   ON public.music_tracks FOR ALL
--   TO authenticated
--   USING (
--     EXISTS (
--       SELECT 1 FROM public.profiles
--       WHERE id = auth.uid() AND role = 'admin'
--     )
--   );

-- =====================================================
-- TRIGGER: Update music_tracks updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_music_tracks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_music_tracks_updated_at ON public.music_tracks;
CREATE TRIGGER trigger_update_music_tracks_updated_at
BEFORE UPDATE ON public.music_tracks
FOR EACH ROW
EXECUTE FUNCTION update_music_tracks_updated_at();

-- =====================================================
-- TRIGGER: Increment music track usage when reel is created
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_increment_music_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.music_track_id IS NOT NULL THEN
    PERFORM increment_music_track_usage(NEW.music_track_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_increment_music_usage_on_reel_insert ON public.reels;
CREATE TRIGGER trigger_increment_music_usage_on_reel_insert
AFTER INSERT ON public.reels
FOR EACH ROW
WHEN (NEW.music_track_id IS NOT NULL)
EXECUTE FUNCTION trigger_increment_music_usage();

-- =====================================================
-- SAMPLE DATA: Insert some free music tracks
-- =====================================================
INSERT INTO public.music_tracks (title, artist, audio_url, duration, is_premium, category, tags)
VALUES
  ('Upbeat Pop', 'Free Music', 'music/upbeat-pop.mp3', 30, false, 'pop', ARRAY['happy', 'energetic', 'pop']),
  ('Acoustic Chill', 'Free Music', 'music/acoustic-chill.mp3', 45, false, 'acoustic', ARRAY['chill', 'relaxing', 'acoustic']),
  ('Electronic Vibes', 'Free Music', 'music/electronic-vibes.mp3', 60, false, 'edm', ARRAY['electronic', 'dance', 'edm'])
ON CONFLICT DO NOTHING;

-- =====================================================
-- COMPLETED! 🎉
-- Music tracks system is ready
-- =====================================================

