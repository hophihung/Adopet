# 🔧 Environment Variables Setup Guide

## 📝 Các bước setup nhanh

### 1️⃣ **Supabase Configuration**

```bash
# Vào: https://app.supabase.com/project/YOUR_PROJECT/settings/api
# Copy 2 values sau:
```

Thêm vào file `.env`:
```env
EXPO_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2️⃣ **Stripe Configuration**

#### A. Tạo Stripe Account (miễn phí)
1. Đăng ký tại: https://dashboard.stripe.com/register
2. Xác nhận email
3. Vào Dashboard

#### B. Lấy API Keys
```bash
# Vào: https://dashboard.stripe.com/test/apikeys
# Hoặc click: Developers > API keys
```

**Lấy Publishable Key:**
- Tìm dòng "Publishable key" 
- Click "Reveal test key"
- Copy key (bắt đầu bằng `pk_test_...`)

Thêm vào `.env`:
```env
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51ABCDxxxxxxxxxxx
```

#### C. Setup Edge Functions Secrets (Quan trọng!)

**Lấy Secret Key:**
```bash
# Trong Stripe Dashboard > API keys
# Click "Reveal test key" ở dòng "Secret key"
# Copy key (bắt đầu bằng sk_test_...)
```

**Lấy Service Role Key:**
```bash
# Supabase Dashboard > Project Settings > API
# Copy "service_role" key (dưới "Project API keys")
```

**Deploy secrets:**
```bash
# Install Supabase CLI nếu chưa có
npm install -g supabase

# Login
supabase login

# Link project (thay YOUR_PROJECT_REF bằng project ref của bạn)
supabase link --project-ref YOUR_PROJECT_REF

# Set secrets (QUAN TRỌNG!)
supabase secrets set STRIPE_SECRET_KEY=sk_test_xxxxx
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3️⃣ **Deploy Edge Functions**

```bash
# Deploy payment intent function
supabase functions deploy create-payment-intent

# Deploy webhook handler
supabase functions deploy stripe-webhook
```

### 4️⃣ **Setup Stripe Webhook**

1. Vào: https://dashboard.stripe.com/test/webhooks
2. Click "Add endpoint"
3. URL: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/stripe-webhook`
4. Chọn events:
   - ✅ `payment_intent.succeeded`
   - ✅ `payment_intent.payment_failed`
5. Click "Add endpoint"
6. Copy "Signing secret" (whsec_...)
7. Set webhook secret:
```bash
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

### 5️⃣ **Kiểm tra setup**

```bash
# Verify secrets đã được set
supabase secrets list

# Expected output:
# STRIPE_SECRET_KEY
# STRIPE_WEBHOOK_SECRET  
# SUPABASE_SERVICE_ROLE_KEY
```

---

## ✅ Checklist hoàn tất

- [ ] Copy Supabase URL và Anon Key vào `.env`
- [ ] Copy Stripe Publishable Key vào `.env`
- [ ] Install Supabase CLI: `npm install -g supabase`
- [ ] Login Supabase: `supabase login`
- [ ] Link project: `supabase link --project-ref YOUR_REF`
- [ ] Set Stripe Secret Key: `supabase secrets set STRIPE_SECRET_KEY=...`
- [ ] Set Service Role Key: `supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...`
- [ ] Deploy create-payment-intent: `supabase functions deploy create-payment-intent`
- [ ] Deploy stripe-webhook: `supabase functions deploy stripe-webhook`
- [ ] Setup webhook endpoint in Stripe Dashboard
- [ ] Set webhook secret: `supabase secrets set STRIPE_WEBHOOK_SECRET=...`
- [ ] Test với thẻ: 4242 4242 4242 4242

---

## 🧪 Test Payment

Sau khi setup xong:

1. Chạy app: `npm run dev`
2. Đăng ký/Đăng nhập
3. Chọn role "Seller"
4. Chọn gói Premium/Pro
5. Nhập thẻ test: **4242 4242 4242 4242**
6. Expiry: **12/34**, CVC: **123**
7. Click "Pay"
8. Kiểm tra console logs

---

## 🆘 Troubleshooting

### Error: "No publishable key found"
```bash
# Kiểm tra file .env có key chưa
cat .env | grep STRIPE_PUBLISHABLE

# Restart Metro bundler
npm run dev
```

### Error: "Function invocation failed"
```bash
# Kiểm tra Edge Function logs
supabase functions logs create-payment-intent

# Verify secrets
supabase secrets list
```

### Error: "Invalid API key"
```bash
# Đảm bảo dùng đúng test key (bắt đầu pk_test_ và sk_test_)
# KHÔNG dùng live keys khi dev
```

### Webhook không hoạt động
```bash
# Kiểm tra webhook secret
supabase secrets list | grep STRIPE_WEBHOOK

# Test webhook từ Stripe Dashboard > Webhooks > Send test webhook
```

---

## 📞 Support

- **Stripe Docs**: https://stripe.com/docs/keys
- **Supabase Functions**: https://supabase.com/docs/guides/functions
- **React Native Stripe**: https://stripe.dev/stripe-react-native

## 💡 Tips

1. **Luôn dùng test mode** khi development
2. **Không commit** file `.env` vào git
3. **Verify logs** sau mỗi test payment
4. **Test tất cả cards** (success, decline, auth required)

