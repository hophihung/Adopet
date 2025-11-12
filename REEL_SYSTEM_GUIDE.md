# 🎬 Reel System Guide - Hệ thống Reels với Realtime

## 📋 Tổng quan

Hệ thống Reels cho phép users (sellers) đăng video ngắn về pets với:
- ✅ Like/Unlike với realtime updates
- ✅ Comments với realtime updates
- ✅ Content moderation tự động (phát hiện nội dung nhạy cảm/không phải pet)
- ✅ Upload video và thumbnail
- ✅ TikTok-style UI

## 🚀 Cài đặt

### 1. Chạy Database Migrations

Chạy các file migration sau trong Supabase SQL Editor:

```sql
-- 1. Reel likes và comments với realtime
-- File: supabase/migrations/012_reel_likes_comments_realtime.sql

-- 2. Tạo storage bucket cho reels
-- File: supabase/migrations/013_create_reels_storage.sql
```

Hoặc chạy trực tiếp:

```sql
-- Enable realtime cho reels
ALTER PUBLICATION supabase_realtime ADD TABLE public.reels;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reel_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reel_comments;

-- Add comments_count column nếu chưa có
ALTER TABLE public.reels ADD COLUMN IF NOT EXISTS comments_count integer DEFAULT 0;
```

### 2. Tạo Storage Bucket

#### Cách 1: Qua Supabase Dashboard
1. Vào **Storage** → **Create bucket**
2. Tên bucket: `reels`
3. **Public bucket**: ON
4. **File size limit**: 100MB (hoặc theo nhu cầu)
5. **Allowed MIME types**: `video/*`, `image/*`

#### Cách 2: Qua SQL (nếu có quyền)
Chạy migration `013_create_reels_storage.sql`

### 3. Cấu hình Content Moderation

#### Option A: Google Cloud Vision API (Khuyến nghị)

1. Tạo Google Cloud Project
2. Enable Vision API
3. Tạo API Key
4. Thêm vào `.env`:
   ```env
   EXPO_PUBLIC_GOOGLE_VISION_API_KEY=your_api_key_here
   ```

#### Option B: Clarifai (Alternative)

1. Đăng ký tài khoản Clarifai
2. Tạo API Key
3. Cập nhật `contentModeration.service.ts`:
   ```typescript
   const service = new ContentModerationService({
     useGoogleVision: false,
     useClarifai: true,
     apiKey: 'your_clarifai_key',
   });
   ```

#### Option C: Disable Moderation (Development)

Để disable moderation trong development:
```typescript
await reelUploadService.uploadReel({
  // ... options
  enableModeration: false,
});
```

## 📱 Sử dụng

### Đăng Reel

1. Navigate to `/reel/create-reel`
2. Chọn video hoặc thumbnail
3. (Optional) Chọn pet liên quan
4. Viết caption
5. Click "Đăng"
6. Hệ thống sẽ tự động:
   - Kiểm tra nội dung (moderation)
   - Upload video/thumbnail
   - Tạo reel record

### Xem Reels

1. Navigate to `/(tabs)/discover/reel`
2. Scroll vertical để xem các reels
3. Like/Unlike bằng cách tap vào icon ❤️
4. Tap vào 💬 để xem/comment

### Comment

1. Tap vào icon 💬 trên reel
2. Modal hiển thị tất cả comments
3. Viết comment và gửi
4. Comments cập nhật realtime

## 🔧 API Reference

### ReelService

```typescript
import { ReelService } from '@/src/features/reels/services/reel.service';

// Get all reels
const reels = await ReelService.getAll();

// Get reel by ID
const reel = await ReelService.getById(reelId);

// Get comments
const comments = await ReelService.getComments(reelId);

// Toggle like
const result = await ReelService.toggleLike(reelId, userId);
// Returns: { liked: boolean }

// Add comment
const comment = await ReelService.addComment(reelId, userId, content);

// Delete comment
await ReelService.deleteComment(commentId, userId);

// Increment view
await ReelService.incrementView(reelId);
```

### ReelUploadService

```typescript
import { reelUploadService } from '@/src/services/reelUpload.service';

const result = await reelUploadService.uploadReel({
  videoUri: 'file://...',
  thumbnailUri: 'file://...',
  caption: 'My reel caption',
  petId: 'pet-uuid',
  sellerId: 'seller-uuid',
  enableModeration: true,
});

// Returns: { success: boolean, reelId?: string, error?: string }
```

### Content Moderation

```typescript
import { contentModerationService } from '@/src/services/contentModeration.service';

// Moderate image
const result = await contentModerationService.moderateImage(imageUri);
// Returns: { isSafe: boolean, isPet: boolean, confidence: number, reasons: string[] }

// Moderate video
const result = await contentModerationService.moderateVideo(videoUri);
```

## 🔴 Realtime Setup

Realtime đã được enable trong migration. Để verify:

```sql
-- Check realtime publication
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
-- Should show: reels, reel_likes, reel_comments
```

### Realtime Events

- **INSERT**: New reel/comment/like
- **UPDATE**: Reel updated (likes_count, comments_count)
- **DELETE**: Reel/comment/like deleted

## 🎨 UI Components

### ReelScreen
- Main screen hiển thị reels
- TikTok-style vertical scrolling
- Real-time like/comment updates

### ReelCommentModal
- Modal hiển thị comments
- Real-time comment updates
- Add/delete comments

### CreateReelScreen
- Upload video/thumbnail
- Select pet (optional)
- Write caption
- Content moderation

## ⚠️ Content Moderation

### Phát hiện gì?

1. **Nội dung nhạy cảm**:
   - Adult content
   - Violence
   - Racy content
   - Medical content
   - Spoof

2. **Không phải pet**:
   - Image không chứa pet/animal
   - Confidence score < threshold (default: 0.7)

### Cấu hình Threshold

```typescript
// Trong contentModeration.service.ts
const service = new ContentModerationService({
  threshold: 0.7, // 0-1, độ chắc chắn tối thiểu để coi là pet
});
```

### Custom Moderation

Bạn có thể tạo custom moderation logic:

```typescript
class CustomModerationService extends ContentModerationService {
  async moderateImage(imageUri: string) {
    // Your custom logic
    // Call parent method if needed
    return await super.moderateImage(imageUri);
  }
}
```

## 🐛 Troubleshooting

### Lỗi: "Realtime is not enabled"

```sql
-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.reels;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reel_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reel_comments;
```

### Lỗi: "Bucket not found"

1. Check bucket tồn tại: `SELECT * FROM storage.buckets WHERE id = 'reels';`
2. Tạo bucket thủ công trong Dashboard
3. Check storage policies

### Lỗi: "Content moderation failed"

- Check API key có đúng không
- Check internet connection
- Nếu fail, hệ thống sẽ "fail open" (cho phép upload)
- Disable moderation nếu cần: `enableModeration: false`

### Lỗi: "Video too large"

- Default limit: 100MB
- Tăng limit trong `reelUpload.service.ts`:
  ```typescript
  private maxVideoSize = 200 * 1024 * 1024; // 200MB
  ```

### Comments không realtime update

1. Check subscription status
2. Verify RLS policies
3. Check network connection

## 📊 Database Schema

### reels
```sql
- id (uuid)
- pet_id (uuid, nullable)
- seller_id (uuid)
- video_url (text)
- thumbnail_url (text, nullable)
- caption (text, nullable)
- views_count (integer)
- likes_count (integer)
- comments_count (integer)
- created_at (timestamptz)
```

### reel_likes
```sql
- id (uuid)
- reel_id (uuid)
- user_id (uuid)
- created_at (timestamptz)
- UNIQUE(reel_id, user_id)
```

### reel_comments
```sql
- id (uuid)
- reel_id (uuid)
- user_id (uuid)
- content (text)
- created_at (timestamptz)
- updated_at (timestamptz)
```

## 🔐 Security

- RLS policies enabled cho tất cả tables
- Only authenticated users có thể like/comment
- Users chỉ có thể delete own comments
- Storage policies bảo vệ uploads

## 📝 TODO / Future Enhancements

- [ ] Video playback với expo-av
- [ ] Extract thumbnail tự động từ video
- [ ] Video compression trước khi upload
- [ ] Hashtag support
- [ ] Reel sharing
- [ ] Reel analytics
- [ ] Admin moderation panel
- [ ] Custom ML model cho pet detection

## 🎉 Hoàn tất!

Hệ thống Reels đã sẵn sàng sử dụng với:
- ✅ Realtime likes/comments
- ✅ Content moderation
- ✅ TikTok-style UI
- ✅ Full CRUD operations

