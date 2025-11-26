# ✅ Migration Checklist - ESCROW & PAYOUT

## 📋 Migrations cần chạy (theo thứ tự)

### ⚠️ QUAN TRỌNG: Chạy theo đúng thứ tự!

```
1. 039_create_escrow_and_commission_system.sql
   ↓
2. 040_add_payout_system_and_update_payment_tracking.sql
   ↓
3. 041_add_escrow_payout_notifications.sql
```

---

## 🚀 Hướng dẫn chạy nhanh

### Bước 1: Vào Supabase Dashboard
1. Truy cập: https://supabase.com/dashboard
2. Chọn project của bạn
3. Click **SQL Editor**

### Bước 2: Chạy Migration 039
1. Click **New query**
2. Copy toàn bộ nội dung file: `039_create_escrow_and_commission_system.sql`
3. Paste vào SQL Editor
4. Click **RUN** (hoặc Ctrl+Enter)
5. ✅ Kiểm tra: Không có lỗi

### Bước 3: Chạy Migration 040
1. Click **New query** (tạo query mới)
2. Copy toàn bộ nội dung file: `040_add_payout_system_and_update_payment_tracking.sql`
3. Paste vào SQL Editor
4. Click **RUN**
5. ✅ Kiểm tra: Không có lỗi

### Bước 4: Chạy Migration 041
1. Click **New query** (tạo query mới)
2. Copy toàn bộ nội dung file: `041_add_escrow_payout_notifications.sql`
3. Paste vào SQL Editor
4. Click **RUN**
5. ✅ Kiểm tra: Không có lỗi

---

## ✅ Verification Queries

Sau khi chạy xong, chạy các queries này để verify:

### 1. Kiểm tra Tables:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'escrow_accounts',
  'platform_commissions',
  'seller_bank_accounts',
  'payout_records',
  'notifications'
)
ORDER BY table_name;
```

**Kết quả mong đợi:** 5 rows

### 2. Kiểm tra Functions:
```sql
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
)
ORDER BY routine_name;
```

**Kết quả mong đợi:** 10 rows

### 3. Kiểm tra Columns trong orders:
```sql
SELECT column_name 
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
)
ORDER BY column_name;
```

**Kết quả mong đợi:** 7 rows

---

## ⚠️ Nếu gặp lỗi

### Lỗi: "relation already exists"
→ Migration đã được chạy trước đó → Bỏ qua migration đó

### Lỗi: "column already exists"
→ Column đã được thêm trước đó → Migration sẽ skip (dùng IF NOT EXISTS)

### Lỗi: "function already exists"
→ Function sẽ được update (dùng CREATE OR REPLACE) → OK

### Lỗi: "policy already exists"
→ Migration 041 đã handle (DROP IF EXISTS) → OK

---

## 📝 Checklist

- [ ] Migration 039 chạy thành công
- [ ] Migration 040 chạy thành công
- [ ] Migration 041 chạy thành công
- [ ] 5 tables đã được tạo
- [ ] 10 functions đã được tạo
- [ ] Orders có 7 columns mới
- [ ] Transactions có 7 columns mới
- [ ] RLS policies đã được tạo
- [ ] Indexes đã được tạo

---

## 🎯 Sau khi chạy xong

1. ✅ **Restart app** để các thay đổi có hiệu lực
2. ✅ **Test tạo bank account** (seller)
3. ✅ **Test tạo order** và thanh toán
4. ✅ **Test webhook** (nếu đã setup)
5. ✅ **Test admin payout dashboard**

---

**File hướng dẫn chi tiết:** `MIGRATION_GUIDE_ESCROW_PAYOUT.md`

