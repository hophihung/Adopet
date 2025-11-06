# 🔧 Fix PayOS Edge Function Error

## Lỗi hiện tại
```
Error: Edge Function returned a non-2xx status code
Error creating PayOS payment link: [FunctionsHttpError: Edge Function returned a non-2xx status code]
```

## Nguyên nhân có thể

1. **Edge Function chưa được deploy** (phổ biến nhất)
2. **PayOS credentials chưa được set trong Supabase Secrets**
3. **Transaction có amount = 0 hoặc < 1000 VND** (PayOS minimum)
4. **Edge Function đang trả về lỗi 400/500**

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

**BẮT BUỘC:** PayOS credentials phải được set trong Supabase Secrets.

**Cách 1: Qua Supabase Dashboard (Dễ nhất)**
1. Vào Supabase Dashboard → **Project Settings** → **Edge Functions** → **Secrets**
2. Click **Add new secret** và thêm từng secret:
   - Name: `PAYOS_CLIENT_ID`, Value: `your_client_id`
   - Name: `PAYOS_API_KEY`, Value: `your_api_key`
   - Name: `PAYOS_CHECKSUM_KEY`, Value: `your_checksum_key`
3. Click **Save**

**Cách 2: Qua Supabase CLI**
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

### Bước 3: Kiểm tra Edge Function Logs (QUAN TRỌNG!)

1. Vào Supabase Dashboard → **Edge Functions** → **create-payos-payment-link**
2. Click tab **Logs** để xem chi tiết lỗi
3. Kiểm tra các log gần nhất (có thể có nhiều log, scroll xuống để xem)

**Các lỗi thường gặp trong logs:**

#### ❌ `PayOS credentials not configured`
→ **Cần set secrets ngay!** Vào Dashboard → Settings → Edge Functions → Secrets → Add PayOS credentials

#### ✅ `Cannot create payment link for free transaction (amount = 0)`
→ **Đúng, không cần fix.** Giao dịch miễn phí không tạo payment link.

#### ✅ `Amount must be at least 1,000 VNĐ`
→ **Đúng, không cần fix.** PayOS yêu cầu minimum 1,000 VNĐ.

#### ❌ `Missing required fields: transaction_id, amount, pet_name`
→ Check xem có đủ parameters không.

#### ❌ `Failed to create payment link` hoặc PayOS API error
→ Có thể do:
- PayOS credentials sai
- PayOS API đang có vấn đề
- Network error

### Bước 4: Test lại

1. Tạo transaction với amount >= 1000 VND (PayOS minimum)
2. QR code sẽ tự động được tạo
3. Nếu vẫn lỗi, check logs để xem chi tiết

**Lưu ý:**
- Transaction với amount = 0 hoặc < 1000 VND sẽ **KHÔNG** tạo PayOS payment link (đúng hành vi)
- Lỗi này sẽ không hiển thị cho user, chỉ log trong console

## Lưu ý

- ✅ **Transaction miễn phí (amount = 0)** sẽ không tạo PayOS payment link
- ✅ **Transaction có phí (amount > 0)** mới tạo PayOS payment link
- ✅ Edge Function đã được cập nhật để xử lý trường hợp amount = 0

## Troubleshooting

### Lỗi: "PayOS credentials not configured"
→ Set PayOS secrets:
```bash
supabase secrets set PAYOS_CLIENT_ID=your_client_id
supabase secrets set PAYOS_API_KEY=your_api_key
supabase secrets set PAYOS_CHECKSUM_KEY=your_checksum_key
```

### Lỗi: "Edge Function not found" hoặc "Function not deployed"
→ Deploy function:
```bash
supabase functions deploy create-payos-payment-link
supabase functions deploy get-payos-payment-info
```

### Lỗi: "Amount must be at least 1,000 VNĐ"
→ PayOS yêu cầu minimum 1,000 VNĐ. Nếu pet miễn phí (amount = 0) hoặc < 1000, sẽ không tạo payment link (đúng hành vi).

### Lỗi: "Cannot create payment link for free transaction"
→ Đúng, không cần fix. Giao dịch miễn phí không tạo PayOS payment link.

### Lỗi: "Edge Function returned a non-2xx status code" (không có chi tiết)
→ Check logs trong Supabase Dashboard để xem lỗi cụ thể:
1. Dashboard → Edge Functions → create-payos-payment-link → Logs
2. Xem error message chi tiết
3. Thường là do credentials chưa set hoặc function chưa deploy

