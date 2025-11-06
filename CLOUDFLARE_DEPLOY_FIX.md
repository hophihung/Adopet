# 🔧 Fix Cloudflare Worker Deployment Error

## Vấn đề

Cloudflare Worker bị lỗi khi deploy hoặc nhận GET request thay vì POST.

## Giải pháp

### Option 1: Dùng Simplified Version (Khuyến nghị)

File `payos-proxy-simple.js` là version đơn giản hơn, dễ deploy:

1. Copy code từ `payos-proxy-simple.js`
2. Vào Cloudflare Dashboard → **Workers & Pages** → **payos**
3. Click **Edit code**
4. **Xóa toàn bộ code cũ**
5. Paste code mới từ `payos-proxy-simple.js`
6. Click **Save and deploy**

### Option 2: Fix Code hiện tại

Nếu muốn dùng code đầy đủ, kiểm tra:

1. **Syntax errors:**
   - Đảm bảo không có lỗi syntax
   - Check dấu ngoặc, dấu phẩy

2. **Export format:**
   - Phải là `export default { ... }`
   - Không dùng `export { ... }`

3. **Async function:**
   - `async fetch(request, env, ctx)` phải đúng format

## Các lỗi thường gặp khi deploy

### Lỗi 1: Syntax Error

**Error:** "SyntaxError: Unexpected token"

**Fix:**
- Kiểm tra dấu ngoặc đóng
- Kiểm tra dấu phẩy
- Đảm bảo tất cả strings đều có quotes

### Lỗi 2: Export Error

**Error:** "Export is not defined"

**Fix:**
- Dùng `export default { ... }`
- Không dùng `export { ... }`

### Lỗi 3: Module Error

**Error:** "Module not found" hoặc "Cannot resolve module"

**Fix:**
- Cloudflare Workers không support `import` từ npm packages
- Chỉ dùng built-in APIs (fetch, Response, etc.)

## Test sau khi deploy

### Test 1: Test với curl

```bash
curl -X POST https://payos.thanvinh1602-4a0.workers.dev \
  -H "Content-Type: application/json" \
  -H "x-client-id: TEST_ID" \
  -H "x-api-key: TEST_KEY" \
  -d '{"test": "data"}'
```

**Expected:**
- Nếu deploy thành công: Sẽ thấy response từ PayOS API hoặc error từ PayOS
- Nếu deploy lỗi: Sẽ thấy syntax error hoặc module error

### Test 2: Test trong Browser

1. Mở browser console
2. Chạy:
```javascript
fetch('https://payos.thanvinh1602-4a0.workers.dev', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-client-id': 'TEST_ID',
    'x-api-key': 'TEST_KEY'
  },
  body: JSON.stringify({test: 'data'})
}).then(r => r.text()).then(console.log);
```

**Expected:**
- Method not allowed nếu method không phải POST (đúng behavior)
- Response từ PayOS nếu method là POST

### Test 3: Check Logs

1. Vào Cloudflare Dashboard → **Workers** → **payos** → **Logs**
2. Xem có errors không
3. Xem logs từ requests

## Troubleshooting

### Issue 1: Deploy không thành công

**Check:**
1. Code có syntax error không?
2. Format export đúng không?
3. Có dùng APIs không support không?

**Fix:**
- Dùng `payos-proxy-simple.js` (version đơn giản hơn)
- Hoặc check từng dòng code

### Issue 2: Worker deploy nhưng trả về error

**Check:**
1. Logs trong Cloudflare Dashboard
2. Error message cụ thể
3. Request method (GET vs POST)

**Fix:**
- Nếu method = GET → Có thể là browser test hoặc redirect
- Nếu method = POST → Check PayOS API credentials

### Issue 3: Worker không nhận POST requests

**Check:**
1. Request từ Supabase Edge Function có method = POST không?
2. Có redirect nào không?
3. URL có đúng không?

**Fix:**
- Check Supabase Edge Function logs
- Xem "Sending request to: ..." có đúng URL không
- Xem method trong fetch call có là 'POST' không

## Next Steps

1. ✅ Deploy lại với `payos-proxy-simple.js`
2. ✅ Test với curl hoặc browser
3. ✅ Check logs trong Cloudflare
4. ✅ Test từ Supabase Edge Function
5. ✅ Check Supabase logs để xem request method

## Code đã được tối ưu

`payos-proxy-simple.js` là version đơn giản:
- ✅ Ít code hơn
- ✅ Dễ deploy
- ✅ Vẫn đầy đủ chức năng
- ✅ Better error handling

