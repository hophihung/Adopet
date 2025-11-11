-- =====================================================
-- CREATE MUSIC STORAGE BUCKET
-- Tạo bucket Supabase Storage để lưu nhạc nền
-- =====================================================

-- 1. Tạo hoặc cập nhật bucket cho music tracks
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'music-tracks',
  'music-tracks',
  true,
  10485760, -- 10MB limit (đủ cho nhạc ngắn)
  ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a']
) ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a'];

-- 2. Tạo RLS policies cho music-tracks bucket
-- Policy: Anyone can view/list music files (public bucket)
DROP POLICY IF EXISTS "Anyone can view music tracks" ON storage.objects;
CREATE POLICY "Anyone can view music tracks"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'music-tracks');

-- Policy: Authenticated users can upload music (admin only in practice)
DROP POLICY IF EXISTS "Authenticated users can upload music" ON storage.objects;
CREATE POLICY "Authenticated users can upload music"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'music-tracks');

-- Policy: Authenticated users can update music
DROP POLICY IF EXISTS "Authenticated users can update music" ON storage.objects;
CREATE POLICY "Authenticated users can update music"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'music-tracks');

-- Policy: Authenticated users can delete music
DROP POLICY IF EXISTS "Authenticated users can delete music" ON storage.objects;
CREATE POLICY "Authenticated users can delete music"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'music-tracks');

-- =====================================================
-- COMPLETED! 🎉
-- Music storage bucket is ready
-- =====================================================









