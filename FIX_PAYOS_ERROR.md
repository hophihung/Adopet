# 🔧 Fix PayOS Edge Function Error

## Lỗi hiện tại
```
Error: Edge Function returned a non-2xx status code
```

## Nguyên nhân có thể

1. **Edge Function chưa được deploy**
2. **PayOS credentials chưa được set trong Supabase Secrets**
3. **Transaction có amount = 0 (miễn phí)**

## Cách fix

### Bước 1: Deploy Edge Function

```bash
# Login to Supabase (nếu chưa login)
supabase login

# Link project (nếu chưa link)
supabase link --project-ref YOUR_PROJECT_REF

# Deploy Edge Function
supabase functions deploy create-payos-payment-link
supabase functions deploy get-payos-payment-info
```

### Bước 2: Set PayOS Credentials trong Supabase Secrets

**BẮT BUỘC:** PayOS credentials phải được set trong Supabase Secrets:

```bash
# Set PayOS credentials
supabase secrets set PAYOS_CLIENT_ID=your_client_id
supabase secrets set PAYOS_API_KEY=your_api_key
supabase secrets set PAYOS_CHECKSUM_KEY=your_checksum_key
```

**Lấy credentials từ PayOS Dashboard:**
1. Đăng nhập https://merchant.payos.vn/
2. Vào **Settings > API Keys**
3. Copy:
   - **Client ID**
   - **API Key**
   - **Checksum Key**

### Bước 3: Kiểm tra Edge Function Logs

1. Vào Supabase Dashboard → **Edge Functions** → **create-payos-payment-link**
2. Click **Logs** để xem chi tiết lỗi
3. Kiểm tra xem có lỗi gì không

### Bước 4: Test lại

1. Tạo transaction với amount > 0
2. QR code sẽ tự động được tạo
3. Nếu vẫn lỗi, check logs để xem chi tiết

## Lưu ý

- ✅ **Transaction miễn phí (amount = 0)** sẽ không tạo PayOS payment link
- ✅ **Transaction có phí (amount > 0)** mới tạo PayOS payment link
- ✅ Edge Function đã được cập nhật để xử lý trường hợp amount = 0

## Troubleshooting

### Lỗi: "PayOS credentials not configured"
→ Set PayOS secrets: `supabase secrets set PAYOS_CLIENT_ID=...`

### Lỗi: "Edge Function not found"
→ Deploy function: `supabase functions deploy create-payos-payment-link`

### Lỗi: "Amount must be at least 1,000 VNĐ"
→ PayOS yêu cầu minimum 1,000 VNĐ. Nếu pet miễn phí (amount = 0), sẽ không tạo payment link.

