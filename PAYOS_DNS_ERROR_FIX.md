# 🔧 Fix PayOS DNS Error

## Lỗi hiện tại
```
DNS error: failed to lookup address information: No address associated with hostname: api.payos.vn
```

## Nguyên nhân

Lỗi DNS này xảy ra khi Supabase Edge Functions không thể resolve domain PayOS API. Có thể do:

1. **Sai endpoint URL** - PayOS Official SDK sử dụng `api-merchant.payos.vn` thay vì `api.payos.vn`
2. **Tạm thời - DNS server issue** (phổ biến nhất)
3. **Supabase Edge Functions region không thể access domain .vn** (region ap-northeast-2)
4. **PayOS API endpoint đã thay đổi**
5. **Network configuration issue**

**Reference:** [PayOS Official Node SDK](https://github.com/payOSHQ/payos-lib-node)

## Cách fix

### ✅ Đã cập nhật Edge Function theo PayOS Official SDK

Tôi đã cập nhật Edge Function theo best practices từ [PayOS Official Node SDK](https://github.com/payOSHQ/payos-lib-node):

- ✅ **Correct API endpoint**: Sử dụng `https://api-merchant.payos.vn` (official SDK endpoint) thay vì `api.payos.vn`
- ✅ **Fallback endpoint**: Tự động thử `api.payos.vn` nếu endpoint chính fail
- ✅ **Retry logic**: Tự động retry 4 lần (tổng 5 lần thử) nếu gặp DNS error
- ✅ **Exponential backoff**: Delay giữa các retry: 1s → 2s → 4s → 8s (theo SDK pattern)
- ✅ **Timeout**: 60 seconds timeout (SDK default: 60000ms)
- ✅ **Better error handling**: Xử lý DNS errors cụ thể, check cả error.cause
- ✅ **Better logging**: Log chi tiết hơn cho debugging với endpoint info

### Bước 1: Deploy lại Edge Function

Deploy lại Edge Function đã được cập nhật:

```bash
supabase functions deploy create-payos-payment-link
```

### Bước 2: Test lại

1. Tạo transaction với amount >= 1000 VND
2. Edge Function sẽ:
   - Thử endpoint chính: `https://api-merchant.payos.vn` (official SDK endpoint)
   - Tự động retry tối đa 4 lần nếu gặp DNS error (tổng 5 lần thử)
   - Nếu endpoint chính fail, tự động thử fallback: `https://api.payos.vn`
   - Delay giữa các retry: 1s → 2s → 4s → 8s (exponential backoff)
3. Nếu vẫn lỗi sau tất cả retries và cả 2 endpoints, sẽ hiển thị error message rõ ràng với error_type: 'DNS_RESOLUTION_FAILED'

### Bước 3: Kiểm tra PayOS API Status

1. Kiểm tra PayOS status: https://status.payos.vn/ (nếu có)
2. Hoặc test API endpoint trực tiếp:
   ```bash
   curl https://api.payos.vn/v2/payment-requests
   ```

### Bước 4: Liên hệ PayOS Support

Nếu lỗi DNS vẫn tiếp tục:
1. Liên hệ PayOS support: support@payos.vn
2. Báo cáo: "DNS resolution failed for api.payos.vn from Supabase Edge Functions"
3. Cung cấp:
   - Project region: ap-northeast-2 (từ logs)
   - Error message: DNS resolution failed
   - Timestamp của lỗi

## Lưu ý

- ✅ Edge Function đã có retry logic với exponential backoff (4 retries, tổng 5 lần thử)
- ✅ Error message sẽ rõ ràng hơn với error_type và số lần thử
- ✅ Timeout 30s để tránh hang
- ✅ Better DNS error detection (check cả error.cause)
- ⚠️ Nếu lỗi DNS vẫn tiếp tục sau 5 lần thử, có thể là vấn đề từ phía PayOS hoặc Supabase network (region ap-northeast-2 có thể không resolve được domain .vn)
- ✅ **Edge Function đã hỗ trợ proxy URL** - Nếu `PAYOS_PROXY_URL` được set trong Supabase Secrets, sẽ tự động dùng proxy thay vì gọi trực tiếp PayOS API

## Alternative Solution (Nếu lỗi vẫn tiếp tục)

Nếu lỗi DNS vẫn tiếp tục sau khi deploy và test, có thể thử:

### 1. Contact Supabase Support
- Vào Supabase Dashboard → Support
- Báo cáo: "DNS resolution failed for api.payos.vn from Edge Functions in ap-northeast-2 region"
- Yêu cầu: Check DNS configuration hoặc suggest alternative region
- Cung cấp: Logs với error message và timestamp

### 2. Thay đổi Supabase Region (Nếu có thể)
- Nếu project cho phép, có thể thử region khác (ví dụ: ap-southeast-1 - Singapore)
- Region gần Việt Nam hơn có thể resolve domain .vn tốt hơn
- **Lưu ý**: Thay đổi region có thể ảnh hưởng đến performance và cost

### 3. Contact PayOS Support
- Email: support@payos.vn
- Báo cáo: "DNS resolution issue from Supabase Edge Functions"
- Hỏi: Có alternative endpoint hoặc IP address không?
- Cung cấp: Region và error details

### 4. Workaround: Dùng Proxy Service (Khuyến nghị nếu DNS vẫn fail)

Nếu DNS vẫn không resolve được, **khuyến nghị dùng Cloudflare Workers** làm proxy:

**Xem hướng dẫn chi tiết:** [PAYOS_PROXY_SOLUTION.md](./PAYOS_PROXY_SOLUTION.md)

**Tóm tắt:**
1. Tạo Cloudflare Worker (free) để proxy requests đến PayOS API
2. Set `PAYOS_PROXY_URL` trong Supabase Secrets
3. Edge Function sẽ tự động dùng proxy nếu được config

**Lợi ích:**
- ✅ Free tier đủ dùng
- ✅ Fast (CDN edge locations)
- ✅ Có thể resolve `.vn` domains
- ✅ Dễ deploy và maintain

**Setup:**
```bash
# Set proxy URL trong Supabase Secrets (có hoặc không có https:// đều OK)
supabase secrets set PAYOS_PROXY_URL=https://payos.thanvinh1602-4a0.workers.dev

# Hoặc (code sẽ tự động thêm https://)
supabase secrets set PAYOS_PROXY_URL=payos.thanvinh1602-4a0.workers.dev
```

**Lưu ý:** Edge Function đã được cập nhật để tự động validate và fix proxy URL (thêm `https://` nếu thiếu).

Edge Function đã được cập nhật để tự động dùng proxy nếu `PAYOS_PROXY_URL` được set.

## Test Edge Function

Sau khi deploy, test Edge Function:

1. Dashboard → Edge Functions → create-payos-payment-link → Test
2. Input:
   ```json
   {
     "transaction_id": "test-id",
     "amount": 10000,
     "pet_name": "Test Pet",
     "transaction_code": "TEST123"
   }
   ```
3. Xem logs để check xem có retry không


