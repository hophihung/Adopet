# 🔧 Fix Migration Errors

## ❌ Lỗi gặp phải

```
Error: Failed to run sql query: 
ERROR: 42710: policy "Buyers can view their escrow accounts" 
for table "escrow_accounts" already exists
```

## ✅ Đã fix

Đã cập nhật migration 039 và 040 để **DROP POLICY IF EXISTS** trước khi CREATE.

### Migration 039 - Đã fix:
- ✅ DROP policies trước khi CREATE cho `escrow_accounts`
- ✅ DROP policies trước khi CREATE cho `platform_commissions`

### Migration 040 - Đã fix:
- ✅ DROP policies trước khi CREATE cho `seller_bank_accounts`
- ✅ DROP policies trước khi CREATE cho `payout_records`

## 🚀 Cách chạy lại

### Option 1: Chạy lại migration 039 (đã fix)

1. Vào Supabase Dashboard → SQL Editor
2. Copy toàn bộ nội dung file `039_create_escrow_and_commission_system.sql` (đã được fix)
3. Paste và RUN
4. ✅ Sẽ không còn lỗi policy already exists

### Option 2: Chạy từng phần (nếu migration đã chạy một phần)

Nếu migration đã chạy một phần và tạo được tables nhưng fail ở policies:

```sql
-- 1. Drop policies nếu đã tồn tại
DROP POLICY IF EXISTS "Buyers can view their escrow accounts" ON public.escrow_accounts;
DROP POLICY IF EXISTS "Sellers can view their escrow accounts" ON public.escrow_accounts;
DROP POLICY IF EXISTS "Buyers can view commissions for their orders" ON public.platform_commissions;
DROP POLICY IF EXISTS "Sellers can view commissions for their orders" ON public.platform_commissions;

-- 2. Tạo lại policies
CREATE POLICY "Buyers can view their escrow accounts"
  ON public.escrow_accounts FOR SELECT
  TO authenticated
  USING (auth.uid() = buyer_id);

CREATE POLICY "Sellers can view their escrow accounts"
  ON public.escrow_accounts FOR SELECT
  TO authenticated
  USING (auth.uid() = seller_id);

CREATE POLICY "Buyers can view commissions for their orders"
  ON public.platform_commissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.escrow_accounts ea
      WHERE ea.id = platform_commissions.escrow_account_id
      AND ea.buyer_id = auth.uid()
    )
  );

CREATE POLICY "Sellers can view commissions for their orders"
  ON public.platform_commissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.escrow_accounts ea
      WHERE ea.id = platform_commissions.escrow_account_id
      AND ea.seller_id = auth.uid()
    )
  );
```

Sau đó tiếp tục chạy migration 040 và 041.

---

## ✅ Verification

Sau khi fix, kiểm tra:

```sql
-- Kiểm tra policies đã được tạo
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('escrow_accounts', 'platform_commissions', 'seller_bank_accounts', 'payout_records')
ORDER BY tablename, policyname;
```

**Kết quả mong đợi:**
- `escrow_accounts`: 2 policies
- `platform_commissions`: 2 policies
- `seller_bank_accounts`: 4 policies
- `payout_records`: 1 policy

---

**Migration files đã được fix và sẵn sàng chạy lại!** ✅

