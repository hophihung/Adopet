# 🚀 Hướng dẫn chạy migrations

## Cần chạy 2 migrations:

### Migration 1: Cập nhật function để lấy pet mới nhất
**File:** `supabase/migrations/017_update_pet_like_notification.sql`

Copy và chạy toàn bộ nội dung file này trong Supabase SQL Editor.

### Migration 2: Tạo bảng pet_passes
**File:** `supabase/migrations/018_add_pet_passes_table.sql`

Copy và chạy toàn bộ nội dung file này trong Supabase SQL Editor.

---

## Cách chạy:

1. Mở **Supabase Dashboard** → **SQL Editor**
2. Copy nội dung từ file `017_update_pet_like_notification.sql`
3. Paste vào SQL Editor và click **Run**
4. Copy nội dung từ file `018_add_pet_passes_table.sql`
5. Paste vào SQL Editor và click **Run**

---

## Sau khi chạy xong:

✅ Transaction sẽ luôn dùng pet mới nhất vừa được like
✅ Pet đã pass (swipe left) sẽ không hiển thị lại
✅ Không còn duplicate key error
✅ Notification sẽ có đầy đủ ảnh, tên, giá

