# Hướng dẫn Tích hợp ESCROW & PAYOUT System

## Tổng quan

Hướng dẫn này giải thích cách tích hợp PayOS webhook và payout system vào flow hiện tại của app.

---

## 1. Cập nhật OrderService - Lưu PayOS Payment Link ID

Khi tạo PayOS payment link cho order, cần lưu `payos_payment_link_id` và `payos_order_code` vào order.

### Ví dụ code:

```typescript
// Trong OrderService hoặc khi tạo payment link
import { PayOSTransactionService } from '@/src/features/chat/services/payos-transaction.service';

// 1. Tạo order
const order = await OrderService.create(orderInput, buyerId);

// 2. Tạo PayOS payment link
const paymentLink = await PayOSTransactionService.createPaymentLink(
  order.id, // transaction_id (dùng order.id)
  order.final_price,
  order.product?.name || 'Sản phẩm',
  null, // transaction_code (không cần cho order)
  'VND'
);

// 3. Lưu PayOS payment link ID vào order
await supabase
  .from('orders')
  .update({
    payos_payment_link_id: paymentLink.payment_link_id,
    payos_order_code: paymentLink.order_code, // Nếu có
    payment_transaction_id: paymentLink.payment_link_id, // For backward compatibility
  })
  .eq('id', order.id);
```

---

## 2. Cập nhật TransactionService - Lưu PayOS Payment Link ID

Tương tự cho transaction (pet):

```typescript
// Khi tạo PayOS payment link cho transaction
const paymentLink = await PayOSTransactionService.createPaymentLink(
  transaction.id,
  transaction.amount,
  petName,
  transaction.transaction_code,
  'VND'
);

// Lưu vào transaction
await supabase
  .from('transactions')
  .update({
    payos_payment_link_id: paymentLink.payment_link_id,
    payos_order_code: paymentLink.order_code,
    payment_transaction_id: paymentLink.payment_link_id, // For backward compatibility
  })
  .eq('id', transaction.id);
```

---

## 3. Setup PayOS Webhook

### Bước 1: Deploy webhook handler

```bash
# Deploy function
supabase functions deploy payos-webhook
```

### Bước 2: Lấy webhook URL

```
https://[your-project-ref].supabase.co/functions/v1/payos-webhook
```

### Bước 3: Cấu hình trong PayOS Dashboard

1. Đăng nhập PayOS Dashboard
2. Vào **Settings** → **Webhooks**
3. Thêm webhook URL:
   ```
   https://[your-project-ref].supabase.co/functions/v1/payos-webhook
   ```
4. Chọn events: `payment.success`, `payment.completed`
5. Lưu

### Bước 4: Set environment variables

```bash
supabase secrets set PAYOS_CHECKSUM_KEY=your_checksum_key_from_payos
```

---

## 4. Flow hoàn chỉnh

### Flow Order với Escrow:

```
1. Buyer tạo order
   ↓
2. Buyer chọn thanh toán PayOS
   ↓
3. Tạo PayOS payment link
   ↓
4. Lưu payos_payment_link_id vào order
   ↓
5. Buyer thanh toán qua PayOS
   ↓
6. PayOS gửi webhook → payos-webhook function
   ↓
7. Webhook tự động tạo escrow account
   ↓
8. Order: escrow_status = 'escrowed', payment_status = 'paid'
   ↓
9. Seller xác nhận → processing → shipped
   ↓
10. Buyer nhận hàng → delivered
   ↓
11. Gọi release_escrow_to_seller()
   ↓
12. Escrow status = 'released'
   ↓
13. Tạo payout record
   ↓
14. Admin chuyển tiền cho seller (manual hoặc API)
   ↓
15. Update payout status = 'completed'
```

---

## 5. Seller Bank Account Management

### Seller thêm bank account:

```typescript
// Tạo bank account
await supabase
  .from('seller_bank_accounts')
  .insert({
    seller_id: userId,
    bank_name: 'Vietcombank',
    account_number: '1234567890',
    account_holder_name: 'Nguyen Van A',
    branch_name: 'Chi nhánh Hà Nội',
    is_primary: true, // Set làm tài khoản chính
  });
```

### Lấy primary bank account:

```typescript
const { data: bankAccount } = await supabase.rpc(
  'get_seller_primary_bank_account',
  { seller_id_param: sellerId }
);
```

---

## 6. Payout Flow

### Khi order delivered:

```typescript
// 1. Release escrow
await supabase.rpc('release_escrow_to_seller', {
  escrow_account_id_param: order.escrow_account_id
});

// 2. Tạo payout record
const { data: payoutId } = await supabase.rpc('create_payout_record', {
  escrow_account_id_param: order.escrow_account_id,
  payout_method_param: 'bank_transfer' // hoặc 'payos_payout', 'manual'
});

// 3. Gọi payout function (hoặc admin xử lý manual)
await supabase.functions.invoke('payout-to-seller', {
  body: {
    escrow_account_id: order.escrow_account_id,
    payout_method: 'bank_transfer'
  }
});
```

### Admin xử lý payout manual:

1. Xem payout records với status = `pending`
2. Chuyển tiền cho seller theo bank account
3. Update payout status:

```typescript
await supabase.rpc('update_payout_status', {
  payout_id_param: payoutId,
  status_param: 'completed',
  external_transaction_id_param: 'bank_transfer_ref_123', // Reference từ bank
  admin_note_param: 'Đã chuyển tiền thành công'
});
```

---

## 7. Testing

### Test PayOS Webhook:

```bash
# Simulate webhook payload
curl -X POST https://[your-project].supabase.co/functions/v1/payos-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "code": "00",
    "desc": "success",
    "data": {
      "orderCode": 123456,
      "amount": 100000,
      "paymentLinkId": "test_payment_link_id",
      "code": "00",
      "desc": "success"
    },
    "signature": "test_signature"
  }'
```

### Test Escrow Creation:

```sql
-- Kiểm tra escrow account
SELECT * FROM escrow_accounts WHERE order_id = 'order-id';

-- Kiểm tra commission
SELECT * FROM platform_commissions WHERE escrow_account_id = 'escrow-id';
```

### Test Payout:

```sql
-- Tạo payout record
SELECT create_payout_record('escrow-id', 'bank_transfer');

-- Kiểm tra payout record
SELECT * FROM payout_records WHERE escrow_account_id = 'escrow-id';
```

---

## 8. Error Handling

### Webhook errors:

- **No matching order/transaction**: Kiểm tra `payos_payment_link_id` đã được lưu chưa
- **Escrow already exists**: Webhook được gọi 2 lần → OK, bỏ qua
- **Invalid signature**: Kiểm tra `PAYOS_CHECKSUM_KEY`

### Payout errors:

- **No bank account**: Seller cần thêm bank account trước
- **Escrow not released**: Phải release escrow trước khi payout
- **Payout failed**: Update status = `failed`, ghi lại `failure_reason`

---

## 9. Monitoring & Logs

### Check webhook logs:

```bash
supabase functions logs payos-webhook
```

### Check payout logs:

```bash
supabase functions logs payout-to-seller
```

### Database queries:

```sql
-- Xem escrow accounts đang giữ
SELECT 
  ea.id,
  ea.amount,
  ea.status,
  pc.total_platform_fee,
  pc.seller_payout_amount
FROM escrow_accounts ea
JOIN platform_commissions pc ON pc.escrow_account_id = ea.id
WHERE ea.status = 'escrowed';

-- Xem payout pending
SELECT * FROM payout_records WHERE status = 'pending';

-- Xem commission thu được
SELECT 
  SUM(total_platform_fee) as total_commission,
  COUNT(*) as transaction_count
FROM platform_commissions
WHERE status = 'collected';
```

---

## 10. Next Steps

1. ✅ **Setup webhook** trong PayOS Dashboard
2. ✅ **Test webhook** với test payment
3. ✅ **Implement UI** để seller quản lý bank accounts
4. ✅ **Build admin dashboard** để xử lý payout
5. ✅ **Tích hợp payout API** (nếu có) hoặc manual process
6. ✅ **Setup notifications** khi escrow/payout status thay đổi

---

**Lưu ý:** 
- Webhook cần được verify signature trong production
- Payout hiện tại là manual, cần admin xử lý
- Có thể tích hợp PayOS Payout API hoặc bank transfer API sau


