# PayOS Transaction Payment Setup Guide

Hướng dẫn tích hợp PayOS Payment cho transactions trong chat.

## 📋 Tổng quan

PayOS là payment gateway của Việt Nam, hỗ trợ thanh toán qua:
- **QR Code** (VietQR, Momo, ZaloPay, etc.)
- **Payment Link** (mở trong browser)
- **Webhook** để xác nhận thanh toán tự động

Khi người mua quét thú cưng trong chat và nhận transaction code, họ có thể:
1. **Thanh toán qua PayOS** (QR Code hoặc Payment Link)
2. **Chuyển khoản thủ công** (upload ảnh chứng từ)

## 🔑 Bước 1: Đăng ký PayOS Account

1. Truy cập [PayOS Merchant Portal](https://merchant.payos.vn/)
2. Đăng ký tài khoản merchant
3. Xác thực tài khoản (cần giấy phép kinh doanh)
4. Lấy **Client ID**, **API Key**, và **Checksum Key** từ dashboard

## 🔧 Bước 2: Cấu hình Environment Variables

### 2.1 Thêm vào .env (Optional - chỉ cần Return URLs)

```env
# PayOS Return URLs (optional - có thể dùng default)
EXPO_PUBLIC_PAYOS_RETURN_URL=adopet://payment-success
EXPO_PUBLIC_PAYOS_CANCEL_URL=adopet://payment-cancel
```

**LƯU Ý QUAN TRỌNG:**
- ❌ **KHÔNG cần** `EXPO_PUBLIC_PAYOS_CLIENT_ID` và `EXPO_PUBLIC_PAYOS_API_KEY` trong .env
- ✅ PayOS credentials chỉ cần lưu trong **Supabase Secrets** (bảo mật hơn)
- ✅ Client app gọi Edge Function, Edge Function mới gọi PayOS API

### 2.2 Thêm vào Supabase Secrets (BẮT BUỘC)

```bash
# Cần cài Supabase CLI trước
# Nếu chưa có: winget install Supabase.CLI

# BẮT BUỘC: Set PayOS credentials trong Supabase Secrets
# Các credentials này CHỈ dùng trong Edge Functions (server-side)
supabase secrets set PAYOS_CLIENT_ID=your_client_id
supabase secrets set PAYOS_API_KEY=your_api_key
supabase secrets set PAYOS_CHECKSUM_KEY=your_checksum_key
```

**Tại sao không có EXPO_PUBLIC_ prefix?**
- `EXPO_PUBLIC_` prefix = biến được expose ra client (không bảo mật)
- Supabase Secrets = biến chỉ chạy trên server (bảo mật)
- PayOS credentials nên được giữ secret, chỉ dùng trong Edge Functions
- Client app không cần biết PayOS credentials, chỉ cần gọi Edge Function

## 📱 Bước 3: Deploy Supabase Edge Functions

### 3.1 Deploy Functions

```bash
# Deploy create payment link function
supabase functions deploy create-payos-payment-link

# Deploy get payment info function
supabase functions deploy get-payos-payment-info

# Deploy webhook handler (optional)
supabase functions deploy payos-webhook
```

### 3.2 Set Webhook URL trong PayOS Dashboard

1. Đăng nhập PayOS Dashboard
2. Vào **Settings > Webhooks**
3. Thêm webhook URL: `https://your-project.supabase.co/functions/v1/payos-webhook`
4. Chọn events: `PAYMENT_SUCCESS`, `PAYMENT_FAILED`

## 🗄️ Bước 4: Chạy Database Migration

Chạy migration để tạo function xác nhận transaction:

```sql
-- Chạy file: supabase/migrations/015_add_stripe_transaction_confirmation.sql
-- (Đã được cập nhật để dùng PayOS)
```

## 💳 Bước 5: Test PayOS Payment

### 5.1 Test Cards/Methods

PayOS hỗ trợ nhiều phương thức thanh toán:
- **VietQR**: Quét QR code
- **Momo**: Ví điện tử
- **ZaloPay**: Ví điện tử
- **Bank Transfer**: Chuyển khoản ngân hàng

### 5.2 Test Flow

1. Tạo transaction trong chat
2. Nhấn "Thanh toán qua PayOS"
3. Chọn một trong các phương thức:
   - Quét QR Code
   - Mở payment link
4. Thanh toán bằng test account
5. Nhấn "Kiểm tra trạng thái thanh toán" để xác nhận

## 📝 Checklist

- [ ] Đăng ký PayOS merchant account
- [ ] Lấy Client ID, API Key, Checksum Key
- [ ] Thêm vào `.env` file
- [ ] Set Supabase secrets
- [ ] Deploy Edge Functions
- [ ] Cấu hình Webhook trong PayOS dashboard
- [ ] Chạy database migration
- [ ] Test payment flow

## 🎯 Features

✅ **Hiển thị ảnh pet** trong transaction card
✅ **Tự động mapping giá** từ pet.price
✅ **PayOS Payment Link** - QR Code và Payment Link
✅ **Webhook support** - Tự động xác nhận khi thanh toán thành công
✅ **Fallback** - Chuyển khoản thủ công (upload ảnh chứng từ)

## 🔒 Security Notes

- **KHÔNG** commit PayOS API keys vào Git
- **LUÔN** sử dụng environment variables
- **LUÔN** validate webhook signature từ PayOS
- **LUÔN** sử dụng test mode trước khi deploy production

## 📚 Tài liệu tham khảo

- [PayOS Documentation](https://payos.vn/docs/)
- [PayOS API Reference](https://payos.vn/docs/api-reference/)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

## 🆘 Troubleshooting

### Lỗi: "PayOS credentials not configured"
→ Kiểm tra Supabase secrets đã được set chưa

### Lỗi: "Failed to create payment link"
→ Kiểm tra API keys và Client ID có đúng không

### Payment link không hoạt động
→ Kiểm tra return_url và cancel_url có đúng format không

### Webhook không nhận được
→ Kiểm tra webhook URL trong PayOS dashboard và Supabase function logs

