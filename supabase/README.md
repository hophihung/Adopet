# 🗄️ Supabase Database Setup

## 📋 Các bước setup

### 1. Tạo database tables
Chạy file `migration.sql` trong Supabase SQL Editor:

```bash
# Copy nội dung file migration.sql
# Paste vào Supabase Dashboard → SQL Editor → New Query
# Click Run
```

### 2. Tắt auto-create profile (QUAN TRỌNG!)
Để user phải chọn role trước khi tạo profile, chạy file `disable-auto-profile.sql`:

```bash
# Copy nội dung file disable-auto-profile.sql
# Paste vào Supabase SQL Editor → New Query
# Click Run
```

**Lưu ý:** Nếu bạn đã chạy `migration.sql` trước đó, trigger tự động tạo profile đã được bật. Bạn PHẢI chạy `disable-auto-profile.sql` để tắt nó.

## 🔍 Kiểm tra setup

### Check trigger đã tắt chưa:
```sql
-- Chạy query này để xem trigger
SELECT * FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';

-- Kết quả phải rỗng (không có dòng nào)
```

### Check function đã xóa chưa:
```sql
-- Chạy query này để xem function
SELECT * FROM pg_proc 
WHERE proname = 'handle_new_user';

-- Kết quả phải rỗng (không có dòng nào)
```

## ✅ Kết quả mong đợi

Sau khi setup đúng:

1. ✅ User đăng ký → Không có profile trong table `profiles`
2. ✅ User chọn role trong app → Profile được tạo với role đã chọn
3. ✅ User không thể vào app nếu chưa chọn role

## 🐛 Troubleshooting

### Vấn đề: User vẫn được tạo profile tự động
**Nguyên nhân:** Trigger chưa được xóa

**Giải pháp:**
1. Chạy lại `disable-auto-profile.sql`
2. Kiểm tra bằng query ở trên
3. Restart app

### Vấn đề: Không thể tạo profile khi chọn role
**Nguyên nhân:** RLS policies chặn insert

**Giải pháp:**
Kiểm tra policy "Users can insert own profile":
```sql
SELECT * FROM pg_policies 
WHERE tablename = 'profiles' 
AND policyname = 'Users can insert own profile';
```

## 📝 Database Schema

### Table: profiles
```sql
- id (uuid, primary key, references auth.users)
- role (text, 'user' | 'seller')
- email (text)
- full_name (text)
- avatar_url (text)
- created_at (timestamp)
- updated_at (timestamp)
```

### Table: pets
```sql
- id (uuid, primary key)
- seller_id (uuid, references profiles)
- name (text)
- type (text, 'dog' | 'cat' | 'hamster' | 'bird' | 'rabbit' | 'other')
- age_months (integer)
- gender (text, 'male' | 'female' | 'unknown')
- description (text)
- location (text)
- price (numeric)
- images (text[])
- is_available (boolean)
- created_at (timestamp)
- updated_at (timestamp)
```

### Table: matches
```sql
- id (uuid, primary key)
- user_id (uuid, references profiles)
- pet_id (uuid, references pets)
- liked (boolean)
- created_at (timestamp)
```

### Table: reels
```sql
- id (uuid, primary key)
- pet_id (uuid, references pets, nullable)
- seller_id (uuid, references profiles)
- video_url (text)
- thumbnail_url (text)
- caption (text)
- views_count (integer)
- likes_count (integer)
- created_at (timestamp)
```
