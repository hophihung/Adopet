# 🔧 PayOS Signature Fix - Đã thêm Signature vào Request

## Vấn đề

PayOS API trả về error code **20**: "Thông tin truyền lên không đúng." vì thiếu field **signature** trong request body.

## Nguyên nhân

Theo [PayOS API Documentation](https://payos.vn/docs/api/), field `signature` là **BẮT BUỘC** trong request body khi tạo payment link.

**Signature được tạo bằng:**
- Algorithm: HMAC SHA256
- Key: Checksum Key từ PayOS dashboard
- Data format: `amount=$amount&cancelUrl=$cancelUrl&description=$description&orderCode=$orderCode&returnUrl=$returnUrl` (sorted alphabetically)

## Đã sửa

### 1. Thêm hàm tạo Signature

```typescript
async function createPayOSSignature(
  amount: number,
  cancelUrl: string,
  description: string,
  orderCode: number,
  returnUrl: string,
  checksumKey: string
): Promise<string> {
  // Create data string sorted alphabetically
  const dataString = `amount=${amount}&cancelUrl=${cancelUrl}&description=${description}&orderCode=${orderCode}&returnUrl=${returnUrl}`;
  
  // Create HMAC SHA256 signature
  const encoder = new TextEncoder();
  const keyData = encoder.encode(checksumKey);
  const messageData = encoder.encode(dataString);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  
  // Convert to hex string
  const hashArray = Array.from(new Uint8Array(signature));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}
```

### 2. Thêm Signature vào Request Body

```typescript
// Create signature
const signature = await createPayOSSignature(
  paymentAmount,
  cancelUrl,
  description,
  orderCode,
  returnUrl,
  checksumKey
);

// Add signature to request body
const paymentData = {
  orderCode: orderCode,
  amount: paymentAmount,
  description: description,
  items: [...],
  cancelUrl: cancelUrl,
  returnUrl: returnUrl,
  signature: signature,  // ✅ Required field đã được thêm
  expiredAt: Math.floor(Date.now() / 1000) + 15 * 60,
};
```

## Request Body Format theo PayOS API

Theo [PayOS API Documentation](https://payos.vn/docs/api/), request body phải có format:

```json
{
  "orderCode": 123456,                    // Required: integer
  "amount": 10000,                        // Required: integer (VND)
  "description": "Thanh toán cho pet",    // Required: string
  "items": [                              // Required: Array of objects
    {
      "name": "Pet name",                 // Required: string
      "quantity": 1,                      // Required: integer
      "price": 10000                      // Required: integer (VND)
    }
  ],
  "cancelUrl": "petadoption://cancel",    // Required: string (URI)
  "returnUrl": "petadoption://success",   // Required: string (URI)
  "signature": "abc123...",               // Required: string (HMAC SHA256)
  "expiredAt": 1729730520                // Optional: Unix timestamp (Int32)
}
```

## Signature Format

Signature được tạo từ data string (sorted alphabetically):

```
amount=10000&cancelUrl=petadoption://cancel&description=Thanh toán cho pet&orderCode=123456&returnUrl=petadoption://success
```

**Lưu ý:**
- Fields phải được sort theo alphabet: `amount`, `cancelUrl`, `description`, `orderCode`, `returnUrl`
- Không bao gồm `items`, `expiredAt`, hoặc các fields khác trong signature
- Signature được encode bằng HMAC SHA256 với Checksum Key

## Bước tiếp theo

### 1. Deploy lại Edge Function

```bash
supabase functions deploy create-payos-payment-link
```

### 2. Kiểm tra Checksum Key

Đảm bảo `PAYOS_CHECKSUM_KEY` đã được set trong Supabase Secrets:

```bash
supabase secrets list
```

Nếu chưa có:
```bash
supabase secrets set PAYOS_CHECKSUM_KEY=your_checksum_key
```

Lấy Checksum Key từ PayOS Dashboard:
1. Đăng nhập https://merchant.payos.vn/
2. Vào **Settings > API Keys**
3. Copy **Checksum Key**

### 3. Test lại

Sau khi deploy:
1. Tạo transaction với amount >= 1000 VND
2. Edge Function sẽ tự động tạo signature
3. Request sẽ có đầy đủ fields theo PayOS API

### 4. Kiểm tra Logs

Sau khi test, check logs:
- "Generated PayOS signature: ..." → Signature đã được tạo
- "PayOS API response status: 200" → Request thành công
- PayOS API sẽ không còn trả về error code 20

## Expected Results

Sau khi deploy với signature:
- ✅ Request có đầy đủ fields theo PayOS API
- ✅ Signature được tính đúng format
- ✅ PayOS API sẽ chấp nhận request và trả về payment link
- ✅ Error code 20 sẽ không còn xuất hiện

## Reference

- [PayOS API Documentation](https://payos.vn/docs/api/)
- [PayOS Official Node SDK](https://github.com/payOSHQ/payos-lib-node)

