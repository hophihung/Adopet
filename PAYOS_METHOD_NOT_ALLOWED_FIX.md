# 🔧 Fix "Method not allowed" Error (405)

## Vấn đề

Cloudflare Worker trả về **405 Method not allowed** với message "Method not allowed".

## Nguyên nhân

1. **Cloudflare Worker chưa được deploy với code mới**
2. **Request method không phải POST** (có thể bị redirect hoặc modify)
3. **Worker code cũ đang chạy** (chưa update)

## Cách fix

### Bước 1: Deploy lại Cloudflare Worker với code mới

1. Copy toàn bộ code từ `payos-proxy.js`
2. Vào Cloudflare Dashboard → **Workers & Pages** → **payos**
3. Click **Edit code**
4. Paste code mới vào
5. Click **Save and deploy** (hoặc **Deploy**)

**Quan trọng:** Đảm bảo code đã được deploy thành công (xem version number tăng lên).

### Bước 2: Kiểm tra Worker đã được deploy

1. Vào Cloudflare Dashboard → **Workers & Pages** → **payos** → **Deployments**
2. Xem deployment mới nhất có timestamp gần đây không
3. Đảm bảo status là "Active"

### Bước 3: Test Worker trực tiếp

Test xem Worker có hoạt động không:

```bash
curl -X POST https://payos.thanvinh1602-4a0.workers.dev \
  -H "Content-Type: application/json" \
  -H "x-client-id: TEST_CLIENT_ID" \
  -H "x-api-key: TEST_API_KEY" \
  -d '{"test": "data"}'
```

**Expected response:**
- Nếu Worker hoạt động: Sẽ thấy error từ PayOS API hoặc response từ PayOS
- Nếu Worker lỗi: Sẽ thấy "Method not allowed" hoặc error khác

### Bước 4: Kiểm tra Logs trong Cloudflare

Sau khi test, check logs:

1. Vào Cloudflare Dashboard → **Workers & Pages** → **payos**
2. Click tab **Logs** hoặc **Real-time Logs**
3. Xem có log "Proxy received request:" không
4. Xem method là gì:
   - Nếu method = "POST" → Worker đã nhận đúng
   - Nếu method ≠ "POST" → Có vấn đề với request

### Bước 5: Clear Cache (nếu cần)

Nếu vẫn lỗi sau khi deploy:

1. **Clear Cloudflare cache:**
   - Vào Cloudflare Dashboard → **Caching** → **Purge Everything**
   
2. **Wait a few minutes:**
   - Cloudflare có thể cache response
   - Đợi 2-3 phút sau khi deploy

## Code đã được cập nhật

Cloudflare Worker đã được cập nhật với:
- ✅ Logging chi tiết về request (method, URL, headers)
- ✅ Better error messages với method info
- ✅ JSON response cho errors (thay vì plain text)

## Debug Steps

### Check 1: Verify Worker Code

Đảm bảo code trong Cloudflare Dashboard có:
```javascript
// Log request method and URL for debugging
console.log('Proxy received request:', {
  method: request.method,
  url: request.url,
  headers: Object.fromEntries(request.headers.entries()),
});
```

### Check 2: Verify Request từ Edge Function

Trong Supabase logs, tìm:
- "Sending request to: https://payos.thanvinh1602-4a0.workers.dev"
- Xác nhận đang gửi đến proxy URL

### Check 3: Check Cloudflare Logs

Trong Cloudflare logs, tìm:
- "Proxy received request: { method: 'POST', ... }"
- Xem method có phải 'POST' không

## Common Issues

### Issue 1: Worker chưa được deploy

**Fix:**
1. Deploy lại Worker với code mới
2. Đợi 1-2 phút để deploy hoàn tất
3. Test lại

### Issue 2: Code cũ vẫn đang chạy

**Fix:**
1. Check deployment history
2. Đảm bảo latest deployment là code mới
3. Rollback nếu cần và deploy lại

### Issue 3: Request bị redirect

**Fix:**
1. Check Supabase Edge Function logs
2. Xem request URL có đúng không
3. Đảm bảo không có redirect nào

## Next Steps

1. ✅ Deploy lại Cloudflare Worker với code mới (có logging)
2. ✅ Test Worker trực tiếp với curl
3. ✅ Check Cloudflare logs để xem request method
4. ✅ Nếu vẫn lỗi, check Supabase logs để xem request URL

## Expected Behavior

Sau khi deploy code mới:

**Cloudflare Logs sẽ hiển thị:**
```
Proxy received request: {
  method: 'POST',
  url: 'https://payos.thanvinh1602-4a0.workers.dev',
  headers: { ... }
}
Processing POST request
Request body (first 500 chars): ...
PayOS API response status: ...
```

**Nếu method không phải POST:**
```
Proxy received request: {
  method: 'GET',  // hoặc method khác
  ...
}
Invalid request method: GET
```

