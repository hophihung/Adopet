/*
  # Create Reels Storage Bucket
  
  Tạo storage bucket để lưu video và thumbnail cho reels
*/

-- =====================================================
-- STORAGE BUCKET: reels
-- =====================================================

-- Create bucket (chạy trong Supabase Dashboard → Storage → New bucket)
-- Hoặc dùng SQL:
INSERT INTO storage.buckets (id, name, public)
VALUES ('reels', 'reels', true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STORAGE POLICIES
-- =====================================================

-- Policy: Anyone can view reels
CREATE POLICY "Anyone can view reels"
ON storage.objects FOR SELECT
USING (bucket_id = 'reels');

-- Policy: Authenticated users can upload reels
CREATE POLICY "Authenticated users can upload reels"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'reels');

-- Policy: Users can update their own reels
CREATE POLICY "Users can update own reels"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'reels' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy: Users can delete their own reels
CREATE POLICY "Users can delete own reels"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'reels' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =====================================================
-- NOTE
-- =====================================================
-- Nếu bucket đã tồn tại, bạn có thể tạo thủ công trong Supabase Dashboard:
-- 1. Vào Storage → Create bucket
-- 2. Tên bucket: "reels"
-- 3. Public bucket: ON
-- 4. File size limit: 100MB (hoặc theo nhu cầu)
-- 5. Allowed MIME types: video/*, image/*

