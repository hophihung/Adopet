-- =====================================================
-- CREATE PET IMAGES STORAGE BUCKET
-- Tạo bucket Supabase Storage để lưu ảnh pet
-- =====================================================

-- 1. Tạo bucket cho pet images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pet-images',
  'pet-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- 2. Tạo RLS policies cho pet-images bucket
-- Policy: Anyone can view images (public bucket)
CREATE POLICY "Anyone can view pet images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'pet-images');

-- Policy: Authenticated users can upload images
CREATE POLICY "Authenticated users can upload pet images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'pet-images');

-- Policy: Users can update their own images
CREATE POLICY "Users can update their own pet images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'pet-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy: Users can delete their own images
CREATE POLICY "Users can delete their own pet images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'pet-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 3. Tạo function để lấy public URL của image
CREATE OR REPLACE FUNCTION get_pet_image_url(image_path text)
RETURNS text AS $$
BEGIN
  RETURN (
    SELECT public_url
    FROM storage.objects
    WHERE bucket_id = 'pet-images' AND name = image_path
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Tạo function để xóa ảnh khi xóa pet
CREATE OR REPLACE FUNCTION delete_pet_images()
RETURNS TRIGGER AS $$
DECLARE
  image_url text;
  image_path text;
BEGIN
  -- Lấy danh sách ảnh từ pet cũ
  FOR image_url IN SELECT unnest(OLD.images) LOOP
    -- Extract path từ URL
    image_path := regexp_replace(image_url, '^.*pet-images/', '');
    
    -- Xóa ảnh khỏi storage
    DELETE FROM storage.objects
    WHERE bucket_id = 'pet-images' AND name = image_path;
  END LOOP;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Tạo trigger để xóa ảnh khi xóa pet
DROP TRIGGER IF EXISTS trigger_delete_pet_images ON public.pets;
CREATE TRIGGER trigger_delete_pet_images
  BEFORE DELETE ON public.pets
  FOR EACH ROW
  EXECUTE FUNCTION delete_pet_images();

-- 6. Tạo function để cleanup ảnh orphaned
CREATE OR REPLACE FUNCTION cleanup_orphaned_pet_images()
RETURNS void AS $$
DECLARE
  image_record RECORD;
  is_used boolean;
BEGIN
  -- Lấy tất cả ảnh trong bucket
  FOR image_record IN 
    SELECT name, created_at
    FROM storage.objects
    WHERE bucket_id = 'pet-images'
    AND created_at < now() - INTERVAL '1 hour' -- Chỉ xóa ảnh cũ hơn 1 giờ
  LOOP
    -- Kiểm tra xem ảnh có được sử dụng trong pets table không
    SELECT EXISTS(
      SELECT 1 FROM public.pets
      WHERE images @> ARRAY[get_pet_image_url(image_record.name)]
    ) INTO is_used;
    
    -- Nếu không được sử dụng, xóa ảnh
    IF NOT is_used THEN
      DELETE FROM storage.objects
      WHERE bucket_id = 'pet-images' AND name = image_record.name;
      
      RAISE NOTICE 'Deleted orphaned image: %', image_record.name;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Tạo function để resize/optimize ảnh (optional)
CREATE OR REPLACE FUNCTION optimize_pet_image(image_path text)
RETURNS text AS $$
DECLARE
  optimized_path text;
BEGIN
  -- Trong thực tế, bạn có thể sử dụng external service như Cloudinary
  -- hoặc ImageMagick để resize ảnh
  -- Ở đây chúng ta chỉ return path gốc
  optimized_path := image_path;
  
  RETURN optimized_path;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Tạo index để tối ưu query ảnh
CREATE INDEX IF NOT EXISTS idx_storage_objects_pet_images
  ON storage.objects(bucket_id, name)
  WHERE bucket_id = 'pet-images';

-- 9. Tạo function để get image metadata
CREATE OR REPLACE FUNCTION get_pet_image_metadata(image_path text)
RETURNS TABLE (
  name text,
  size bigint,
  mime_type text,
  created_at timestamptz,
  public_url text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.name,
    o.metadata->>'size'::bigint as size,
    o.metadata->>'mimetype' as mime_type,
    o.created_at,
    o.public_url
  FROM storage.objects o
  WHERE o.bucket_id = 'pet-images' 
    AND o.name = image_path;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Tạo function để validate image upload
CREATE OR REPLACE FUNCTION validate_pet_image_upload(
  file_name text,
  file_size bigint,
  mime_type text
)
RETURNS boolean AS $$
DECLARE
  max_size bigint := 5242880; -- 5MB
  allowed_types text[] := ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
BEGIN
  -- Kiểm tra kích thước file
  IF file_size > max_size THEN
    RAISE EXCEPTION 'File size too large. Maximum size is 5MB';
  END IF;
  
  -- Kiểm tra loại file
  IF mime_type != ALL(allowed_types) THEN
    RAISE EXCEPTION 'File type not allowed. Allowed types: %', allowed_types;
  END IF;
  
  -- Kiểm tra tên file
  IF file_name ~ '\.\.' THEN
    RAISE EXCEPTION 'Invalid file name';
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMPLETED! 🎉
-- Pet images storage bucket is ready
-- =====================================================
