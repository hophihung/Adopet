# Hướng dẫn Giảm Cached Egress trong Supabase

## Vấn đề
Cached Egress đang vượt quá quota (378% - 18,922 GB / 5 GB) mặc dù các metrics khác đều thấp.

## Nguyên nhân chính

### 1. ✅ ĐÃ SỬA: VideoThumbnail load full video
- **Vấn đề**: Component `VideoThumbnail` đang load toàn bộ video file (50-300MB) chỉ để hiển thị thumbnail
- **Giải pháp**: Đã tắt VideoThumbnail, chỉ hiển thị placeholder nếu không có `thumbnail_url`
- **Tiết kiệm**: 50-300MB mỗi thumbnail × số lượng reels = hàng GB

### 2. ⚠️ CẦN SỬA: Không có cache headers tối ưu
- **Vấn đề**: CDN không cache được, phải gửi lại dữ liệu mỗi lần
- **Giải pháp**: 
  - ✅ Đã thêm `noCacheHeaders` cho API responses (không cache dynamic data)
  - ⚠️ Cần config Supabase Storage để set cache headers cho static assets
  - ⚠️ Cần enable CDN caching cho images/videos

### 3. ⚠️ CẦN KIỂM TRA: Hotlinking
- **Vấn đề**: Người khác có thể nhúng ảnh/video của bạn trên site khác
- **Giải pháp**: 
  - ✅ Đã tạo migration `035_optimize_storage_cache_and_hotlink_protection.sql`
  - ⚠️ Cần implement Referer checking (hoặc dùng signed URLs)
  - ⚠️ Cần monitor storage access logs

### 4. ⚠️ CẦN TỐI ƯU: API/Edge Functions trả dữ liệu lớn
- **Vấn đề**: Edge Functions có thể trả về responses lớn và bị cache
- **Giải pháp**: 
  - ✅ Đã thêm `noCacheHeaders` cho tất cả Edge Functions
  - ⚠️ Cần kiểm tra responses size và optimize

## Các giải pháp đã implement

### 1. Tắt VideoThumbnail Component
```typescript
// app/profile/[id].tsx
// VideoThumbnail không còn load full video nữa
// Chỉ hiển thị placeholder nếu không có thumbnail_url
```

### 2. Thêm Cache Headers cho Edge Functions
```typescript
// supabase/functions/*/index.ts
const noCacheHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};
```

### 3. Migration cho Storage Optimization
```sql
-- supabase/migrations/035_optimize_storage_cache_and_hotlink_protection.sql
-- Functions để optimize storage URLs và check referer
```

## Các bước tiếp theo cần làm

### 1. Config Supabase Storage Cache Headers
Supabase Storage tự động set cache headers, nhưng bạn có thể optimize thêm:

**Option A: Sử dụng Supabase Dashboard**
1. Vào Supabase Dashboard → Storage
2. Chọn bucket (pet-images, reels, post-images)
3. Config cache headers trong bucket settings

**Option B: Sử dụng Supabase Image Transformations**
- Enable Image Transformations trong Supabase
- Sử dụng query params để resize images on-the-fly
- Ví dụ: `?width=400&height=400&quality=80`

**Option C: Integrate với Cloudinary/Imgix**
- Upload images lên Cloudinary/Imgix
- Sử dụng CDN của họ với automatic optimization
- Giảm egress từ Supabase Storage

### 2. Implement Hotlink Protection

**Option A: Referer Checking (Basic)**
```typescript
// Check referer trong Edge Function middleware
const referer = req.headers.get('referer');
if (!isAllowedReferer(referer)) {
  return new Response('Forbidden', { status: 403 });
}
```

**Option B: Signed URLs (Recommended)**
```typescript
// Sử dụng signed URLs với expiration
const { data } = await supabase.storage
  .from('bucket')
  .createSignedUrl('path/to/file', 3600); // 1 hour expiration
```

**Option C: CDN với Access Control**
- Sử dụng Cloudflare/CloudFront với access control
- Block requests không có proper headers

### 3. Optimize Image Sizes

**Trước khi upload:**
- Resize images về kích thước hợp lý (max 1920x1080 cho full-size, 400x400 cho thumbnails)
- Compress images (JPEG quality 80-85, WebP nếu có thể)
- Generate thumbnails riêng (200-500KB thay vì 5-10MB)

**Khi display:**
- Luôn dùng thumbnail cho lists/grids
- Chỉ load full-size khi user click vào image
- Lazy load images (chỉ load khi visible)

### 4. Monitor và Analyze

**Tạo bảng để track storage access:**
```sql
CREATE TABLE storage_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id text,
  object_name text,
  referer text,
  user_agent text,
  ip_address text,
  accessed_at timestamptz DEFAULT now()
);
```

**Query để identify hotlinking:**
```sql
-- Tìm các referer không phải từ domain của bạn
SELECT referer, COUNT(*) as access_count, SUM(size) as total_bytes
FROM storage_access_logs
WHERE referer NOT LIKE '%yourdomain.com%'
GROUP BY referer
ORDER BY total_bytes DESC;
```

## Best Practices

### 1. Images
- ✅ Luôn generate thumbnails khi upload
- ✅ Sử dụng WebP format (nhỏ hơn 30-50% so với JPEG)
- ✅ Compress images trước khi upload
- ✅ Lazy load images trong lists
- ✅ Cache images với `cache="force-cache"`

### 2. Videos
- ❌ **KHÔNG BAO GIỜ** load full video để làm thumbnail
- ✅ Luôn require `thumbnail_url` khi upload video
- ✅ Generate thumbnail từ video khi upload (server-side)
- ✅ Sử dụng video streaming (HLS/DASH) thay vì direct download

### 3. API Responses
- ✅ Set `no-cache` headers cho dynamic data
- ✅ Set proper cache headers cho static data
- ✅ Minimize response size (chỉ trả về data cần thiết)
- ✅ Use pagination cho large datasets

### 4. CDN Configuration
- ✅ Enable CDN caching cho static assets
- ✅ Set cache headers: `Cache-Control: public, max-age=31536000` (1 year)
- ✅ Use ETags để validate cache
- ✅ Enable compression (gzip/brotli)

## Expected Results

Sau khi implement các giải pháp trên:
- **Giảm 90-95% Cached Egress** (từ ~19GB xuống ~1-2GB)
- **App nhanh hơn** (không load video không cần thiết)
- **Tiết kiệm chi phí** (không vượt quota)
- **Better UX** (images load nhanh hơn với thumbnails)

## Monitoring

Kiểm tra Cached Egress trong Supabase Dashboard:
1. Vào Project Settings → Usage
2. Xem Cached Egress chart
3. Identify spikes và correlate với user activity
4. Monitor sau khi deploy fixes

## Notes

- Supabase Storage tự động cache với CDN
- Cached Egress = traffic từ cache hits (tốt cho performance, nhưng vẫn tính vào quota)
- Nếu vẫn cao sau khi fix, có thể do:
  - Hotlinking từ external sites
  - Bot/crawlers đang crawl images
  - App đang load quá nhiều images cùng lúc
  - Images quá lớn (cần resize/compress)

