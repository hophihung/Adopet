-- =====================================================
-- MAKE TRANSACTION CODE NULLABLE
-- Cho phép transaction_code NULL cho giao dịch miễn phí (amount = 0)
-- =====================================================

-- Make transaction_code nullable
ALTER TABLE public.transactions
ALTER COLUMN transaction_code DROP NOT NULL;

-- Update unique constraint to allow NULL values
-- PostgreSQL allows multiple NULL values in a UNIQUE column
-- So we don't need to change the UNIQUE constraint

-- =====================================================
-- COMPLETED! 🎉
-- Bây giờ transaction_code có thể là NULL cho giao dịch miễn phí
-- =====================================================

