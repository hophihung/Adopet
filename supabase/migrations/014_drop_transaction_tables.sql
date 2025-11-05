-- =====================================================
-- DROP TABLES AND FUNCTIONS FOR CLEAN MIGRATION
-- Chạy file này TRƯỚC khi chạy lại migration 015
-- =====================================================

-- Step 1: Drop functions first (if exists)
DROP FUNCTION IF EXISTS confirm_transaction_with_payos(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS confirm_transaction_with_stripe(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS confirm_transaction(UUID, TEXT);

-- Step 2: Drop RLS policies on transactions table
DROP POLICY IF EXISTS "Users can view transactions in their conversations" ON public.transactions;
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can create transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can update their own transactions" ON public.transactions;

-- Step 3: Drop indexes on transactions table
DROP INDEX IF EXISTS idx_transactions_conversation_id;
DROP INDEX IF EXISTS idx_transactions_pet_id;
DROP INDEX IF EXISTS idx_transactions_seller_id;
DROP INDEX IF EXISTS idx_transactions_buyer_id;
DROP INDEX IF EXISTS idx_transactions_status;
DROP INDEX IF EXISTS idx_transactions_transaction_code;
DROP INDEX IF EXISTS idx_transactions_created_at;

-- Step 4: Drop triggers on transactions table
DROP TRIGGER IF EXISTS trigger_update_seller_reputation ON public.transactions;
DROP TRIGGER IF EXISTS update_transactions_updated_at ON public.transactions;

-- Step 5: Drop functions that are used by triggers
DROP FUNCTION IF EXISTS update_seller_reputation();
DROP FUNCTION IF EXISTS generate_transaction_code();

-- Step 6: Drop transaction_id column from messages table (if exists)
-- Note: This column links messages to transactions
ALTER TABLE public.messages DROP COLUMN IF EXISTS transaction_id;

-- Step 7: Drop transactions table (CASCADE will handle foreign keys)
DROP TABLE IF EXISTS public.transactions CASCADE;

-- =====================================================
-- NOTE: 
-- - Transactions table và tất cả data sẽ bị xóa
-- - Functions liên quan sẽ bị xóa
-- - Policies và indexes sẽ bị xóa
-- - Pets và Notifications tables KHÔNG bị ảnh hưởng
-- - Sau khi drop, bạn có thể chạy lại migration 015
-- =====================================================

-- =====================================================
-- COMPLETED! 🎉
-- Bây giờ bạn có thể chạy lại migration 015
-- =====================================================

