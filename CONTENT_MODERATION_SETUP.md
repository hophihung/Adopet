# Content Moderation Setup Guide

## 📋 Tình trạng hiện tại

Hiện tại hệ thống đã có:
- ✅ **Edge Function**: `supabase/functions/moderate-content/index.ts` - Chỉ có basic validation (luôn approve)
- ✅ **Service**: `src/features/reels/services/contentModeration.service.ts` - Structure sẵn sàng
- ✅ **Database**: Function `moderate_reel_content()` để apply kết quả

**⚠️ Cần làm**: Tích hợp AI service thực sự

## 🔧 Các lựa chọn AI Service

### 1. OpenAI Vision API (Dễ nhất, Khuyến nghị)
- ✅ Dễ setup
- ✅ Accuracy cao
- ✅ Có thể detect pet và sensitive content
- ❌ Có phí (~$0.01-0.03 per image)

### 2. Google Cloud Vision API
- ✅ Free tier: 1,000 requests/month
- ✅ Good accuracy
- ✅ SafeSearch detection built-in
- ❌ Cần setup Google Cloud account

### 3. AWS Rekognition
- ✅ Free tier: 5,000 images/month
- ✅ Good accuracy
- ✅ Moderation labels built-in
- ❌ Cần setup AWS account

### 4. Hugging Face (Free)
- ✅ Miễn phí
- ✅ Open source models
- ❌ Cần self-host hoặc dùng API
- ❌ Accuracy có thể thấp hơn

## 🚀 Setup Instructions

### Option 1: OpenAI Vision API (Khuyến nghị)

#### Bước 1: Lấy API Key
1. Vào https://platform.openai.com/api-keys
2. Tạo API key mới
3. Copy key

#### Bước 2: Thêm Secret vào Supabase
```bash
# Trong Supabase Dashboard
# Settings → Edge Functions → Secrets
# Thêm: OPENAI_API_KEY=sk-...
```

#### Bước 3: Cập nhật Edge Function
Xem file: `supabase/functions/moderate-content/openai-implementation.ts`

### Option 2: Google Cloud Vision API

#### Bước 1: Setup Google Cloud
1. Tạo project tại https://console.cloud.google.com
2. Enable Vision API
3. Tạo Service Account
4. Download JSON credentials

#### Bước 2: Thêm Secret vào Supabase
```bash
# Upload JSON file hoặc dùng environment variable
GOOGLE_APPLICATION_CREDENTIALS_JSON=<base64-encoded-json>
```

#### Bước 3: Cập nhật Edge Function
Xem file: `supabase/functions/moderate-content/google-vision-implementation.ts`

### Option 3: AWS Rekognition

#### Bước 1: Setup AWS
1. Tạo AWS account
2. Tạo IAM user với Rekognition permissions
3. Tạo Access Key

#### Bước 2: Thêm Secret vào Supabase
```bash
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
```

#### Bước 3: Cập nhật Edge Function
Xem file: `supabase/functions/moderate-content/aws-rekognition-implementation.ts`

## 📝 Implementation Files

Tôi sẽ tạo các file implementation cho từng service. Bạn chỉ cần:
1. Chọn service phù hợp
2. Copy code vào Edge Function
3. Setup secrets
4. Deploy

## 🔍 Testing

Sau khi setup, test với:
```typescript
// Test trong app
const result = await ContentModerationService.moderateContent(
  'https://example.com/image.jpg'
);
console.log(result);
```

## 💰 Cost Estimation

- **OpenAI**: ~$0.01-0.03 per image → ~$10-30 per 1000 reels
- **Google Vision**: Free tier 1000/month → $1.50 per 1000 after
- **AWS Rekognition**: Free tier 5000/month → $1.00 per 1000 after
- **Hugging Face**: Free (limited)

## 🎯 Next Steps

1. Chọn AI service phù hợp
2. Setup credentials
3. Cập nhật Edge Function với implementation tương ứng
4. Deploy và test




