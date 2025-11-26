# Hướng dẫn chạy Migrations - ESCROW & PAYOUT System

## 📋 Migrations cần chạy

Có **3 migration files mới** cần chạy theo thứ tự:

### 1. ✅ Migration 039: ESCROW & COMMISSION System
**File:** `supabase/migrations/039_create_escrow_and_commission_system.sql`

**Nội dung:**
- Tạo bảng `escrow_accounts`
- Tạo bảng `platform_commissions`
- Cập nhật `orders` và `transactions` với escrow fields
- Tạo functions: `calculate_commission`, `create_escrow_for_order`, `create_escrow_for_transaction`, `release_escrow_to_seller`, `refund_escrow_to_buyer`, `open_escrow_dispute`

**Status:** ⚠️ **CHƯA CHẠY** - Cần chạy

---

### 2. ✅ Migration 040: PAYOUT System
**File:** `supabase/migrations/040_add_payout_system_and_update_payment_tracking.sql`

**Nội dung:**
- Tạo bảng `seller_bank_accounts`
- Tạo bảng `payout_records`
- Cập nhật `orders` và `transactions` với PayOS payment tracking fields
- Tạo functions: `get_seller_primary_bank_account`, `create_payout_record`, `update_payout_status`

**Status:** ⚠️ **CHƯA CHẠY** - Cần chạy

**Dependencies:** Phải chạy sau migration 039

---

### 3. ✅ Migration 041: NOTIFICATIONS
**File:** `supabase/migrations/041_add_escrow_payout_notifications.sql`

**Nội dung:**
- Tạo lại bảng `notifications` (nếu chưa có - đã bị drop trong migration 037)
- Cập nhật functions để tự động tạo notifications
- Tạo function `create_notification`
- Cập nhật `create_escrow_for_order`, `release_escrow_to_seller`, `create_payout_record`, `update_payout_status` để gửi notifications

**Status:** ⚠️ **CHƯA CHẠY** - Cần chạy

**Dependencies:** Phải chạy sau migration 039 và 040

---

## 🚀 Cách chạy Migrations

### Method 1: Supabase Dashboard (Khuyến nghị)

1. **Vào Supabase Dashboard**
   - Truy cập: https://supabase.com/dashboard
   - Chọn project của bạn

2. **Mở SQL Editor**
   - Click **SQL Editor** ở sidebar
   - Click **New query**

3. **Chạy từng migration theo thứ tự:**

   **Bước 1: Migration 039**
   ```
   - Copy toàn bộ nội dung file: 039_create_escrow_and_commission_system.sql
   - Paste vào SQL Editor
   - Click RUN (hoặc Ctrl+Enter)
   - Kiểm tra: Không có lỗi
   ```

   **Bước 2: Migration 040**
   ```
   - Copy toàn bộ nội dung file: 040_add_payout_system_and_update_payment_tracking.sql
   - Paste vào SQL Editor (new query)
   - Click RUN
   - Kiểm tra: Không có lỗi
   ```

   **Bước 3: Migration 041**
   ```
   - Copy toàn bộ nội dung file: 041_add_escrow_payout_notifications.sql
   - Paste vào SQL Editor (new query)
   - Click RUN
   - Kiểm tra: Không có lỗi
   ```

---

### Method 2: Supabase CLI

```bash
# Link project (nếu chưa link)
supabase link --project-ref your-project-ref

# Apply tất cả migrations mới
supabase db push

# Hoặc chạy từng file
supabase db execute --file supabase/migrations/039_create_escrow_and_commission_system.sql
supabase db execute --file supabase/migrations/040_add_payout_system_and_update_payment_tracking.sql
supabase db execute --file supabase/migrations/041_add_escrow_payout_notifications.sql
```

---

## ✅ Kiểm tra sau khi chạy

### 1. Kiểm tra Tables đã được tạo:

```sql
-- Kiểm tra escrow_accounts
SELECT * FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'escrow_accounts';

-- Kiểm tra platform_commissions
SELECT * FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'platform_commissions';

-- Kiểm tra seller_bank_accounts
SELECT * FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'seller_bank_accounts';

-- Kiểm tra payout_records
SELECT * FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'payout_records';

-- Kiểm tra notifications
SELECT * FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'notifications';
```

**Kết quả mong đợi:** Tất cả 5 bảng đều có 1 row

---

### 2. Kiểm tra Functions đã được tạo:

```sql
-- Kiểm tra các functions
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
  'calculate_commission',
  'create_escrow_for_order',
  'create_escrow_for_transaction',
  'release_escrow_to_seller',
  'refund_escrow_to_buyer',
  'open_escrow_dispute',
  'get_seller_primary_bank_account',
  'create_payout_record',
  'update_payout_status',
  'create_notification'
);
```

**Kết quả mong đợi:** 10 functions

---

### 3. Kiểm tra Columns đã được thêm vào orders:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'orders' 
AND column_name IN (
  'escrow_account_id',
  'escrow_status',
  'commission_id',
  'platform_fee',
  'seller_payout',
  'payos_payment_link_id',
  'payos_order_code'
);
```

**Kết quả mong đợi:** 7 columns

---

### 4. Kiểm tra Columns đã được thêm vào transactions:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'transactions' 
AND column_name IN (
  'escrow_account_id',
  'escrow_status',
  'commission_id',
  'platform_fee',
  'seller_payout',
  'payos_payment_link_id',
  'payos_order_code'
);
```

**Kết quả mong đợi:** 7 columns

---

## ⚠️ Lưu ý quan trọng

### 1. Thứ tự chạy:
- **PHẢI** chạy theo thứ tự: 039 → 040 → 041
- Không được bỏ qua migration nào
- Không được chạy ngược thứ tự

### 2. Notifications table:
- Migration 037 đã **DROP** bảng `notifications`
- Migration 041 sẽ **TẠO LẠI** bảng `notifications`
- Nếu bảng đã tồn tại (từ migration cũ), migration sẽ skip (dùng `IF NOT EXISTS`)

### 3. Functions update:
- Migration 041 **UPDATE** các functions đã tạo trong 039
- Các functions sẽ được thay thế (CREATE OR REPLACE)
- Không ảnh hưởng đến data hiện có

### 4. RLS Policies:
- Tất cả tables mới đều đã enable RLS
- Policies đã được tạo sẵn
- Không cần thêm policies thủ công

---

## 🐛 Troubleshooting

### Lỗi: "relation already exists"
**Nguyên nhân:** Migration đã được chạy trước đó

**Giải pháp:**
- Kiểm tra xem table/function đã tồn tại chưa
- Nếu đã tồn tại và đúng structure → Bỏ qua migration đó
- Nếu structure khác → Cần drop và chạy lại (cẩn thận với data!)

### Lỗi: "column already exists"
**Nguyên nhân:** Column đã được thêm trước đó

**Giải pháp:**
- Migration dùng `ADD COLUMN IF NOT EXISTS` → An toàn
- Nếu vẫn lỗi → Có thể column đã tồn tại với type khác
- Kiểm tra và sửa type nếu cần

### Lỗi: "function already exists"
**Nguyên nhân:** Function đã được tạo trước đó

**Giải pháp:**
- Migration dùng `CREATE OR REPLACE FUNCTION` → An toàn
- Function sẽ được update với code mới
- Không ảnh hưởng đến data

---

## 📊 Checklist sau khi chạy

- [ ] Migration 039 chạy thành công (không có lỗi)
- [ ] Migration 040 chạy thành công (không có lỗi)
- [ ] Migration 041 chạy thành công (không có lỗi)
- [ ] Tất cả 5 tables đã được tạo
- [ ] Tất cả 10 functions đã được tạo
- [ ] Orders table có đủ 7 columns mới
- [ ] Transactions table có đủ 7 columns mới
- [ ] RLS policies đã được tạo
- [ ] Indexes đã được tạo

---

## 🎯 Kết quả mong đợi

Sau khi chạy xong 3 migrations:

✅ **Database schema hoàn chỉnh:**
- Escrow system sẵn sàng
- Commission system sẵn sàng
- Payout system sẵn sàng
- Notifications system sẵn sàng

✅ **Functions sẵn sàng:**
- Tất cả functions có thể gọi từ app
- Auto notifications khi events xảy ra

✅ **Ready to use:**
- Seller có thể thêm bank accounts
- Admin có thể xử lý payout
- Escrow tự động tạo khi payment thành công
- Payout tự động tạo khi order delivered

---

**Lưu ý:** Sau khi chạy migrations, cần **restart app** để các thay đổi có hiệu lực!

