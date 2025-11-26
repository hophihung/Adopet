-- =====================================================
-- ADD PAYOUT SYSTEM AND UPDATE PAYMENT TRACKING
-- Thêm hệ thống payout và cập nhật tracking payment transaction ID
-- =====================================================

-- 1. Create seller_bank_accounts table (Thông tin tài khoản ngân hàng của seller)
CREATE TABLE IF NOT EXISTS public.seller_bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Bank account info
  bank_name text NOT NULL,
  account_number text NOT NULL,
  account_holder_name text NOT NULL,
  branch_name text,
  
  -- Verification
  is_verified boolean DEFAULT false,
  verified_at timestamptz,
  verified_by uuid REFERENCES public.profiles(id),
  
  -- Status
  is_active boolean DEFAULT true,
  is_primary boolean DEFAULT false, -- Primary account for payout
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraints
  UNIQUE(seller_id, account_number)
);

-- 2. Create payout_records table (Lịch sử chuyển tiền cho seller)
CREATE TABLE IF NOT EXISTS public.payout_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escrow_account_id uuid NOT NULL REFERENCES public.escrow_accounts(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Payout details
  payout_amount decimal(12, 2) NOT NULL CHECK (payout_amount > 0),
  platform_fee decimal(12, 2) NOT NULL CHECK (platform_fee >= 0),
  payout_method text NOT NULL CHECK (payout_method IN ('payos_payout', 'bank_transfer', 'manual', 'other')),
  
  -- Bank account used (if bank transfer)
  bank_account_id uuid REFERENCES public.seller_bank_accounts(id),
  bank_name text,
  account_number text,
  account_holder_name text,
  
  -- Payout status
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  
  -- External transaction ID (from payout API)
  external_transaction_id text,
  external_reference text,
  
  -- Processing info
  processed_at timestamptz,
  processed_by uuid REFERENCES public.profiles(id), -- Admin who processed
  completed_at timestamptz,
  failed_at timestamptz,
  failure_reason text,
  
  -- Notes
  admin_note text,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Update orders table to store PayOS payment link ID
-- Note: payment_transaction_id already exists, but we'll ensure it's used correctly
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS payos_payment_link_id text,
ADD COLUMN IF NOT EXISTS payos_order_code bigint; -- PayOS orderCode

-- 4. Update transactions table to store PayOS payment link ID
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS payos_payment_link_id text,
ADD COLUMN IF NOT EXISTS payos_order_code bigint; -- PayOS orderCode

-- 5. Create indexes
CREATE INDEX IF NOT EXISTS idx_seller_bank_accounts_seller_id ON public.seller_bank_accounts(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_bank_accounts_is_primary ON public.seller_bank_accounts(seller_id, is_primary) WHERE is_primary = true;

CREATE INDEX IF NOT EXISTS idx_payout_records_escrow_account_id ON public.payout_records(escrow_account_id);
CREATE INDEX IF NOT EXISTS idx_payout_records_seller_id ON public.payout_records(seller_id);
CREATE INDEX IF NOT EXISTS idx_payout_records_status ON public.payout_records(status);
CREATE INDEX IF NOT EXISTS idx_payout_records_created_at ON public.payout_records(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_payos_payment_link_id ON public.orders(payos_payment_link_id);
CREATE INDEX IF NOT EXISTS idx_transactions_payos_payment_link_id ON public.transactions(payos_payment_link_id);

-- 6. Enable RLS
ALTER TABLE public.seller_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies for seller_bank_accounts (drop if exists first)
DROP POLICY IF EXISTS "Sellers can view their own bank accounts" ON public.seller_bank_accounts;
DROP POLICY IF EXISTS "Sellers can insert their own bank accounts" ON public.seller_bank_accounts;
DROP POLICY IF EXISTS "Sellers can update their own bank accounts" ON public.seller_bank_accounts;
DROP POLICY IF EXISTS "Sellers can delete their own bank accounts" ON public.seller_bank_accounts;

CREATE POLICY "Sellers can view their own bank accounts"
  ON public.seller_bank_accounts FOR SELECT
  TO authenticated
  USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can insert their own bank accounts"
  ON public.seller_bank_accounts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update their own bank accounts"
  ON public.seller_bank_accounts FOR UPDATE
  TO authenticated
  USING (auth.uid() = seller_id)
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can delete their own bank accounts"
  ON public.seller_bank_accounts FOR DELETE
  TO authenticated
  USING (auth.uid() = seller_id);

-- RLS Policies for payout_records (drop if exists first)
DROP POLICY IF EXISTS "Sellers can view their payout records" ON public.payout_records;

CREATE POLICY "Sellers can view their payout records"
  ON public.payout_records FOR SELECT
  TO authenticated
  USING (auth.uid() = seller_id);

-- 7. Function to get seller's primary bank account
CREATE OR REPLACE FUNCTION get_seller_primary_bank_account(seller_id_param uuid)
RETURNS TABLE (
  id uuid,
  bank_name text,
  account_number text,
  account_holder_name text,
  branch_name text,
  is_verified boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sba.id,
    sba.bank_name,
    sba.account_number,
    sba.account_holder_name,
    sba.branch_name,
    sba.is_verified
  FROM public.seller_bank_accounts sba
  WHERE sba.seller_id = seller_id_param
    AND sba.is_active = true
    AND sba.is_primary = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Function to create payout record
CREATE OR REPLACE FUNCTION create_payout_record(
  escrow_account_id_param uuid,
  payout_method_param text DEFAULT 'bank_transfer'
)
RETURNS uuid AS $$
DECLARE
  escrow_record RECORD;
  commission_record RECORD;
  bank_account_record RECORD;
  payout_id uuid;
BEGIN
  -- Get escrow account
  SELECT * INTO escrow_record
  FROM public.escrow_accounts
  WHERE id = escrow_account_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Escrow account not found';
  END IF;
  
  IF escrow_record.status != 'released' THEN
    RAISE EXCEPTION 'Escrow account must be released before creating payout record';
  END IF;
  
  -- Get commission record
  SELECT * INTO commission_record
  FROM public.platform_commissions
  WHERE escrow_account_id = escrow_account_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Commission record not found';
  END IF;
  
  -- Get seller's primary bank account (if bank transfer)
  IF payout_method_param = 'bank_transfer' THEN
    SELECT * INTO bank_account_record
    FROM get_seller_primary_bank_account(escrow_record.seller_id);
  END IF;
  
  -- Create payout record
  INSERT INTO public.payout_records (
    escrow_account_id,
    seller_id,
    payout_amount,
    platform_fee,
    payout_method,
    bank_account_id,
    bank_name,
    account_number,
    account_holder_name,
    status
  )
  VALUES (
    escrow_account_id_param,
    escrow_record.seller_id,
    commission_record.seller_payout_amount,
    commission_record.total_platform_fee,
    payout_method_param,
    bank_account_record.id,
    bank_account_record.bank_name,
    bank_account_record.account_number,
    bank_account_record.account_holder_name,
    'pending'
  )
  RETURNING id INTO payout_id;
  
  RETURN payout_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Function to update payout status
CREATE OR REPLACE FUNCTION update_payout_status(
  payout_id_param uuid,
  status_param text,
  external_transaction_id_param text DEFAULT NULL,
  failure_reason_param text DEFAULT NULL,
  admin_note_param text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  UPDATE public.payout_records
  SET 
    status = status_param,
    external_transaction_id = COALESCE(external_transaction_id_param, external_transaction_id),
    failure_reason = COALESCE(failure_reason_param, failure_reason),
    admin_note = COALESCE(admin_note_param, admin_note),
    processed_at = CASE WHEN status_param = 'processing' THEN now() ELSE processed_at END,
    completed_at = CASE WHEN status_param = 'completed' THEN now() ELSE completed_at END,
    failed_at = CASE WHEN status_param = 'failed' THEN now() ELSE failed_at END,
    updated_at = now()
  WHERE id = payout_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Trigger to update timestamps
CREATE OR REPLACE FUNCTION update_seller_bank_accounts_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_seller_bank_accounts_timestamp_trigger
  BEFORE UPDATE ON public.seller_bank_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_seller_bank_accounts_timestamp();

CREATE OR REPLACE FUNCTION update_payout_records_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_payout_records_timestamp_trigger
  BEFORE UPDATE ON public.payout_records
  FOR EACH ROW
  EXECUTE FUNCTION update_payout_records_timestamp();

-- =====================================================
-- COMPLETED! 🎉
-- Payout system created
-- =====================================================


