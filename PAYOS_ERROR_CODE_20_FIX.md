# 🔧 Fix PayOS Error Code 20: "Thông tin truyền lên không đúng"

## Vấn đề hiện tại

PayOS API trả về error code **20** với message **"Thông tin truyền lên không đúng."** và `data: null`.

**Logs từ Supabase:**
```
PayOS API response status: 200
PayOS API response: {"code":"20", "desc": "Thông tin truyền lên không đúng.", "data":null}
```

## Nguyên nhân

Error code 20 từ PayOS có nghĩa là request data không đúng format hoặc thiếu fields bắt buộc. Có thể do:

1. **Thiếu signature field** - PayOS yêu cầu signature (HMAC SHA256) - **ĐÂY LÀ NGUYÊN NHÂN CHÍNH!**
2. **OrderCode format không đúng** - PayOS yêu cầu orderCode là số nguyên và không quá lớn
3. **Thiếu hoặc sai fields bắt buộc** trong request body
4. **Description quá dài** hoặc có ký tự đặc biệt
5. **URLs không đúng format** (returnUrl, cancelUrl)
6. **Credentials không đúng** (Client ID, API Key, Checksum Key)

**Reference:** [PayOS API Documentation](https://payos.vn/docs/api/)

## Cách fix

### 1. Kiểm tra OrderCode

PayOS yêu cầu `orderCode` là số nguyên và phải là số dương. Code hiện tại:

```typescript
const orderCode = parseInt(
  Date.now().toString() + Math.floor(Math.random() * 1000).toString()
);
```

**Vấn đề:** Có thể tạo ra số quá lớn (vượt quá JavaScript safe integer limit).

**Fix:**
```typescript
// Generate order code that fits in PayOS requirements
// PayOS requires orderCode to be a positive integer
// Use timestamp (last 10 digits) + random 3 digits
const timestamp = Date.now().toString();
const last10Digits = timestamp.slice(-10); // Last 10 digits of timestamp
const randomPart = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
const orderCode = parseInt(last10Digits + randomPart);

// Ensure orderCode is within valid range (1 to 999999999999999)
if (orderCode > 999999999999999) {
  orderCode = parseInt(orderCode.toString().slice(-15));
}
```

### 2. Tạo Signature (BẮT BUỘC - ĐÃ ĐƯỢC THÊM)

**QUAN TRỌNG:** PayOS API yêu cầu `signature` field trong request body. Đây là nguyên nhân chính của error code 20!

Theo [PayOS API Documentation](https://payos.vn/docs/api/), signature được tạo bằng:
- Algorithm: HMAC SHA256
- Key: Checksum Key từ PayOS dashboard
- Data format: `amount=$amount&cancelUrl=$cancelUrl&description=$description&orderCode=$orderCode&returnUrl=$returnUrl` (sorted alphabetically)

**✅ Code đã được cập nhật** để tự động tạo signature. Đảm bảo:
- ✅ `PAYOS_CHECKSUM_KEY` đã được set trong Supabase Secrets
- ✅ Signature được tính đúng format (alphabetically sorted)
- ✅ Signature được thêm vào request body

**Xem chi tiết:** [PAYOS_SIGNATURE_FIX.md](./PAYOS_SIGNATURE_FIX.md)

### 3. Kiểm tra Request Body

Đảm bảo request body có đầy đủ fields theo [PayOS API Documentation](https://payos.vn/docs/api/):

```typescript
const paymentData = {
  orderCode: orderCode,           // ✅ Required: integer
  amount: Math.round(amount),     // ✅ Required: integer (VND)
  description: description,        // ✅ Required: string
  items: [                         // ✅ Required: Array of objects
    {
      name: pet_name,             // ✅ Required: string
      quantity: 1,                // ✅ Required: integer
      price: Math.round(amount),   // ✅ Required: integer (VND)
    },
  ],
  cancelUrl: cancelUrl,           // ✅ Required: string (URI)
  returnUrl: returnUrl,           // ✅ Required: string (URI)
  signature: signature,           // ✅ Required: string (HMAC SHA256) - QUAN TRỌNG!
  expiredAt: Math.floor(Date.now() / 1000) + 15 * 60, // Optional: Unix timestamp (Int32)
};
```

### 4. Kiểm tra Description

Description có thể quá dài hoặc có ký tự không hợp lệ:

```typescript
// Truncate description if too long (PayOS may have max length)
const maxDescriptionLength = 255; // Check PayOS docs for actual limit
let description = `Thanh toán cho ${pet_name} - Mã giao dịch: ${transaction_code}`;
if (description.length > maxDescriptionLength) {
  description = description.substring(0, maxDescriptionLength - 3) + '...';
}
```

### 5. Validate PayOS Credentials

Đảm bảo credentials đúng:

```bash
# Check secrets
supabase secrets list

# Verify credentials từ PayOS Dashboard
# https://merchant.payos.vn/ → Settings → API Keys
```

### 6. Kiểm tra URLs

Return URL và Cancel URL phải đúng format:

```typescript
// Ensure URLs are valid
const returnUrl = return_url || 'petadoption://payment-success';
const cancelUrl = cancel_url || 'petadoption://payment-cancel';

// Validate URL format
try {
  new URL(returnUrl);
  new URL(cancelUrl);
} catch (e) {
  console.error('Invalid URL format:', returnUrl, cancelUrl);
  // Use default URLs
}
```

## Debug Steps

### Bước 1: Enable Detailed Logging

Code đã được cập nhật để log:
- Request data (orderCode, amount, description, etc.)
- Request headers (x-client-id, x-api-key - masked)
- Response status và body

### Bước 2: Check Logs

Sau khi deploy và test, check logs:

1. **Supabase Logs:**
   - "PayOS request data: ..."
   - "Sending request to: ..."
   - "Request headers: ..."
   - "PayOS API response status: ..."
   - "PayOS API response: ..."

2. **Cloudflare Worker Logs:**
   - "Request body (first 500 chars): ..."
   - "PayOS API response status: ..."
   - "PayOS API response (first 500 chars): ..."

### Bước 3: Compare với PayOS Documentation

Kiểm tra PayOS API documentation để đảm bảo:
- ✅ Request format đúng
- ✅ Fields bắt buộc có đầy đủ
- ✅ Data types đúng
- ✅ Value ranges hợp lệ

## Test với PayOS Official SDK

Nếu vẫn lỗi, thử test với PayOS Official SDK để xem format đúng:

```javascript
import { PayOS } from '@payos/node';

const payos = new PayOS({
  clientId: process.env.PAYOS_CLIENT_ID,
  apiKey: process.env.PAYOS_API_KEY,
  checksumKey: process.env.PAYOS_CHECKSUM_KEY,
});

const paymentLink = await payos.paymentRequests.create({
  orderCode: 123,
  amount: 2000,
  description: 'payment',
  returnUrl: 'https://your-url.com',
  cancelUrl: 'https://your-url.com',
});
```

So sánh request body từ SDK với request body của chúng ta.

## Common Issues

### Issue 1: OrderCode quá lớn

**Fix:** Giảm độ dài orderCode:
```typescript
// Use shorter orderCode
const orderCode = Date.now() % 1000000000; // 9 digits max
```

### Issue 2: Description có ký tự đặc biệt

**Fix:** Sanitize description:
```typescript
// Remove special characters
const description = `Thanh toán cho ${pet_name} - Mã: ${transaction_code}`
  .replace(/[^\w\s-]/g, '')
  .substring(0, 255);
```

### Issue 3: Amount không đúng format

**Fix:** Đảm bảo amount là số nguyên:
```typescript
const amount = Math.round(Number(amount)); // Ensure integer
```

## Next Steps

1. ✅ Deploy lại Edge Function với logging mới
2. ✅ Test và xem logs chi tiết
3. ✅ So sánh request body với PayOS documentation
4. ✅ Fix các vấn đề về format
5. ✅ Test lại

