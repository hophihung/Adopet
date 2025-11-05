-- =====================================================
-- ADD PAYOS FIELDS TO TRANSACTIONS
-- Thêm các cột để lưu PayOS payment link ID và QR code
-- =====================================================

-- Add PayOS fields to transactions table
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS payos_payment_link_id text,
ADD COLUMN IF NOT EXISTS payos_qr_code text;

-- Create index for payment link ID
CREATE INDEX IF NOT EXISTS idx_transactions_payos_payment_link_id 
ON public.transactions(payos_payment_link_id) 
WHERE payos_payment_link_id IS NOT NULL;

-- =====================================================
-- COMPLETED! 🎉
-- Bây giờ có thể lưu PayOS payment link ID và QR code vào transaction
-- =====================================================

