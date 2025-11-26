# Hệ thống ESCROW & COMMISSION

## Tổng quan

Hệ thống **ESCROW & COMMISSION** cho phép platform Adopet đóng vai trò trung gian trong giao dịch giữa buyer và seller, đảm bảo an toàn cho cả hai bên và tạo nguồn thu cho platform.

### Tính năng chính:
- ✅ **Escrow System**: Giữ tiền trung gian khi buyer thanh toán
- ✅ **Commission System**: Tính phí nền tảng (5% commission + 1% processing fee)
- ✅ **Automatic Release**: Tự động chuyển tiền cho seller khi đơn hàng delivered
- ✅ **Refund System**: Hoàn tiền cho buyer khi có dispute hoặc cancel
- ✅ **Dispute Handling**: Xử lý tranh chấp giữa buyer và seller

---

## Cấu trúc Database

### 1. Bảng `escrow_accounts`

Quản lý tài khoản escrow cho từng giao dịch (order hoặc transaction).

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | uuid | Primary key |
| `order_id` | uuid | Reference đến order (nullable) |
| `transaction_id` | uuid | Reference đến transaction (nullable) |
| `buyer_id` | uuid | ID người mua |
| `seller_id` | uuid | ID người bán |
| `amount` | decimal(12,2) | Tổng tiền buyer thanh toán |
| `status` | text | Trạng thái: `pending`, `escrowed`, `released`, `refunded`, `disputed` |
| `payment_method` | text | Phương thức thanh toán |
| `payment_transaction_id` | text | ID từ payment gateway |
| `payment_received_at` | timestamptz | Thời gian nhận tiền |
| `released_to_seller_at` | timestamptz | Thời gian chuyển tiền cho seller |
| `released_amount` | decimal(12,2) | Số tiền thực tế chuyển cho seller |
| `refunded_at` | timestamptz | Thời gian hoàn tiền |
| `refund_amount` | decimal(12,2) | Số tiền hoàn lại |
| `refund_reason` | text | Lý do hoàn tiền |
| `dispute_opened_at` | timestamptz | Thời gian mở dispute |
| `dispute_resolved_at` | timestamptz | Thời gian giải quyết dispute |
| `dispute_resolution` | text | Kết quả: `refund_buyer`, `release_seller`, `partial_refund` |

**Constraints:**
- Phải có `order_id` HOẶC `transaction_id` (không thể có cả hai hoặc không có gì)

---

### 2. Bảng `platform_commissions`

Quản lý phí nền tảng cho từng giao dịch.

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | uuid | Primary key |
| `escrow_account_id` | uuid | Reference đến escrow account |
| `order_id` | uuid | Reference đến order (nullable) |
| `transaction_id` | uuid | Reference đến transaction (nullable) |
| `transaction_amount` | decimal(12,2) | Tổng giá trị giao dịch |
| `commission_rate` | decimal(5,2) | % phí commission (mặc định 5%) |
| `commission_amount` | decimal(12,2) | Số tiền commission thực tế |
| `processing_fee_rate` | decimal(5,2) | % phí xử lý (mặc định 1%) |
| `processing_fee_amount` | decimal(12,2) | Số tiền phí xử lý |
| `total_platform_fee` | decimal(12,2) | Tổng phí nền tảng (commission + processing) |
| `seller_payout_amount` | decimal(12,2) | Số tiền seller nhận được (amount - total_fee) |
| `status` | text | Trạng thái: `pending`, `calculated`, `collected`, `refunded` |
| `calculated_at` | timestamptz | Thời gian tính phí |
| `collected_at` | timestamptz | Thời gian thu phí |

**Công thức tính phí:**
```
commission_amount = transaction_amount × 5%
processing_fee_amount = transaction_amount × 1%
total_platform_fee = commission_amount + processing_fee_amount
seller_payout_amount = transaction_amount - total_platform_fee
```

**Ví dụ:**
- Giao dịch: 1,000,000 VND
- Commission (5%): 50,000 VND
- Processing fee (1%): 10,000 VND
- **Total platform fee**: 60,000 VND
- **Seller nhận**: 940,000 VND

---

### 3. Cập nhật bảng `orders`

Thêm các cột liên quan đến escrow và commission:

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `escrow_account_id` | uuid | Reference đến escrow account |
| `escrow_status` | text | Trạng thái escrow: `none`, `pending`, `escrowed`, `released`, `refunded` |
| `commission_id` | uuid | Reference đến commission record |
| `platform_fee` | decimal(12,2) | Tổng phí nền tảng |
| `seller_payout` | decimal(12,2) | Số tiền seller nhận được |

---

### 4. Cập nhật bảng `transactions`

Thêm các cột liên quan đến escrow và commission (tương tự orders):

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `escrow_account_id` | uuid | Reference đến escrow account |
| `escrow_status` | text | Trạng thái escrow |
| `commission_id` | uuid | Reference đến commission record |
| `platform_fee` | decimal(12,2) | Tổng phí nền tảng |
| `seller_payout` | decimal(12,2) | Số tiền seller nhận được |

---

## Các Functions

### 1. `calculate_commission(transaction_amount, commission_rate, processing_fee_rate)`

Tính toán commission và phí xử lý.

**Parameters:**
- `transaction_amount`: Tổng giá trị giao dịch
- `commission_rate`: % commission (mặc định 5%)
- `processing_fee_rate`: % phí xử lý (mặc định 1%)

**Returns:**
- `commission_amount`: Số tiền commission
- `processing_fee_amount`: Số tiền phí xử lý
- `total_platform_fee`: Tổng phí nền tảng
- `seller_payout_amount`: Số tiền seller nhận

**Ví dụ:**
```sql
SELECT * FROM calculate_commission(1000000, 5.00, 1.00);
-- Returns:
-- commission_amount: 50000
-- processing_fee_amount: 10000
-- total_platform_fee: 60000
-- seller_payout_amount: 940000
```

---

### 2. `create_escrow_for_order(order_id, payment_method, payment_transaction_id)`

Tạo escrow account cho order khi buyer thanh toán.

**Flow:**
1. Lấy thông tin order
2. Tính commission
3. Tạo escrow account với status `escrowed`
4. Tạo commission record với status `calculated`
5. Cập nhật order với escrow và commission info
6. Set `payment_status = 'paid'`

**Returns:** `escrow_account_id` (uuid)

**Ví dụ:**
```sql
SELECT create_escrow_for_order(
  'order-uuid-here',
  'payos',
  'payos-transaction-id'
);
```

---

### 3. `create_escrow_for_transaction(transaction_id, payment_method, payment_transaction_id)`

Tạo escrow account cho transaction (pet) khi buyer thanh toán.

**Flow:** Tương tự `create_escrow_for_order` nhưng cho transaction.

**Returns:** `escrow_account_id` (uuid)

---

### 4. `release_escrow_to_seller(escrow_account_id)`

Chuyển tiền từ escrow cho seller khi đơn hàng delivered.

**Flow:**
1. Kiểm tra escrow status = `escrowed`
2. Update escrow status = `released`
3. Set `released_to_seller_at` và `released_amount`
4. Update commission status = `collected`
5. Update order/transaction escrow_status = `released`

**Khi nào gọi:**
- Khi order status = `delivered`
- Khi transaction completed và buyer xác nhận nhận hàng

**Ví dụ:**
```sql
SELECT release_escrow_to_seller('escrow-account-uuid');
```

---

### 5. `refund_escrow_to_buyer(escrow_account_id, refund_reason)`

Hoàn tiền cho buyer khi có dispute hoặc cancel.

**Flow:**
1. Kiểm tra escrow status = `escrowed` hoặc `disputed`
2. Update escrow status = `refunded`
3. Set `refunded_at`, `refund_amount` (full refund), `refund_reason`
4. Update commission status = `refunded`
5. Update order/transaction:
   - `escrow_status = 'refunded'`
   - `payment_status = 'refunded'` (cho order)
   - `status = 'cancelled'`

**Khi nào gọi:**
- Khi buyer cancel order (pending status)
- Khi có dispute và admin quyết định refund
- Khi seller không giao hàng

**Ví dụ:**
```sql
SELECT refund_escrow_to_buyer(
  'escrow-account-uuid',
  'Buyer cancelled order'
);
```

---

### 6. `open_escrow_dispute(escrow_account_id)`

Mở dispute cho escrow account.

**Flow:**
1. Kiểm tra escrow status = `escrowed`
2. Update escrow status = `disputed`
3. Set `dispute_opened_at`

**Khi nào gọi:**
- Khi buyer/seller mở dispute
- Khi có vấn đề với giao dịch

**Ví dụ:**
```sql
SELECT open_escrow_dispute('escrow-account-uuid');
```

---

## Luồng giao dịch với ESCROW

### Luồng Order (Product)

1. **Buyer tạo order**
   - Order status: `pending`
   - Payment status: `pending`
   - Escrow status: `none`

2. **Buyer thanh toán**
   - Gọi `create_escrow_for_order()`
   - Escrow account được tạo với status `escrowed`
   - Commission được tính và lưu
   - Order:
     - `payment_status = 'paid'`
     - `escrow_status = 'escrowed'`
     - `platform_fee` và `seller_payout` được set

3. **Seller xác nhận đơn hàng**
   - Order status: `confirmed` → `processing` → `shipped`

4. **Buyer nhận hàng và xác nhận**
   - Order status: `delivered`
   - Gọi `release_escrow_to_seller()`
   - Escrow status: `released`
   - Tiền được chuyển cho seller (sau khi trừ commission)

5. **Nếu có dispute**
   - Gọi `open_escrow_dispute()`
   - Escrow status: `disputed`
   - Admin xử lý
   - Nếu refund: Gọi `refund_escrow_to_buyer()`

---

### Luồng Transaction (Pet)

1. **Seller tạo transaction**
   - Transaction status: `pending`
   - Escrow status: `none`

2. **Buyer thanh toán**
   - Gọi `create_escrow_for_transaction()`
   - Escrow account được tạo với status `escrowed`
   - Commission được tính và lưu
   - Transaction:
     - `status = 'completed'`
     - `escrow_status = 'escrowed'`
     - `platform_fee` và `seller_payout` được set

3. **Buyer xác nhận nhận pet**
   - Gọi `release_escrow_to_seller()`
   - Escrow status: `released`
   - Tiền được chuyển cho seller

4. **Nếu có dispute**
   - Tương tự order flow

---

## RLS Policies

### Escrow Accounts
- **Buyers**: Có thể xem escrow accounts của mình
- **Sellers**: Có thể xem escrow accounts của mình
- **Admins**: Cần thêm policy riêng (chưa implement)

### Platform Commissions
- **Buyers**: Có thể xem commissions cho orders của mình
- **Sellers**: Có thể xem commissions cho orders của mình
- **Admins**: Cần thêm policy riêng (chưa implement)

---

## Integration với Payment Gateway

### PayOS Integration

**Lưu ý quan trọng:** PayOS là **payment gateway**, không phải escrow service. PayOS chỉ xử lý thanh toán và chuyển tiền vào **merchant account của Adopet (platform)**. Escrow system của chúng ta sẽ quản lý việc giữ tiền và quyết định khi nào release cho seller.

#### Luồng tích hợp PayOS + Escrow:

1. **Buyer thanh toán qua PayOS**
   - PayOS xử lý thanh toán
   - Tiền được chuyển vào **merchant account của Adopet** (không phải seller)
   - PayOS trả về `payment_link_id` và `payment_transaction_id`

2. **Webhook từ PayOS** (khi payment thành công)
   - Nhận webhook từ PayOS
   - Gọi `create_escrow_for_order()` hoặc `create_escrow_for_transaction()`
   - Tạo escrow account trong database với status `escrowed`
   - Tính commission và lưu vào `platform_commissions`
   - **Tiền đã nằm trong merchant account của Adopet** (thực tế)

3. **Khi order delivered**
   - Gọi `release_escrow_to_seller()`
   - Update escrow status = `released`
   - **Chuyển tiền từ merchant account của Adopet → seller** (qua PayOS payout hoặc bank transfer)
   - Trừ commission (giữ lại trong merchant account)

#### Cấu trúc tài khoản:

```
Buyer thanh toán → PayOS → Merchant Account của Adopet
                                    ↓
                            Escrow Account (database)
                                    ↓
                    ┌───────────────┴───────────────┐
                    ↓                               ↓
            Commission (6%)                  Seller Payout (94%)
        (Giữ trong merchant)              (Chuyển cho seller)
```

**Ví dụ code:**
```typescript
// 1. Sau khi PayOS payment thành công (webhook)
const escrowId = await supabase.rpc('create_escrow_for_order', {
  order_id_param: orderId,
  payment_method_param: 'payos',
  payment_transaction_id_param: payosPaymentLinkId // Lưu PayOS payment link ID
});

// 2. Khi order delivered - Release escrow
await supabase.rpc('release_escrow_to_seller', {
  escrow_account_id_param: escrowId
});

// 3. Thực tế chuyển tiền cho seller (cần implement)
// Có thể dùng PayOS payout API hoặc bank transfer
await transferToSeller(sellerId, sellerPayoutAmount);
```

#### PayOS Merchant Account Setup:

- **Merchant Account của Adopet**: Tài khoản nhận tiền từ PayOS
- **Seller Accounts**: Mỗi seller có thể có tài khoản riêng (hoặc nhận qua bank transfer)
- **Commission**: Giữ lại trong merchant account của Adopet
- **Payout**: Chuyển tiền cho seller khi escrow released

#### Lưu ý:

1. **PayOS không giữ tiền trung gian** - tiền vào merchant account ngay
2. **Escrow system quản lý logic** - quyết định khi nào release
3. **Commission được trừ trước khi payout** - giữ lại trong merchant account
4. **Cần implement payout mechanism** - chuyển tiền từ merchant account → seller

---

## Cập nhật Service Layer

### OrderService

Cần cập nhật các methods:

```typescript
// Khi buyer thanh toán
static async createEscrowForOrder(orderId: string, paymentMethod: string, paymentTransactionId?: string) {
  const { data, error } = await supabase.rpc('create_escrow_for_order', {
    order_id_param: orderId,
    payment_method_param: paymentMethod,
    payment_transaction_id_param: paymentTransactionId
  });
  if (error) throw error;
  return data;
}

// Khi order delivered
static async releaseEscrowToSeller(orderId: string) {
  // Get escrow_account_id from order
  const order = await this.getById(orderId, userId);
  if (!order?.escrow_account_id) throw new Error('No escrow account found');
  
  const { error } = await supabase.rpc('release_escrow_to_seller', {
    escrow_account_id_param: order.escrow_account_id
  });
  if (error) throw error;
}

// Khi cancel hoặc dispute
static async refundEscrowToBuyer(orderId: string, reason?: string) {
  const order = await this.getById(orderId, userId);
  if (!order?.escrow_account_id) throw new Error('No escrow account found');
  
  const { error } = await supabase.rpc('refund_escrow_to_buyer', {
    escrow_account_id_param: order.escrow_account_id,
    refund_reason_param: reason
  });
  if (error) throw error;
}
```

---

## Migration File

File migration: `039_create_escrow_and_commission_system.sql`

**Chạy migration:**
```bash
# Trong Supabase Dashboard
# Hoặc qua CLI
supabase migration up
```

---

## Testing

### Test Cases

1. **Tạo escrow cho order**
   ```sql
   -- Tạo order test
   INSERT INTO orders (...) VALUES (...);
   
   -- Tạo escrow
   SELECT create_escrow_for_order('order-id', 'payos', 'payos-id');
   
   -- Kiểm tra escrow account
   SELECT * FROM escrow_accounts WHERE order_id = 'order-id';
   
   -- Kiểm tra commission
   SELECT * FROM platform_commissions WHERE order_id = 'order-id';
   ```

2. **Release escrow**
   ```sql
   SELECT release_escrow_to_seller('escrow-id');
   
   -- Kiểm tra status
   SELECT status, released_to_seller_at, released_amount 
   FROM escrow_accounts WHERE id = 'escrow-id';
   ```

3. **Refund escrow**
   ```sql
   SELECT refund_escrow_to_buyer('escrow-id', 'Test refund');
   
   -- Kiểm tra status
   SELECT status, refunded_at, refund_amount 
   FROM escrow_accounts WHERE id = 'escrow-id';
   ```

---

## PayOS Webhook Handler

### File: `supabase/functions/payos-webhook/index.ts`

Webhook handler tự động tạo escrow khi PayOS payment thành công.

#### Setup:

1. **Cấu hình webhook URL trong PayOS Dashboard:**
   ```
   https://[your-project].supabase.co/functions/v1/payos-webhook
   ```

2. **Set environment variables:**
   ```bash
   supabase secrets set PAYOS_CHECKSUM_KEY=your_checksum_key
   ```

#### Luồng hoạt động:

1. **PayOS gửi webhook** khi payment thành công
2. **Webhook handler nhận request**
3. **Tìm order/transaction** bằng `payment_link_id`
4. **Tự động gọi** `create_escrow_for_order()` hoặc `create_escrow_for_transaction()`
5. **Escrow account được tạo** với status `escrowed`

#### Webhook Payload Format:

```json
{
  "code": "00",
  "desc": "success",
  "data": {
    "orderCode": 123456,
    "amount": 100000,
    "description": "Thanh toán...",
    "paymentLinkId": "...",
    "code": "00",
    "desc": "success"
  },
  "signature": "..."
}
```

#### Security:

- ✅ Verify PayOS signature (HMAC SHA256)
- ✅ Validate webhook payload
- ✅ Check duplicate escrow creation
- ✅ Error handling và logging

---

## Payout System

### File: `supabase/functions/payout-to-seller/index.ts`

Hệ thống chuyển tiền từ merchant account của Adopet → seller.

### Database Tables:

#### 1. `seller_bank_accounts`

Lưu thông tin tài khoản ngân hàng của seller.

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | uuid | Primary key |
| `seller_id` | uuid | ID seller |
| `bank_name` | text | Tên ngân hàng |
| `account_number` | text | Số tài khoản |
| `account_holder_name` | text | Tên chủ tài khoản |
| `branch_name` | text | Chi nhánh |
| `is_verified` | boolean | Đã xác minh chưa |
| `is_primary` | boolean | Tài khoản chính |
| `is_active` | boolean | Còn hoạt động |

#### 2. `payout_records`

Lịch sử chuyển tiền cho seller.

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | uuid | Primary key |
| `escrow_account_id` | uuid | Reference đến escrow |
| `seller_id` | uuid | ID seller |
| `payout_amount` | decimal(12,2) | Số tiền chuyển |
| `platform_fee` | decimal(12,2) | Phí nền tảng |
| `payout_method` | text | Phương thức: `payos_payout`, `bank_transfer`, `manual` |
| `bank_account_id` | uuid | Tài khoản ngân hàng dùng |
| `status` | text | `pending`, `processing`, `completed`, `failed` |
| `external_transaction_id` | text | ID từ payout API |
| `processed_at` | timestamptz | Thời gian xử lý |
| `completed_at` | timestamptz | Thời gian hoàn thành |

### Functions:

#### 1. `get_seller_primary_bank_account(seller_id)`

Lấy tài khoản ngân hàng chính của seller.

#### 2. `create_payout_record(escrow_account_id, payout_method)`

Tạo record payout sau khi escrow released.

#### 3. `update_payout_status(payout_id, status, ...)`

Cập nhật trạng thái payout.

### Payout Flow:

1. **Escrow released** → `release_escrow_to_seller()`
2. **Tạo payout record** → `create_payout_record()`
3. **Chuyển tiền thực tế:**
   - **Option 1**: PayOS Payout API (nếu có)
   - **Option 2**: Bank transfer API
   - **Option 3**: Manual transfer (admin xử lý)
4. **Update payout status** → `completed` hoặc `failed`

### Implementation Options:

#### Option 1: PayOS Payout API (Recommended)

```typescript
// Nếu PayOS có payout API
const payoutResponse = await payosAPI.createPayout({
  seller_bank_account: bankAccount,
  amount: sellerPayoutAmount,
  reference: escrowAccountId
});
```

#### Option 2: Bank Transfer API

```typescript
// Tích hợp bank transfer API (VD: VNPay, MoMo, etc.)
const transferResponse = await bankTransferAPI.transfer({
  to_account: sellerBankAccount,
  amount: sellerPayoutAmount,
  description: `Payout for order ${orderId}`
});
```

#### Option 3: Manual Transfer (Current)

```typescript
// Log payout request, admin chuyển tiền thủ công
console.log('Payout Request:', {
  seller_id,
  amount: sellerPayoutAmount,
  bank_account: sellerBankAccount
});
// Admin sẽ chuyển tiền và update status = 'completed'
```

---

## Cập nhật Orders/Transactions

### Thêm fields để track PayOS payment:

**Orders table:**
- `payos_payment_link_id` (text) - PayOS payment link ID
- `payos_order_code` (bigint) - PayOS orderCode

**Transactions table:**
- `payos_payment_link_id` (text) - PayOS payment link ID  
- `payos_order_code` (bigint) - PayOS orderCode

**Lưu khi tạo payment link:**
```typescript
// Khi tạo PayOS payment link
const { payment_link_id, order_code } = await createPayOSPaymentLink(...);

// Lưu vào order/transaction
await supabase
  .from('orders')
  .update({
    payos_payment_link_id: payment_link_id,
    payos_order_code: order_code,
    payment_transaction_id: payment_link_id // For backward compatibility
  })
  .eq('id', orderId);
```

---

## Next Steps

### Đã implement:

1. ✅ **PayOS Webhook Handler** - Tự động tạo escrow
2. ✅ **Payout System** - Database và functions
3. ✅ **Seller Bank Accounts** - Quản lý tài khoản ngân hàng
4. ✅ **Payout Records** - Lịch sử chuyển tiền

### Cần implement tiếp:

1. **Admin Dashboard**
   - Xem tất cả escrow accounts
   - Xử lý disputes
   - Xử lý payout requests (manual)
   - Thống kê commission

2. **Seller Dashboard**
   - Quản lý bank accounts
   - Xem escrow accounts của mình
   - Xem commission phải trả
   - Xem payout history và status

3. **Buyer Dashboard**
   - Xem escrow status của orders
   - Mở dispute
   - Xem refund history

4. **Notifications**
   - Thông báo khi escrow created
   - Thông báo khi escrow released
   - Thông báo khi payout completed
   - Thông báo khi có dispute

5. **Payout Integration**
   - Tích hợp PayOS Payout API (nếu có)
   - Hoặc tích hợp bank transfer API
   - Hoặc build admin tool để manual transfer

6. **Analytics**
   - Tổng commission thu được
   - Tổng escrow đang giữ
   - Top sellers by commission
   - Payout statistics

---

## Lưu ý quan trọng

1. **PayOS là Payment Gateway, không phải Escrow**
   - PayOS chỉ xử lý thanh toán → tiền vào merchant account của Adopet
   - Escrow system quản lý logic giữ tiền và release
   - Cần implement payout mechanism để chuyển tiền cho seller

2. **Commission Rate có thể điều chỉnh**
   - Hiện tại: 5% commission + 1% processing fee
   - Có thể tạo bảng `commission_tiers` để set rate khác nhau cho seller tiers

3. **Escrow chỉ áp dụng cho online payment**
   - COD (Cash on Delivery) không cần escrow
   - Chỉ `payos`, `bank_transfer`, `e_wallet` mới tạo escrow
   - Tiền từ PayOS vào merchant account → escrow system quản lý

4. **Payout Mechanism cần implement**
   - PayOS Payout API (nếu có)
   - Bank transfer manual
   - Hoặc tích hợp payment gateway khác để payout

5. **Dispute Resolution**
   - Cần admin dashboard để xử lý
   - Có thể tự động refund sau N ngày nếu seller không phản hồi
   - Refund từ merchant account của Adopet → buyer

6. **Refund Policy**
   - Full refund: Hoàn toàn bộ tiền cho buyer (từ merchant account)
   - Partial refund: Có thể implement sau
   - Commission refund: Khi refund, commission cũng được refund (chưa thu thì không cần refund)

---

## Tổng kết

✅ **Đã implement:**
- Database schema cho escrow và commission
- Functions để tạo, release, refund escrow
- Integration với orders và transactions
- RLS policies

⏳ **Cần implement tiếp:**
- Service layer updates
- UI components
- Admin dashboard
- Notifications
- Analytics

---

**File migrations:**
- `supabase/migrations/039_create_escrow_and_commission_system.sql` - Escrow & Commission system
- `supabase/migrations/040_add_payout_system_and_update_payment_tracking.sql` - Payout system

**Edge Functions:**
- `supabase/functions/payos-webhook/index.ts` - PayOS webhook handler
- `supabase/functions/payout-to-seller/index.ts` - Payout mechanism

**Ngày tạo:** 2025-01-XX

