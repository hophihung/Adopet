# Fix Reels Video Loading Issue

## Vấn đề
Reels không load được video vì:
1. Reels đang ở status `pending` nên không hiển thị (query chỉ lấy status `approved`)
2. Moderation không tự động approve reels sau khi pass
3. Thiếu logging để debug

## Giải pháp đã áp dụng

### 1. Migration 032: Auto-approve reels khi moderation pass
- File: `supabase/migrations/032_auto_approve_reels_on_moderation_pass.sql`
- Chức năng: Tự động approve reels nếu moderation pass (is_sensitive = false và is_pet_related = true)
- Cách chạy: Chạy trong Supabase SQL Editor

### 2. Migration 033: Approve pending reels với valid moderation
- File: `supabase/migrations/033_approve_pending_reels_with_valid_moderation.sql`
- Chức năng: Approve các reels pending đã có moderation result pass
- Cách chạy: Chạy trong Supabase SQL Editor

### 3. Thêm logging và error handling
- Thêm logging chi tiết trong `ReelService.getAll()`
- Thêm logging trong `reel.tsx` để debug
- Thêm error handling khi load video
- Thêm empty state khi không có reels

## Các bước để fix

### Bước 1: Chạy migrations
1. Mở Supabase Dashboard
2. Vào SQL Editor
3. Chạy migration `032_auto_approve_reels_on_moderation_pass.sql`
4. Chạy migration `033_approve_pending_reels_with_valid_moderation.sql`

### Bước 2: Kiểm tra database
```sql
-- Kiểm tra reels và status
SELECT id, status, media_type, video_url, image_url, is_sensitive, is_pet_related, created_at
FROM public.reels
ORDER BY created_at DESC
LIMIT 10;

-- Kiểm tra reels approved
SELECT COUNT(*) as approved_count
FROM public.reels
WHERE status = 'approved';

-- Kiểm tra reels pending
SELECT COUNT(*) as pending_count
FROM public.reels
WHERE status = 'pending';
```

### Bước 3: Approve reels thủ công (nếu cần)
```sql
-- Approve tất cả reels pending (CHỈ DÙNG TRONG MÔI TRƯỜNG DEV/TEST)
UPDATE public.reels
SET status = 'approved'
WHERE status = 'pending';
```

### Bước 4: Kiểm tra logs
1. Mở app và vào màn hình Reels
2. Mở console/terminal để xem logs
3. Kiểm tra:
   - Số lượng reels được load
   - Video URLs có hợp lệ không
   - Có lỗi nào không

## Debug checklist

- [ ] Migrations đã được chạy
- [ ] Reels có status = 'approved' trong database
- [ ] Reels có video_url hoặc image_url hợp lệ
- [ ] Console logs hiển thị reels được load
- [ ] Video URLs là public URLs từ Supabase Storage
- [ ] RLS policies cho phép xem reels approved
- [ ] User đã đăng nhập (nếu cần)

## Các vấn đề thường gặp

### 1. Reels không hiển thị
- **Nguyên nhân**: Status = 'pending'
- **Giải pháp**: Chạy migration 033 để approve reels pending

### 2. Video không load
- **Nguyên nhân**: Video URL không hợp lệ hoặc không public
- **Giải pháp**: Kiểm tra Supabase Storage bucket permissions

### 3. RLS policy blocking
- **Nguyên nhân**: RLS policy không cho phép xem reels
- **Giải pháp**: Kiểm tra RLS policies trong migration 013

### 4. Moderation không chạy
- **Nguyên nhân**: Edge function không được deploy hoặc có lỗi
- **Giải pháp**: Kiểm tra Supabase Edge Functions

## Test

1. Tạo reel mới
2. Kiểm tra xem reel có được auto-approve không
3. Kiểm tra xem reel có hiển thị trong app không
4. Kiểm tra xem video có load được không

## Notes

- Reels mới tạo sẽ có status = 'pending'
- Moderation sẽ chạy trong background sau khi tạo reel
- Nếu moderation pass, reel sẽ được auto-approve
- Nếu moderation fail, reel sẽ bị reject
- Users chỉ thấy reels có status = 'approved'

