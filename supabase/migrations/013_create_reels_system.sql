-- =====================================================
-- CREATE REELS SYSTEM WITH CONTENT MODERATION
-- Hệ thống reels (video) với like, comment realtime và content moderation
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLE: reels
-- Video reels by users
-- =====================================================
CREATE TABLE IF NOT EXISTS public.reels (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  caption TEXT,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  duration INTEGER, -- Duration in seconds
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'flagged')),
  moderation_reason TEXT, -- Reason if rejected/flagged
  is_sensitive BOOLEAN DEFAULT false,
  is_pet_related BOOLEAN DEFAULT true, -- AI detection result
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ALTER TABLE: Migrate from old structure to new structure
-- Handle existing table with seller_id/pet_id -> user_id
-- =====================================================
DO $$ 
BEGIN
  -- Check if table has old structure (seller_id) and migrate to user_id
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
    -- Add user_id column
    ALTER TABLE public.reels 
    ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    
    -- Migrate data: seller_id -> user_id (seller_id is profiles.id, which should match auth.users.id)
    UPDATE public.reels 
    SET user_id = seller_id 
    WHERE user_id IS NULL;
    
    -- Make user_id NOT NULL after migration
    ALTER TABLE public.reels 
    ALTER COLUMN user_id SET NOT NULL;
  END IF;

  -- Rename views_count to view_count if exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reels' 
    AND column_name = 'views_count'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reels' 
    AND column_name = 'view_count'
  ) THEN
    ALTER TABLE public.reels 
    RENAME COLUMN views_count TO view_count;
  END IF;

  -- Rename likes_count to like_count if exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reels' 
    AND column_name = 'likes_count'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reels' 
    AND column_name = 'like_count'
  ) THEN
    ALTER TABLE public.reels 
    RENAME COLUMN likes_count TO like_count;
  END IF;

  -- Add comment_count if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reels' 
    AND column_name = 'comment_count'
  ) THEN
    ALTER TABLE public.reels 
    ADD COLUMN comment_count INTEGER DEFAULT 0;
  END IF;

  -- Add duration if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reels' 
    AND column_name = 'duration'
  ) THEN
    ALTER TABLE public.reels 
    ADD COLUMN duration INTEGER;
  END IF;

  -- Add status column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reels' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE public.reels 
    ADD COLUMN status TEXT DEFAULT 'pending';
  END IF;
  
  -- Add check constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_schema = 'public' 
    AND table_name = 'reels' 
    AND constraint_name = 'reels_status_check'
  ) THEN
    ALTER TABLE public.reels 
    ADD CONSTRAINT reels_status_check 
    CHECK (status IN ('pending', 'approved', 'rejected', 'flagged'));
  END IF;

  -- Add moderation_reason if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reels' 
    AND column_name = 'moderation_reason'
  ) THEN
    ALTER TABLE public.reels 
    ADD COLUMN moderation_reason TEXT;
  END IF;

  -- Add is_sensitive if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reels' 
    AND column_name = 'is_sensitive'
  ) THEN
    ALTER TABLE public.reels 
    ADD COLUMN is_sensitive BOOLEAN DEFAULT false;
  END IF;

  -- Add is_pet_related if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reels' 
    AND column_name = 'is_pet_related'
  ) THEN
    ALTER TABLE public.reels 
    ADD COLUMN is_pet_related BOOLEAN DEFAULT true;
  END IF;

  -- Add updated_at if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reels' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.reels 
    ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- =====================================================
-- TABLE: reel_likes
-- Likes on reels
-- =====================================================
CREATE TABLE IF NOT EXISTS public.reel_likes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  reel_id UUID REFERENCES public.reels(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(reel_id, user_id) -- Prevent duplicate likes
);

-- =====================================================
-- TABLE: reel_comments
-- Comments on reels
-- =====================================================
CREATE TABLE IF NOT EXISTS public.reel_comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  reel_id UUID REFERENCES public.reels(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLE: content_moderation_logs
-- Log content moderation results
-- =====================================================
CREATE TABLE IF NOT EXISTS public.content_moderation_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  reel_id UUID REFERENCES public.reels(id) ON DELETE CASCADE,
  moderation_type TEXT NOT NULL CHECK (moderation_type IN ('image', 'video')),
  is_sensitive BOOLEAN DEFAULT false,
  is_pet_related BOOLEAN DEFAULT true,
  confidence_score NUMERIC(5, 2), -- AI confidence score (0-100)
  moderation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.reels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reel_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reel_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_moderation_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Drop old policies if they exist (from old structure)
DROP POLICY IF EXISTS "Reels are viewable by everyone" ON public.reels;
DROP POLICY IF EXISTS "Sellers can create reels" ON public.reels;
DROP POLICY IF EXISTS "Sellers can update own reels" ON public.reels;

-- Policies for reels
CREATE POLICY "Anyone can view approved reels"
  ON public.reels FOR SELECT
  USING (status = 'approved');

CREATE POLICY "Users can view their own reels"
  ON public.reels FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can create reels"
  ON public.reels FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reels"
  ON public.reels FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reels"
  ON public.reels FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for reel_likes
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

-- Policies for reel_comments
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
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reel_comments"
  ON public.reel_comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for content_moderation_logs (admin only)
CREATE POLICY "Users can view their own moderation logs"
  ON public.content_moderation_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.reels 
      WHERE reels.id = content_moderation_logs.reel_id 
      AND reels.user_id = auth.uid()
    )
  );

-- =====================================================
-- TRIGGERS: Auto-update counts
-- =====================================================

-- Function to update like_count
CREATE OR REPLACE FUNCTION update_reel_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.reels SET like_count = like_count + 1 WHERE id = NEW.reel_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.reels SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.reel_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for reel_likes
DROP TRIGGER IF EXISTS trigger_update_reel_like_count ON public.reel_likes;
CREATE TRIGGER trigger_update_reel_like_count
AFTER INSERT OR DELETE ON public.reel_likes
FOR EACH ROW
EXECUTE FUNCTION update_reel_like_count();

-- Function to update comment_count
CREATE OR REPLACE FUNCTION update_reel_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.reels SET comment_count = comment_count + 1 WHERE id = NEW.reel_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.reels SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.reel_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for comments
DROP TRIGGER IF EXISTS trigger_update_reel_comment_count ON public.reel_comments;
CREATE TRIGGER trigger_update_reel_comment_count
AFTER INSERT OR DELETE ON public.reel_comments
FOR EACH ROW
EXECUTE FUNCTION update_reel_comment_count();

-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_reels_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_reels_updated_at ON public.reels;
CREATE TRIGGER trigger_update_reels_updated_at
BEFORE UPDATE ON public.reels
FOR EACH ROW
EXECUTE FUNCTION update_reels_updated_at();

-- Function to update reel_comments updated_at
CREATE OR REPLACE FUNCTION update_reel_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_reel_comments_updated_at ON public.reel_comments;
CREATE TRIGGER trigger_update_reel_comments_updated_at
BEFORE UPDATE ON public.reel_comments
FOR EACH ROW
EXECUTE FUNCTION update_reel_comments_updated_at();

-- =====================================================
-- FUNCTION: Increment view count
-- =====================================================
CREATE OR REPLACE FUNCTION increment_reel_view(reel_id_param UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.reels
  SET view_count = view_count + 1
  WHERE id = reel_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: Moderate content (for AI integration)
-- =====================================================
CREATE OR REPLACE FUNCTION moderate_reel_content(
  reel_id_param UUID,
  is_sensitive_param BOOLEAN,
  is_pet_related_param BOOLEAN,
  confidence_score_param NUMERIC DEFAULT NULL,
  moderation_reason_param TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  -- Update reel status
  UPDATE public.reels
  SET 
    is_sensitive = is_sensitive_param,
    is_pet_related = is_pet_related_param,
    status = CASE
      WHEN is_sensitive_param = true THEN 'rejected'
      WHEN is_pet_related_param = false THEN 'rejected'
      ELSE 'approved'
    END,
    moderation_reason = moderation_reason_param,
    updated_at = NOW()
  WHERE id = reel_id_param;

  -- Log moderation result
  INSERT INTO public.content_moderation_logs (
    reel_id,
    moderation_type,
    is_sensitive,
    is_pet_related,
    confidence_score,
    moderation_reason
  ) VALUES (
    reel_id_param,
    'video',
    is_sensitive_param,
    is_pet_related_param,
    confidence_score_param,
    moderation_reason_param
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- INDEXES for performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_reels_user_id ON public.reels(user_id);
CREATE INDEX IF NOT EXISTS idx_reels_status ON public.reels(status);
CREATE INDEX IF NOT EXISTS idx_reels_created_at ON public.reels(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reels_approved ON public.reels(status, created_at DESC) WHERE status = 'approved';
CREATE INDEX IF NOT EXISTS idx_reel_likes_reel_id ON public.reel_likes(reel_id);
CREATE INDEX IF NOT EXISTS idx_reel_likes_user_id ON public.reel_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_reel_comments_reel_id ON public.reel_comments(reel_id);
CREATE INDEX IF NOT EXISTS idx_reel_comments_user_id ON public.reel_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_reel_comments_created_at ON public.reel_comments(created_at ASC);

-- =====================================================
-- ENABLE REALTIME
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.reels;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reel_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reel_comments;

-- =====================================================
-- COMPLETED! 🎉
-- Run this in Supabase SQL Editor
-- =====================================================

