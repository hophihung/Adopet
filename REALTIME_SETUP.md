# 🔴 Supabase Realtime Setup Guide

## Bước 1: Enable Realtime trên Supabase Dashboard

### Cách 1: Qua Dashboard UI
1. Vào **Supabase Dashboard** → Project của bạn
2. Chọn **Database** → **Replication**
3. Tìm bảng `posts`, `post_likes`, `post_comments`
4. Bật **Enable realtime** cho từng bảng

### Cách 2: Chạy SQL Migration (Khuyến nghị)
1. Vào **SQL Editor** trong Supabase Dashboard
2. Copy nội dung file `supabase/migrations/enable_realtime.sql`
3. Paste và **RUN**

```sql
-- Enable Realtime cho các bảng
ALTER PUBLICATION supabase_realtime ADD TABLE posts;
ALTER PUBLICATION supabase_realtime ADD TABLE post_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE post_comments;
```

---

## Bước 2: Cấu hình RLS (Row Level Security)

Đảm bảo các policy cho phép users đọc/ghi:

```sql
-- Policy cho bảng posts
CREATE POLICY "Users can view all posts"
  ON posts FOR SELECT
  TO authenticated
  USING (true);

-- Policy cho bảng post_likes
CREATE POLICY "Users can insert post_likes"
  ON post_likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their post_likes"
  ON post_likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view all post_likes"
  ON post_likes FOR SELECT
  TO authenticated
  USING (true);

-- Policy cho bảng post_comments
CREATE POLICY "Users can view all comments"
  ON post_comments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert comments"
  ON post_comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their comments"
  ON post_comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
```

---

## Bước 3: Verify Realtime hoạt động

### Test trong console:
```typescript
const channel = supabase
  .channel('test-channel')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'posts' },
    (payload) => console.log('Change received!', payload)
  )
  .subscribe();
```

---

## 🎯 Tính năng đã implement

### ✅ Realtime Updates
- **Posts**: INSERT, UPDATE, DELETE
- **Post Likes**: Tự động cập nhật like_count
- **Comments**: Tự động cập nhật comment_count

### ✅ Tự động Cleanup
- Channels được cleanup khi component unmount
- Tránh memory leaks

### ✅ Like/Unlike Toggle
- Check nếu user đã like
- Unlike nếu đã like, Like nếu chưa
- Realtime sync giữa các devices

---

## 🔧 Troubleshooting

### Lỗi: "Realtime is not enabled"
→ Chạy lại SQL migration để enable realtime

### Lỗi: "Permission denied"
→ Kiểm tra RLS policies

### Không thấy updates realtime
1. Check console logs
2. Verify subscription status: `channel.state` (should be "joined")
3. Test với SQL Editor: INSERT/UPDATE manually

---

## 📝 Next Steps

Để thêm tính năng comment realtime UI:
1. Tạo màn hình comment detail
2. Subscribe to `post_comments` với filter `post_id`
3. Show comments list với realtime updates

```typescript
const commentsChannel = supabase
  .channel(`post:${postId}:comments`)
  .on(
    'postgres_changes',
    { 
      event: '*', 
      schema: 'public', 
      table: 'post_comments',
      filter: `post_id=eq.${postId}`
    },
    (payload) => {
      // Update comments list
    }
  )
  .subscribe();
```

