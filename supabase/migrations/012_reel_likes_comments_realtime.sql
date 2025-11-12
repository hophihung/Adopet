/*
  # Reel Likes, Comments và Realtime System
  
  1. Bảng mới
    - `reel_likes`: Track likes cho reels
    - `reel_comments`: Comments cho reels
  
  2. Functions & Triggers
    - Auto-update likes_count và comments_count
    - Realtime subscriptions
  
  3. RLS Policies
    - Cho phép authenticated users like/comment
    - Cho phép mọi người xem likes/comments
*/

-- =====================================================
-- TABLE: reel_likes
-- Track likes cho reels
-- =====================================================
CREATE TABLE IF NOT EXISTS public.reel_likes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  reel_id uuid REFERENCES public.reels(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(reel_id, user_id) -- Prevent duplicate likes
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reel_likes_reel_id ON public.reel_likes(reel_id);
CREATE INDEX IF NOT EXISTS idx_reel_likes_user_id ON public.reel_likes(user_id);

-- Enable RLS
ALTER TABLE public.reel_likes ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view reel_likes"
  ON public.reel_likes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert reel_likes"
  ON public.reel_likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reel_likes"
  ON public.reel_likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =====================================================
-- TABLE: reel_comments
-- Comments cho reels
-- =====================================================
CREATE TABLE IF NOT EXISTS public.reel_comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  reel_id uuid REFERENCES public.reels(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reel_comments_reel_id ON public.reel_comments(reel_id);
CREATE INDEX IF NOT EXISTS idx_reel_comments_user_id ON public.reel_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_reel_comments_created_at ON public.reel_comments(created_at DESC);

-- Enable RLS
ALTER TABLE public.reel_comments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view reel_comments"
  ON public.reel_comments FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert reel_comments"
  ON public.reel_comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reel_comments"
  ON public.reel_comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reel_comments"
  ON public.reel_comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =====================================================
-- TRIGGERS: Auto-update likes_count và comments_count
-- =====================================================

-- Function to update reel likes_count
CREATE OR REPLACE FUNCTION update_reel_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.reels SET likes_count = likes_count + 1 WHERE id = NEW.reel_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.reels SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.reel_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for reel_likes
DROP TRIGGER IF EXISTS trigger_update_reel_likes_count ON public.reel_likes;
CREATE TRIGGER trigger_update_reel_likes_count
AFTER INSERT OR DELETE ON public.reel_likes
FOR EACH ROW
EXECUTE FUNCTION update_reel_likes_count();

-- Function to update reel comments_count
CREATE OR REPLACE FUNCTION update_reel_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.reels SET comments_count = comments_count + 1 WHERE id = NEW.reel_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.reels SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.reel_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for reel_comments
DROP TRIGGER IF EXISTS trigger_update_reel_comments_count ON public.reel_comments;
CREATE TRIGGER trigger_update_reel_comments_count
AFTER INSERT OR DELETE ON public.reel_comments
FOR EACH ROW
EXECUTE FUNCTION update_reel_comments_count();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_reel_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_reel_comments_updated_at ON public.reel_comments;
CREATE TRIGGER trigger_update_reel_comments_updated_at
BEFORE UPDATE ON public.reel_comments
FOR EACH ROW
EXECUTE FUNCTION update_reel_comments_updated_at();

-- =====================================================
-- Add comments_count column to reels table if not exists
-- =====================================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reels' 
    AND column_name = 'comments_count'
  ) THEN
    ALTER TABLE public.reels ADD COLUMN comments_count integer DEFAULT 0;
  END IF;
END $$;

-- =====================================================
-- ENABLE REALTIME
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.reels;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reel_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reel_comments;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE public.reel_likes IS 'Track likes cho reels';
COMMENT ON TABLE public.reel_comments IS 'Comments cho reels';
COMMENT ON FUNCTION update_reel_likes_count IS 'Auto-update likes_count khi có like/unlike';
COMMENT ON FUNCTION update_reel_comments_count IS 'Auto-update comments_count khi có comment mới/xóa';

