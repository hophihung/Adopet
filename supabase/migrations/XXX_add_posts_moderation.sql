-- =====================================================
-- ADD MODERATION STATUS TO POSTS
-- Thêm trạng thái duyệt cho posts
-- =====================================================

-- Add status column to posts
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected', 'flagged')),
  ADD COLUMN IF NOT EXISTS moderation_reason TEXT,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_sensitive BOOLEAN DEFAULT false;

-- Create index for status
CREATE INDEX IF NOT EXISTS idx_posts_status ON public.posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_approved ON public.posts(status, created_at DESC) WHERE status = 'approved';

-- Update existing posts to approved status
UPDATE public.posts SET status = 'approved' WHERE status IS NULL;

