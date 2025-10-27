-- =====================================================
-- FIX: Add foreign key relationship between posts and profiles
-- This allows Supabase to join posts with profiles
-- =====================================================

-- Drop the existing foreign key to auth.users
ALTER TABLE public.posts 
  DROP CONSTRAINT IF EXISTS posts_user_id_fkey;

-- Add foreign key to profiles instead
ALTER TABLE public.posts 
  ADD CONSTRAINT posts_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES public.profiles(id) 
  ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_posts_user_id_profiles ON public.posts(user_id);

-- =====================================================
-- Now Supabase PostgREST can join posts.user_id -> profiles.id
-- =====================================================

