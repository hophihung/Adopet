# Hệ thống Reels với Content Moderation

## Tổng quan

Hệ thống reels cho phép người dùng đăng video ngắn (tối đa 60 giây) với tính năng like và comment realtime. Hệ thống tự động kiểm tra nội dung để đảm bảo không có nội dung nhạy cảm và chỉ cho phép nội dung liên quan đến thú cưng.

## Tính năng đã implement

### 1. Upload Reel
- ✅ Chọn video từ thư viện (tối đa 60 giây)
- ✅ Upload video lên Supabase Storage
- ✅ Tạo thumbnail tự động
- ✅ Thêm caption (tùy chọn)
- ✅ Content moderation tự động

### 2. Reel Screen
- ✅ Hiển thị reels dạng vertical scroll (như TikTok/Instagram Reels)
- ✅ Like/Unlike realtime
- ✅ Comment realtime
- ✅ View count tự động
- ✅ Share button

### 3. Comment System
- ✅ Modal hiển thị comments
- ✅ Realtime comment updates
- ✅ Thêm comment mới
- ✅ Hiển thị avatar và tên người dùng

### 4. Content Moderation
- ✅ Kiểm tra nội dung nhạy cảm
- ✅ Kiểm tra xem có phải pet không
- ✅ Tự động reject nếu không phù hợp
- ✅ Log moderation results

## Database Schema

### Bảng `reels`
- `id`: UUID (Primary Key)
- `user_id`: UUID (Foreign Key to auth.users)
- `video_url`: TEXT (URL video)
- `thumbnail_url`: TEXT (URL thumbnail)
- `caption`: TEXT (Mô tả)
- `like_count`: INTEGER (Số lượt thích)
- `comment_count`: INTEGER (Số bình luận)
- `view_count`: INTEGER (Số lượt xem)
- `duration`: INTEGER (Thời lượng video - giây)
- `status`: TEXT ('pending' | 'approved' | 'rejected' | 'flagged')
- `moderation_reason`: TEXT (Lý do nếu bị reject)
- `is_sensitive`: BOOLEAN (Nội dung nhạy cảm)
- `is_pet_related`: BOOLEAN (Có phải pet không)
- `created_at`, `updated_at`: TIMESTAMP

### Bảng `reel_likes`
- `id`: UUID (Primary Key)
- `reel_id`: UUID (Foreign Key to reels)
- `user_id`: UUID (Foreign Key to auth.users)
- `created_at`: TIMESTAMP
- UNIQUE(reel_id, user_id) - Ngăn duplicate likes

### Bảng `reel_comments`
- `id`: UUID (Primary Key)
- `reel_id`: UUID (Foreign Key to reels)
- `user_id`: UUID (Foreign Key to auth.users)
- `content`: TEXT (Nội dung comment)
- `created_at`, `updated_at`: TIMESTAMP

### Bảng `content_moderation_logs`
- `id`: UUID (Primary Key)
- `reel_id`: UUID (Foreign Key to reels)
- `moderation_type`: TEXT ('image' | 'video')
- `is_sensitive`: BOOLEAN
- `is_pet_related`: BOOLEAN
- `confidence_score`: NUMERIC (0-100)
- `moderation_reason`: TEXT
- `created_at`: TIMESTAMP

## Realtime Updates

Hệ thống sử dụng Supabase Realtime để:
- ✅ Cập nhật like count realtime
- ✅ Hiển thị comment mới realtime
- ✅ Cập nhật reel status sau khi moderation

## Content Moderation

### Cách hoạt động

1. **Upload video**: User upload video và chọn thumbnail
2. **Moderation check**: Hệ thống gọi Edge Function để phân tích
3. **AI Analysis**: 
   - Kiểm tra nội dung nhạy cảm (is_sensitive)
   - Kiểm tra xem có phải pet không (is_pet_related)
   - Tính confidence score
4. **Apply result**: 
   - Nếu `is_sensitive = true` → status = 'rejected'
   - Nếu `is_pet_related = false` → status = 'rejected'
   - Nếu OK → status = 'approved'
5. **Display**: Chỉ hiển thị reels có status = 'approved'

### Tích hợp AI Service

Hiện tại Edge Function (`supabase/functions/moderate-content/index.ts`) sử dụng basic validation. Để tích hợp AI thực sự, bạn có thể:

#### Option 1: Google Cloud Vision API
```typescript
// Trong supabase/functions/moderate-content/index.ts
import { VisionClient } from '@google-cloud/vision';

const vision = new VisionClient();
const [safeSearch] = await vision.safeSearchDetection(imageUrl);
const [labels] = await vision.labelDetection(imageUrl);

const isSensitive = safeSearch.adult === 'LIKELY' || 
                    safeSearch.violence === 'LIKELY';
const isPetRelated = labels.some(label => 
  ['dog', 'cat', 'pet', 'animal'].includes(label.description.toLowerCase())
);
```

#### Option 2: OpenAI Vision API
```typescript
const response = await openai.chat.completions.create({
  model: "gpt-4-vision-preview",
  messages: [{
    role: "user",
    content: [
      { type: "text", text: "Is this image appropriate for a pet adoption app? Does it contain pets?" },
      { type: "image_url", image_url: { url: imageUrl } }
    ]
  }]
});
```

#### Option 3: AWS Rekognition
```typescript
const rekognition = new RekognitionClient();
const result = await rekognition.detectModerationLabels({
  Image: { Bytes: imageBuffer }
});
```

## Setup Instructions

### 1. Chạy Migration
```sql
-- Chạy file: supabase/migrations/013_create_reels_system.sql
-- Trong Supabase SQL Editor
```

### 2. Tạo Storage Bucket
```sql
-- Tạo bucket 'reels' trong Supabase Storage
-- Settings: Public = true
-- File size limit: 100MB
```

### 3. Deploy Edge Function (Optional)
```bash
# Deploy content moderation function
supabase functions deploy moderate-content
```

### 4. Setup Environment Variables (cho AI service)
```env
# Nếu dùng Google Cloud Vision
GOOGLE_APPLICATION_CREDENTIALS=path/to/credentials.json

# Nếu dùng OpenAI
OPENAI_API_KEY=your_api_key

# Nếu dùng AWS Rekognition
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
```

## Usage

### Upload Reel
1. Vào tab Discover → Reel
2. Bấm nút "+" ở header
3. Chọn video từ thư viện
4. Thêm caption (tùy chọn)
5. Bấm "Đăng Reel"
6. Hệ thống sẽ tự động kiểm tra nội dung

### Xem và tương tác
1. Scroll vertical để xem reels
2. Bấm ❤️ để like
3. Bấm 💬 để comment
4. Bấm 📤 để share

### Realtime Updates
- Like count tự động cập nhật khi có người like
- Comment mới hiển thị ngay lập tức
- View count tự động tăng khi xem reel

## Files Structure

```
src/features/reels/
├── services/
│   ├── reel.service.ts              # Main reel service
│   └── contentModeration.service.ts  # Content moderation
├── index.ts                         # Exports

app/
├── reel/
│   └── create-reel.tsx              # Upload reel screen
└── (tabs)/discover/
    └── reel.tsx                     # Reel feed screen

supabase/
├── migrations/
│   └── 013_create_reels_system.sql  # Database migration
└── functions/
    └── moderate-content/
        └── index.ts                 # Edge function for moderation
```

## Security & RLS

- ✅ Chỉ authenticated users mới có thể tạo reels
- ✅ Users chỉ có thể xóa/update reels của mình
- ✅ Chỉ hiển thị reels có status = 'approved'
- ✅ Content moderation logs chỉ visible cho owner

## Performance

- ✅ Indexes trên các cột thường query
- ✅ Realtime subscriptions được cleanup đúng cách
- ✅ Pagination cho reels list
- ✅ Lazy loading cho comments

## Future Enhancements

- [ ] Video player với controls (expo-av hoặc react-native-video)
- [ ] Video compression trước khi upload
- [ ] Thumbnail generation từ video
- [ ] Video editing features
- [ ] Filters và effects
- [ ] Music/audio overlay
- [ ] Advanced moderation với ML model
- [ ] Admin panel để review rejected reels




