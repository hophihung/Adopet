# Các bước cần làm sau mỗi đợt update

## 📋 Checklist sau khi Agent update code

### 1. ✅ Kiểm tra Migrations SQL
Sau khi có thay đổi trong thư mục `supabase/migrations/`:

```bash
# Kiểm tra các file migration mới
ls -la supabase/migrations/*.sql

# Các migration cần chạy (theo thứ tự):
- 025_fix_subscription_group_by_and_storage_buckets.sql (MỚI - sửa tất cả lỗi)
  - Sửa GROUP BY error trong get_user_plan_info
  - Cập nhật bucket 'reels' để hỗ trợ image types
  - Tạo/cập nhật bucket 'post-images'
- 026_fix_subscription_on_conflict_error.sql (MỚI - sửa lỗi ON CONFLICT)
  - Tạo unique constraint trên subscriptions.profile_id
  - Tạo function ensure_seller_has_subscription
  - Xóa các trigger/function cũ gây lỗi
- 027_fix_reels_seller_id_null_error.sql (MỚI - sửa lỗi seller_id null)
  - Migrate từ seller_id sang user_id nếu cần
  - Tạo trigger để tự động sync user_id và seller_id
  - Drop NOT NULL constraint từ seller_id
- 028_fix_reels_status_default_and_approval.sql (MỚI - sửa status default và approval)
  - Đảm bảo default status = 'pending' (không phải 'approved')
  - Chỉ fetch reels có status = 'approved'
  - Tạo functions approve_reel() và reject_reel() để quản lý
  - Tạo view pending_reels để xem reels chờ duyệt
```

**Cách chạy:**
1. Vào Supabase Dashboard → SQL Editor
2. Copy nội dung từng file migration
3. Chạy từng file theo thứ tự số
4. Kiểm tra kết quả (không có lỗi)

### 2. ✅ Kiểm tra Storage Buckets
Sau khi update storage buckets:

1. Vào Supabase Dashboard → Storage
2. Kiểm tra các buckets:
   - `pet-images` - Có `image/jpeg`, `image/png`, `image/webp`, `image/gif`
   - `reels` - Có cả video và image types
   - `post-images` - Mới tạo, có image types

3. Nếu bucket chưa có, chạy migration tương ứng
4. Kiểm tra RLS policies đã được tạo

### 3. ✅ Test các tính năng đã sửa

#### Test Subscription (đã sửa GROUP BY error):
```bash
# Test trong app:
1. Đăng nhập vào app
2. Vào trang subscription/profile
3. Kiểm tra không còn lỗi "column must appear in GROUP BY"
4. Xem thông tin plan hiển thị đúng
```

#### Test Image Upload (đã sửa MIME type):
```bash
# Test upload ảnh:
1. Tạo pet mới → Upload ảnh → Kiểm tra không lỗi MIME type
2. Tạo post → Upload ảnh → Kiểm tra không lỗi
3. Tạo reel → Upload ảnh → Kiểm tra không lỗi
4. Upload ảnh từ thư viện (JPG, PNG, WebP)
```

### 4. ✅ Kiểm tra lỗi trong Console
Sau khi chạy app:

1. Mở Developer Tools / React Native Debugger
2. Kiểm tra Console logs:
   - Không còn lỗi SQL GROUP BY
   - Không còn lỗi Storage MIME type
   - Không có lỗi import/export

### 5. ✅ Rebuild App (nếu cần)
Nếu có thay đổi native code hoặc dependencies:

```bash
# React Native / Expo
npm install
npx expo start --clear

# Hoặc rebuild hoàn toàn
npx expo prebuild --clean
```

### 6. ✅ Test trên thiết bị thật
Sau khi test trên simulator:

1. Build app cho thiết bị thật
2. Test các tính năng:
   - Login/Register
   - Upload ảnh
   - Xem subscription info
   - Tạo pet/post/reel

### 7. ✅ Commit và Push code
Sau khi đã test xong:

```bash
git add .
git commit -m "Fix: SQL GROUP BY error and MIME type issues"
git push origin <branch-name>
```

## 🔄 Quy trình chuẩn sau mỗi update

1. **Đọc các file đã thay đổi** → Hiểu rõ thay đổi gì
2. **Chạy migrations** → Áp dụng thay đổi database
3. **Kiểm tra Storage** → Đảm bảo buckets đúng config
4. **Test tính năng** → Đảm bảo không có lỗi
5. **Fix lỗi nếu có** → Debug và sửa
6. **Commit code** → Lưu thay đổi

## ⚠️ Lưu ý quan trọng

- **Luôn backup database** trước khi chạy migrations
- **Test trên development** trước khi deploy production
- **Kiểm tra RLS policies** sau khi tạo buckets mới
- **Xem logs** để phát hiện lỗi sớm

## 📝 Ghi chú cho lần update này

### Thay đổi chính:
1. ✅ Sửa SQL GROUP BY trong `get_user_plan_info` function
2. ✅ Thêm helper `getMimeType()` trong `imageUpload.service.ts`
3. ✅ Cập nhật bucket `reels` để hỗ trợ image types
4. ✅ Tạo bucket mới `post-images` với đúng MIME types
5. ✅ Sửa lỗi ON CONFLICT trong `createProfile` - kiểm tra profile tồn tại trước khi insert
6. ✅ Tạo function `ensure_seller_has_subscription` và unique constraint trên subscriptions.profile_id
7. ✅ Sửa lỗi seller_id null trong reels - insert cả user_id và seller_id khi tạo reel
8. ✅ Tối ưu upload reel - thông báo success ngay, moderation chạy background
9. ✅ Tránh file trùng lặp - thêm random string vào filename và prevent duplicate posts
10. ✅ Sửa reels status system - default = 'pending', chỉ fetch 'approved', tạo functions approve/reject

### Cần chạy migrations:
- `025_fix_subscription_group_by_and_storage_buckets.sql` (MỚI - migration tổng hợp)
  - DROP và tạo lại function `get_user_plan_info` với GROUP BY đúng
  - UPDATE bucket 'reels' để thêm image types
  - INSERT hoặc UPDATE bucket 'post-images' với đúng MIME types
  - Tạo RLS policies cho post-images (nếu chưa có)
- `026_fix_subscription_on_conflict_error.sql` (MỚI - sửa lỗi ON CONFLICT)
  - Tạo unique constraint trên subscriptions.profile_id
  - Tạo function ensure_seller_has_subscription
  - Xóa các trigger/function cũ gây lỗi ON CONFLICT

### Cần test:
- [ ] Subscription page không còn lỗi GROUP BY
- [ ] Upload ảnh pet không lỗi MIME type
- [ ] Upload ảnh post không lỗi MIME type
- [ ] Upload ảnh reel không lỗi MIME type
- [ ] Chọn role user/seller không còn lỗi ON CONFLICT
- [ ] Transform style trong select-role không còn lỗi forEach
- [ ] Tạo reel không còn lỗi seller_id null (video đã upload nhưng insert fail)
- [ ] Upload reel nhanh hơn - thông báo success ngay, không chờ moderation
- [ ] Không còn file trùng lặp trong storage (kiểm tra bucket reels/thumbnails)
- [ ] Reels mới tạo có status = 'pending' (chờ duyệt)
- [ ] Chỉ hiển thị reels có status = 'approved' trên app
- [ ] Có thể approve/reject reel trên Supabase để hiển thị/ẩn

