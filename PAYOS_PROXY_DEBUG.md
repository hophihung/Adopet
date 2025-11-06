# 🔍 Debug PayOS Proxy - Tại sao không có logs?

## Vấn đề

Proxy Cloudflare Worker không có logs, Edge Function vẫn gọi trực tiếp PayOS API.

## Nguyên nhân có thể

1. **`PAYOS_PROXY_URL` chưa được set trong Supabase Secrets**
2. **Edge Function chưa được deploy lại sau khi set secret**
3. **Secret chưa được sync đến Edge Function runtime**

## Cách kiểm tra và fix

### Bước 1: Kiểm tra PAYOS_PROXY_URL có được set chưa

```bash
# List tất cả secrets
supabase secrets list
```

Hoặc trong Supabase Dashboard:
1. Vào **Project Settings** → **Edge Functions** → **Secrets**
2. Kiểm tra xem có `PAYOS_PROXY_URL` không
3. Xem giá trị có đúng không: `https://payos.thanvinh1602-4a0.workers.dev`

### Bước 2: Set PAYOS_PROXY_URL (nếu chưa có)

```bash
# Set proxy URL
supabase secrets set PAYOS_PROXY_URL=https://payos.thanvinh1602-4a0.workers.dev
```

**Lưu ý:** 
- Có thể dùng với hoặc không có `https://` (code sẽ tự động thêm)
- Sau khi set, cần **deploy lại Edge Function** để secret có hiệu lực

### Bước 3: Deploy lại Edge Function

```bash
supabase functions deploy create-payos-payment-link
```

**QUAN TRỌNG:** Secrets chỉ được load khi Edge Function được deploy, không phải khi code được update.

### Bước 4: Kiểm tra logs trong Supabase

Sau khi deploy và test, check logs trong Supabase Dashboard:

1. Vào **Edge Functions** → **create-payos-payment-link** → **Logs**
2. Tìm log messages:
   - ✅ `"PAYOS_PROXY_URL found in environment: ..."` → Proxy đã được detect
   - ✅ `"Using PayOS proxy: https://payos.thanvinh1602-4a0.workers.dev"` → Đang dùng proxy
   - ❌ `"PAYOS_PROXY_URL not set"` → Secret chưa được set hoặc chưa deploy

### Bước 5: Kiểm tra logs trong Cloudflare Worker

1. Vào Cloudflare Dashboard → **Workers & Pages** → **payos**
2. Click tab **Logs** hoặc **Real-time Logs**
3. Xem có requests từ Supabase không

**Nếu không thấy logs:**
- Proxy chưa được gọi (Edge Function vẫn dùng direct API)
- Kiểm tra lại Bước 1-3

**Nếu thấy logs:**
- Proxy đang hoạt động
- Xem logs để debug lỗi cụ thể

## Test Proxy trực tiếp

Test xem Cloudflare Worker có hoạt động không:

```bash
curl -X POST https://payos.thanvinh1602-4a0.workers.dev \
  -H "Content-Type: application/json" \
  -H "x-client-id: YOUR_CLIENT_ID" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "orderCode": 123456,
    "amount": 10000,
    "description": "Test",
    "returnUrl": "https://example.com",
    "cancelUrl": "https://example.com"
  }'
```

**Nếu proxy hoạt động:**
- Sẽ thấy response từ PayOS API
- Hoặc error message rõ ràng

**Nếu proxy không hoạt động:**
- Check Cloudflare Worker code
- Check Worker đã được deploy chưa
- Check Worker có bị block không

## Checklist

- [ ] `PAYOS_PROXY_URL` đã được set trong Supabase Secrets
- [ ] Edge Function đã được deploy lại sau khi set secret
- [ ] Supabase logs hiển thị "Using PayOS proxy"
- [ ] Cloudflare Worker đã được deploy với code mới nhất
- [ ] Cloudflare Worker logs hiển thị requests từ Supabase

## Common Issues

### Issue 1: Secret được set nhưng Edge Function không nhận

**Fix:**
1. Deploy lại Edge Function: `supabase functions deploy create-payos-payment-link`
2. Chờ 1-2 phút để secret sync
3. Test lại

### Issue 2: Proxy URL sai format

**Fix:**
```bash
# Set lại với đầy đủ https://
supabase secrets set PAYOS_PROXY_URL=https://payos.thanvinh1602-4a0.workers.dev
```

### Issue 3: Cloudflare Worker không có logs

**Có thể do:**
- Worker chưa được deploy
- Worker code có lỗi
- Worker bị rate limit

**Fix:**
1. Check Worker code trong Cloudflare Dashboard
2. Deploy lại Worker
3. Test trực tiếp Worker URL

## Next Steps

1. ✅ Set `PAYOS_PROXY_URL` trong Supabase Secrets
2. ✅ Deploy lại Edge Function
3. ✅ Test và check logs
4. ✅ Nếu vẫn không work, test proxy trực tiếp

