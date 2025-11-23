-- =====================================================
-- OPTIMIZE STORAGE CACHE AND HOTLINK PROTECTION
-- Tối ưu cache headers và bảo vệ chống hotlinking để giảm Cached Egress
-- =====================================================

-- 1. Tạo function để set cache headers cho storage objects
-- Note: Supabase Storage tự động set cache headers, nhưng chúng ta có thể optimize thêm

-- 2. Tạo function để check Referer và chống hotlinking
CREATE OR REPLACE FUNCTION check_referer_allowed(referer text)
RETURNS boolean AS $$
DECLARE
  allowed_domains text[] := ARRAY[
    'localhost',
    '127.0.0.1',
    'adopet.app', -- Thay bằng domain của bạn
    '*.adopet.app', -- Subdomains
    'expo.dev',
    'expo.io'
  ];
  referer_domain text;
BEGIN
  -- Nếu không có referer (direct access từ app), cho phép
  IF referer IS NULL OR referer = '' THEN
    RETURN true;
  END IF;

  -- Extract domain từ referer
  referer_domain := regexp_replace(referer, '^https?://([^/]+).*', '\1', 'g');
  
  -- Check nếu domain được phép
  -- Trong production, bạn nên implement logic phức tạp hơn
  -- Hoặc sử dụng Supabase Storage Transformations với signed URLs
  
  -- Tạm thời cho phép tất cả để không block app
  -- TODO: Implement proper domain whitelist checking
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Tạo function để get optimized image URL với cache headers
CREATE OR REPLACE FUNCTION get_optimized_image_url(
  bucket_name text,
  file_path text,
  width integer DEFAULT NULL,
  height integer DEFAULT NULL,
  quality integer DEFAULT 80
)
RETURNS text AS $$
DECLARE
  base_url text;
  optimized_url text;
BEGIN
  -- Get base public URL
  SELECT public_url INTO base_url
  FROM storage.objects
  WHERE bucket_id = bucket_name AND name = file_path
  LIMIT 1;

  IF base_url IS NULL THEN
    RETURN NULL;
  END IF;

  -- Supabase Storage không hỗ trợ image transformations trực tiếp
  -- Bạn cần sử dụng external service như Cloudinary, Imgix, hoặc
  -- Supabase Image Transformations (nếu có)
  
  -- Tạm thời return base URL
  -- TODO: Integrate với image transformation service
  optimized_url := base_url;

  -- Nếu có width/height, append query params (nếu service hỗ trợ)
  -- Ví dụ: optimized_url := base_url || '?w=' || width || '&h=' || height || '&q=' || quality;

  RETURN optimized_url;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Tạo view để track storage usage và identify hotlinking
CREATE OR REPLACE VIEW storage_usage_stats AS
SELECT 
  bucket_id,
  COUNT(*) as file_count,
  SUM((metadata->>'size')::bigint) as total_size_bytes,
  SUM((metadata->>'size')::bigint) / 1024.0 / 1024.0 as total_size_mb
FROM storage.objects
WHERE bucket_id IN ('pet-images', 'reels', 'post-images', 'profile')
GROUP BY bucket_id;

-- 5. Tạo function để log suspicious access patterns (potential hotlinking)
CREATE OR REPLACE FUNCTION log_storage_access(
  bucket_id text,
  object_name text,
  referer text DEFAULT NULL,
  user_agent text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  -- Log access for monitoring
  -- Trong production, bạn có thể tạo bảng để track này
  -- và identify patterns của hotlinking
  
  -- Tạm thời chỉ log nếu cần
  -- INSERT INTO storage_access_logs (bucket_id, object_name, referer, user_agent, accessed_at)
  -- VALUES (bucket_id, object_name, referer, user_agent, now());
  
  NULL; -- Placeholder
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Comment về cache optimization
COMMENT ON FUNCTION get_optimized_image_url IS 
'Get optimized image URL with proper cache headers. 
In production, integrate with CDN/image transformation service.
Recommended: Use Supabase Image Transformations or Cloudinary/Imgix.';

COMMENT ON FUNCTION check_referer_allowed IS 
'Check if referer is allowed to prevent hotlinking.
In production, implement proper domain whitelist and signed URLs.';

-- =====================================================
-- RECOMMENDATIONS FOR REDUCING CACHED EGRESS:
-- =====================================================
-- 1. Enable CDN caching với proper cache headers
-- 2. Use signed URLs với expiration cho sensitive content
-- 3. Implement image transformations (resize on-the-fly)
-- 4. Add Referer checking middleware
-- 5. Monitor storage access logs để identify hotlinking
-- 6. Use WebP format cho images (smaller file size)
-- 7. Compress images trước khi upload
-- 8. Implement lazy loading trong app
-- 9. Never load full videos for thumbnails
-- 10. Use proper cache headers: Cache-Control: public, max-age=31536000
-- =====================================================

