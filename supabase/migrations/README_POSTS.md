# 📋 Posts Tables Migration Guide

## 🎯 Tên bảng chuẩn cho Supabase

Dựa vào schema diagram và best practices của Supabase, đây là tên bảng chuẩn:

### ✅ Tên bảng đúng:
1. **`posts`** - Bài viết community
2. **`post_likes`** - Like của users trên posts
3. **`post_comments`** - Comments của users
4. **`profiles`** - Thông tin user (đã có sẵn)

### ❌ Tên bảng cần tránh:
- ~~`likes`~~ → Dùng `post_likes` (rõ ràng context)
- ~~`user_posts`~~ → Dùng `posts` (không cần prefix)

## 🔧 Cách chạy migration

### Bước 1: Vào Supabase Dashboard
1. Vào project của bạn
2. Chọn **SQL Editor**
3. Tạo new query

### Bước 2: Copy & Run
```sql
-- Copy toàn bộ nội dung file: create_posts_tables.sql
-- Paste vào SQL Editor
-- Click RUN
```

### Bước 3: Verify
Kiểm tra trong **Database** → **Tables**:
- ✅ `posts` (4 columns)
- ✅ `post_likes` (3 columns)  
- ✅ `post_comments` (4 columns)

## 📊 Schema Overview

```
profiles (auth.users)
    ↓
posts
    ├── post_likes (post_id, user_id)
    └── post_comments (post_id, user_id, content)
```

## 🔐 Row Level Security (RLS)

Tất cả bảng đã enable RLS với policies:
- **Anyone** có thể view
- **Authenticated users** có thể create
- **Users** chỉ có thể delete/update của mình

## 🔴 Realtime

Đã tự động enable realtime cho:
- `posts` - INSERT, UPDATE, DELETE
- `post_likes` - INSERT, DELETE (auto-update like_count)
- `post_comments` - INSERT, DELETE (auto-update comment_count)

## 🚀 Features

### ✅ Auto-counting
- `like_count` tự động tăng/giảm khi like/unlike
- `comment_count` tự động tăng/giảm khi comment/delete

### ✅ Prevent duplicates
- Unique constraint: `(post_id, user_id)` trong bảng `post_likes`
- User không thể like 2 lần cùng 1 post

### ✅ Cascade delete
- Xóa post → tự động xóa post_likes và comments
- Xóa user → tự động xóa posts, post_likes, comments của user đó

## 📝 Tại sao đặt tên như vậy?

### `post_likes` thay vì `likes`:
- ✅ Rõ ràng context (likes cho posts, không phải reels/comments)
- ✅ Tránh nhầm lẫn nếu sau này có `reel_likes`, `comment_likes`
- ✅ Consistent với `post_comments`
- ✅ Dễ mở rộng và maintain

### `post_comments` thay vì `comments`:
- ✅ Tránh nhầm lẫn nếu sau này có `product_comments`, `reel_comments`
- ✅ Rõ ràng context là comments cho posts
- ✅ Supabase recommend prefix khi có nhiều loại comments

## 🎨 Code example

```typescript
// Like a post
await supabase
  .from('post_likes')
  .insert({ post_id, user_id });

// Get post with like count
const { data } = await supabase
  .from('posts')
  .select('*, like_count, comment_count')
  .single();

// Get comments for a post
const { data } = await supabase
  .from('post_comments')
  .select('*, profiles(full_name, avatar_url)')
  .eq('post_id', postId);
```

## 🔄 Migration từ tên cũ (nếu có)

Nếu bạn đã có bảng `likes`, chạy:

```sql
-- Rename table
ALTER TABLE likes RENAME TO post_likes;

-- Update foreign key names (optional)
ALTER INDEX idx_likes_post_id RENAME TO idx_post_likes_post_id;
ALTER INDEX idx_likes_user_id RENAME TO idx_post_likes_user_id;
```

## ✅ Checklist

- [ ] Chạy migration SQL
- [ ] Verify tables trong Dashboard
- [ ] Test realtime trong app
- [ ] Update code nếu đang dùng tên cũ
- [ ] Test RLS policies

---

**Lưu ý:** File này phù hợp với Supabase best practices và chuẩn PostgreSQL naming conventions.

