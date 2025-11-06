# ⚡ Quick Fix PayOS Error

## ✅ Edge Functions đã deploy
Bạn đã có:
- ✅ `create-payos-payment-link` (ACTIVE, version 1)
- ✅ `get-payos-payment-info` (ACTIVE, version 1)

## 🔍 Bước tiếp theo: Kiểm tra PayOS Credentials

### 1. Kiểm tra Secrets trong Dashboard

1. Vào **Supabase Dashboard** → **Project Settings** → **Edge Functions** → **Secrets**
2. Kiểm tra xem có 3 secrets sau không:
   - `PAYOS_CLIENT_ID`
   - `PAYOS_API_KEY`
   - `PAYOS_CHECKSUM_KEY`

### 2. Nếu chưa có, thêm PayOS Secrets

**Cách 1: Qua Dashboard (Khuyến nghị)**
1. Dashboard → **Settings** → **Edge Functions** → **Secrets**
2. Click **Add new secret**
3. Thêm từng secret:
   ```
   Name: PAYOS_CLIENT_ID
   Value: [Paste Client ID từ PayOS Dashboard]
   ```
   Làm tương tự cho `PAYOS_API_KEY` và `PAYOS_CHECKSUM_KEY`
4. Click **Save**

**Cách 2: Qua CLI**
```bash
supabase secrets set PAYOS_CLIENT_ID=your_client_id
supabase secrets set PAYOS_API_KEY=your_api_key
supabase secrets set PAYOS_CHECKSUM_KEY=your_checksum_key
```

### 3. Xem Logs để biết lỗi cụ thể

1. Dashboard → **Edge Functions** → **create-payos-payment-link**
2. Tab **Logs**
3. Xem log gần nhất để biết lỗi cụ thể

**Lỗi thường gặp:**
- `PayOS credentials not configured` → Cần set secrets (Bước 2)
- `Cannot create payment link for free transaction` → Đúng, không cần fix (amount = 0)
- `Amount must be at least 1,000 VNĐ` → Đúng, không cần fix (amount < 1000)

## 🎯 Sau khi set secrets

1. Đợi vài giây để secrets được apply
2. Test lại: Tạo transaction với amount >= 1000 VND
3. QR code sẽ tự động được tạo

## 📝 Lưu ý

- Transaction với amount = 0 hoặc < 1000 VND sẽ **KHÔNG** tạo PayOS payment link (đúng)
- Lỗi sẽ không hiển thị cho user, chỉ log trong console
- Edge Functions đã deploy, chỉ cần set credentials là xong!


