# 🚀 Content Moderation - Quick Start Guide

## ⚡ Setup nhanh với OpenAI (5 phút)

### Bước 1: Lấy OpenAI API Key
1. Vào https://platform.openai.com/api-keys
2. Đăng nhập/Đăng ký
3. Click "Create new secret key"
4. Copy key (bắt đầu với `sk-...`)

### Bước 2: Thêm vào Supabase Secrets
1. Vào Supabase Dashboard
2. Settings → Edge Functions → Secrets
3. Click "Add new secret"
4. Name: `OPENAI_API_KEY`
5. Value: Paste API key của bạn
6. Click "Save"

### Bước 3: Deploy Edge Function
```bash
# Trong terminal
cd supabase/functions/moderate-content
supabase functions deploy moderate-content
```

Hoặc trong Supabase Dashboard:
1. Edge Functions → moderate-content
2. Click "Deploy"

### Bước 4: Test
1. Upload một reel trong app
2. Kiểm tra logs trong Supabase Dashboard → Edge Functions → Logs
3. Nếu thấy lỗi, kiểm tra lại API key

## ✅ Xong! 

Bây giờ hệ thống sẽ tự động:
- ✅ Phân tích ảnh/video với AI
- ✅ Kiểm tra nội dung nhạy cảm
- ✅ Kiểm tra xem có phải pet không
- ✅ Tự động reject nếu không phù hợp

## 💰 Chi phí

OpenAI Vision API:
- GPT-4o: ~$0.01-0.03 per image
- GPT-4 Turbo: ~$0.005-0.01 per image
- 1000 reels ≈ $10-30

## 🔧 Troubleshooting

### Lỗi: "OPENAI_API_KEY not set"
→ Kiểm tra lại Secrets trong Supabase Dashboard

### Lỗi: "Rate limit exceeded"
→ Bạn đã dùng hết quota. Upgrade plan hoặc chờ reset

### Lỗi: "Invalid API key"
→ Kiểm tra lại key có đúng không

### Không reject nội dung không phù hợp
→ Kiểm tra logs trong Edge Functions để xem response từ OpenAI

## 📝 Next Steps

Sau khi setup thành công, bạn có thể:
1. Tùy chỉnh prompt trong `moderateWithOpenAI()` function
2. Thêm các rules khác
3. Tích hợp service khác (Google Vision, AWS Rekognition)

Xem file `CONTENT_MODERATION_SETUP.md` để biết chi tiết hơn.


