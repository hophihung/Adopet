-- =====================================================
-- CREATE/UPDATE REELS STORAGE BUCKET
-- Tạo hoặc cập nhật bucket Supabase Storage để lưu video reels
-- =====================================================

-- 1. Tạo hoặc cập nhật bucket cho reels videos và images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'reels',
  'reels',
  true,
  314572800, -- 300MB limit (300 * 1024 * 1024)
  ARRAY['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 314572800, -- Update to 300MB if bucket exists
  allowed_mime_types = ARRAY['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

-- 2. Tạo RLS policies cho reels bucket
-- Policy: Anyone can view videos (public bucket)
DROP POLICY IF EXISTS "Anyone can view reels" ON storage.objects;
CREATE POLICY "Anyone can view reels"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'reels');

-- Policy: Authenticated users can upload videos
DROP POLICY IF EXISTS "Authenticated users can upload reels" ON storage.objects;
CREATE POLICY "Authenticated users can upload reels"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'reels');

-- Policy: Users can update their own videos
DROP POLICY IF EXISTS "Users can update their own reels" ON storage.objects;
CREATE POLICY "Users can update their own reels"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'reels' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy: Users can delete their own videos
DROP POLICY IF EXISTS "Users can delete their own reels" ON storage.objects;
CREATE POLICY "Users can delete their own reels"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'reels' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =====================================================
-- COMPLETED! 🎉
-- Reels storage bucket is ready with 300MB file size limit
-- =====================================================

