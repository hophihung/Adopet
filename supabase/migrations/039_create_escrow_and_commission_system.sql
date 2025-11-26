-- =====================================================
-- CREATE ESCROW AND COMMISSION SYSTEM
-- Hệ thống Escrow (giữ tiền trung gian) và Commission (phí nền tảng)
-- =====================================================

-- 1. Create escrow_accounts table (Tài khoản escrow cho từng giao dịch)
CREATE TABLE IF NOT EXISTS public.escrow_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Reference to order or transaction
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE CASCADE,
  
  -- Escrow details
  buyer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount decimal(12, 2) NOT NULL CHECK (amount > 0), -- Tổng tiền buyer thanh toán
  
  -- Escrow status
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'escrowed', 'released', 'refunded', 'disputed')),
  
  -- Payment tracking
  payment_method text, -- 'payos', 'bank_transfer', 'cod', etc.
  payment_transaction_id text, -- ID từ payment gateway
  payment_received_at timestamptz, -- Thời gian nhận tiền
  
  -- Release tracking
  released_to_seller_at timestamptz, -- Thời gian chuyển tiền cho seller
  released_amount decimal(12, 2), -- Số tiền thực tế chuyển cho seller (sau khi trừ commission)
  
  -- Refund tracking
  refunded_at timestamptz,
  refund_amount decimal(12, 2),
  refund_reason text,
  
  -- Dispute tracking
  dispute_opened_at timestamptz,
  dispute_resolved_at timestamptz,
  dispute_resolution text, -- 'refund_buyer', 'release_seller', 'partial_refund'
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraints
  CONSTRAINT check_reference CHECK (
    (order_id IS NOT NULL AND transaction_id IS NULL) OR
    (order_id IS NULL AND transaction_id IS NOT NULL)
  )
);

-- 2. Create platform_commissions table (Phí nền tảng)
CREATE TABLE IF NOT EXISTS public.platform_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Reference to escrow account
  escrow_account_id uuid NOT NULL REFERENCES public.escrow_accounts(id) ON DELETE CASCADE,
  
  -- Reference to order or transaction
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE CASCADE,
  
  -- Commission details
  transaction_amount decimal(12, 2) NOT NULL, -- Tổng giá trị giao dịch
  commission_rate decimal(5, 2) NOT NULL DEFAULT 5.00 CHECK (commission_rate >= 0 AND commission_rate <= 100), -- % phí (mặc định 5%)
  commission_amount decimal(12, 2) NOT NULL CHECK (commission_amount >= 0), -- Số tiền phí thực tế
  
  -- Processing fee (phí xử lý thanh toán)
  processing_fee_rate decimal(5, 2) DEFAULT 1.00 CHECK (processing_fee_rate >= 0 AND processing_fee_rate <= 100), -- % phí xử lý
  processing_fee_amount decimal(12, 2) DEFAULT 0 CHECK (processing_fee_amount >= 0),
  
  -- Total platform fee
  total_platform_fee decimal(12, 2) NOT NULL CHECK (total_platform_fee >= 0), -- commission_amount + processing_fee_amount
  
  -- Seller payout
  seller_payout_amount decimal(12, 2) NOT NULL CHECK (seller_payout_amount >= 0), -- transaction_amount - total_platform_fee
  
  -- Commission status
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'calculated', 'collected', 'refunded')),
  
  -- Timestamps
  calculated_at timestamptz,
  collected_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraints
  CONSTRAINT check_reference CHECK (
    (order_id IS NOT NULL AND transaction_id IS NULL) OR
    (order_id IS NULL AND transaction_id IS NOT NULL)
  )
);

-- 3. Add escrow and commission fields to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS escrow_account_id uuid REFERENCES public.escrow_accounts(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS escrow_status text DEFAULT 'none' CHECK (escrow_status IN ('none', 'pending', 'escrowed', 'released', 'refunded')),
ADD COLUMN IF NOT EXISTS commission_id uuid REFERENCES public.platform_commissions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS platform_fee decimal(12, 2) DEFAULT 0 CHECK (platform_fee >= 0),
ADD COLUMN IF NOT EXISTS seller_payout decimal(12, 2) DEFAULT 0 CHECK (seller_payout >= 0);

-- 4. Add escrow and commission fields to transactions table
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS escrow_account_id uuid REFERENCES public.escrow_accounts(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS escrow_status text DEFAULT 'none' CHECK (escrow_status IN ('none', 'pending', 'escrowed', 'released', 'refunded')),
ADD COLUMN IF NOT EXISTS commission_id uuid REFERENCES public.platform_commissions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS platform_fee decimal(12, 2) DEFAULT 0 CHECK (platform_fee >= 0),
ADD COLUMN IF NOT EXISTS seller_payout decimal(12, 2) DEFAULT 0 CHECK (seller_payout >= 0);

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_escrow_accounts_order_id ON public.escrow_accounts(order_id);
CREATE INDEX IF NOT EXISTS idx_escrow_accounts_transaction_id ON public.escrow_accounts(transaction_id);
CREATE INDEX IF NOT EXISTS idx_escrow_accounts_buyer_id ON public.escrow_accounts(buyer_id);
CREATE INDEX IF NOT EXISTS idx_escrow_accounts_seller_id ON public.escrow_accounts(seller_id);
CREATE INDEX IF NOT EXISTS idx_escrow_accounts_status ON public.escrow_accounts(status);
CREATE INDEX IF NOT EXISTS idx_escrow_accounts_created_at ON public.escrow_accounts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_platform_commissions_escrow_account_id ON public.platform_commissions(escrow_account_id);
CREATE INDEX IF NOT EXISTS idx_platform_commissions_order_id ON public.platform_commissions(order_id);
CREATE INDEX IF NOT EXISTS idx_platform_commissions_transaction_id ON public.platform_commissions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_platform_commissions_status ON public.platform_commissions(status);
CREATE INDEX IF NOT EXISTS idx_platform_commissions_created_at ON public.platform_commissions(created_at DESC);

-- 6. Enable RLS for escrow_accounts
ALTER TABLE public.escrow_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for escrow_accounts (drop if exists first)
DROP POLICY IF EXISTS "Buyers can view their escrow accounts" ON public.escrow_accounts;
DROP POLICY IF EXISTS "Sellers can view their escrow accounts" ON public.escrow_accounts;

CREATE POLICY "Buyers can view their escrow accounts"
  ON public.escrow_accounts FOR SELECT
  TO authenticated
  USING (auth.uid() = buyer_id);

CREATE POLICY "Sellers can view their escrow accounts"
  ON public.escrow_accounts FOR SELECT
  TO authenticated
  USING (auth.uid() = seller_id);

-- 7. Enable RLS for platform_commissions
ALTER TABLE public.platform_commissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for platform_commissions (drop if exists first)
DROP POLICY IF EXISTS "Buyers can view commissions for their orders" ON public.platform_commissions;
DROP POLICY IF EXISTS "Sellers can view commissions for their orders" ON public.platform_commissions;

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

-- 8. Function to calculate commission
CREATE OR REPLACE FUNCTION calculate_commission(
  transaction_amount_param decimal,
  commission_rate_param decimal DEFAULT 5.00,
  processing_fee_rate_param decimal DEFAULT 1.00
)
RETURNS TABLE (
  commission_amount decimal,
  processing_fee_amount decimal,
  total_platform_fee decimal,
  seller_payout_amount decimal
) AS $$
DECLARE
  commission_calc decimal;
  processing_fee_calc decimal;
  total_fee_calc decimal;
  payout_calc decimal;
BEGIN
  -- Calculate commission (5% of transaction amount)
  commission_calc := (transaction_amount_param * commission_rate_param / 100);
  
  -- Calculate processing fee (1% of transaction amount)
  processing_fee_calc := (transaction_amount_param * processing_fee_rate_param / 100);
  
  -- Total platform fee
  total_fee_calc := commission_calc + processing_fee_calc;
  
  -- Seller payout (transaction amount - total platform fee)
  payout_calc := transaction_amount_param - total_fee_calc;
  
  RETURN QUERY SELECT 
    commission_calc,
    processing_fee_calc,
    total_fee_calc,
    payout_calc;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 9. Function to create escrow account for order
CREATE OR REPLACE FUNCTION create_escrow_for_order(
  order_id_param uuid,
  payment_method_param text DEFAULT 'payos',
  payment_transaction_id_param text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  order_record RECORD;
  escrow_id uuid;
  commission_calc RECORD;
BEGIN
  -- Get order details
  SELECT * INTO order_record
  FROM public.orders
  WHERE id = order_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  
  -- Calculate commission
  SELECT * INTO commission_calc
  FROM calculate_commission(order_record.final_price);
  
  -- Create escrow account
  INSERT INTO public.escrow_accounts (
    order_id,
    buyer_id,
    seller_id,
    amount,
    status,
    payment_method,
    payment_transaction_id,
    payment_received_at
  )
  VALUES (
    order_id_param,
    order_record.buyer_id,
    order_record.seller_id,
    order_record.final_price,
    'escrowed',
    payment_method_param,
    payment_transaction_id_param,
    now()
  )
  RETURNING id INTO escrow_id;
  
  -- Create commission record
  INSERT INTO public.platform_commissions (
    escrow_account_id,
    order_id,
    transaction_amount,
    commission_rate,
    commission_amount,
    processing_fee_rate,
    processing_fee_amount,
    total_platform_fee,
    seller_payout_amount,
    status,
    calculated_at
  )
  VALUES (
    escrow_id,
    order_id_param,
    order_record.final_price,
    5.00, -- Default commission rate 5%
    commission_calc.commission_amount,
    1.00, -- Default processing fee rate 1%
    commission_calc.processing_fee_amount,
    commission_calc.total_platform_fee,
    commission_calc.seller_payout_amount,
    'calculated',
    now()
  );
  
  -- Update order with escrow and commission info
  UPDATE public.orders
  SET 
    escrow_account_id = escrow_id,
    escrow_status = 'escrowed',
    commission_id = (SELECT id FROM public.platform_commissions WHERE escrow_account_id = escrow_id),
    platform_fee = commission_calc.total_platform_fee,
    seller_payout = commission_calc.seller_payout_amount,
    payment_status = 'paid',
    updated_at = now()
  WHERE id = order_id_param;
  
  RETURN escrow_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Function to create escrow account for transaction (pet)
CREATE OR REPLACE FUNCTION create_escrow_for_transaction(
  transaction_id_param uuid,
  payment_method_param text DEFAULT 'payos',
  payment_transaction_id_param text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  transaction_record RECORD;
  escrow_id uuid;
  commission_calc RECORD;
BEGIN
  -- Get transaction details
  SELECT * INTO transaction_record
  FROM public.transactions
  WHERE id = transaction_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;
  
  -- Calculate commission
  SELECT * INTO commission_calc
  FROM calculate_commission(transaction_record.amount);
  
  -- Create escrow account
  INSERT INTO public.escrow_accounts (
    transaction_id,
    buyer_id,
    seller_id,
    amount,
    status,
    payment_method,
    payment_transaction_id,
    payment_received_at
  )
  VALUES (
    transaction_id_param,
    transaction_record.buyer_id,
    transaction_record.seller_id,
    transaction_record.amount,
    'escrowed',
    payment_method_param,
    payment_transaction_id_param,
    now()
  )
  RETURNING id INTO escrow_id;
  
  -- Create commission record
  INSERT INTO public.platform_commissions (
    escrow_account_id,
    transaction_id,
    transaction_amount,
    commission_rate,
    commission_amount,
    processing_fee_rate,
    processing_fee_amount,
    total_platform_fee,
    seller_payout_amount,
    status,
    calculated_at
  )
  VALUES (
    escrow_id,
    transaction_id_param,
    transaction_record.amount,
    5.00, -- Default commission rate 5%
    commission_calc.commission_amount,
    1.00, -- Default processing fee rate 1%
    commission_calc.processing_fee_amount,
    commission_calc.total_platform_fee,
    commission_calc.seller_payout_amount,
    'calculated',
    now()
  );
  
  -- Update transaction with escrow and commission info
  UPDATE public.transactions
  SET 
    escrow_account_id = escrow_id,
    escrow_status = 'escrowed',
    commission_id = (SELECT id FROM public.platform_commissions WHERE escrow_account_id = escrow_id),
    platform_fee = commission_calc.total_platform_fee,
    seller_payout = commission_calc.seller_payout_amount,
    status = 'completed',
    completed_at = now(),
    updated_at = now()
  WHERE id = transaction_id_param;
  
  RETURN escrow_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Function to release escrow to seller (khi đơn hàng delivered)
CREATE OR REPLACE FUNCTION release_escrow_to_seller(
  escrow_account_id_param uuid
)
RETURNS void AS $$
DECLARE
  escrow_record RECORD;
  commission_record RECORD;
BEGIN
  -- Get escrow account
  SELECT * INTO escrow_record
  FROM public.escrow_accounts
  WHERE id = escrow_account_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Escrow account not found';
  END IF;
  
  IF escrow_record.status != 'escrowed' THEN
    RAISE EXCEPTION 'Escrow account is not in escrowed status';
  END IF;
  
  -- Get commission record
  SELECT * INTO commission_record
  FROM public.platform_commissions
  WHERE escrow_account_id = escrow_account_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Commission record not found';
  END IF;
  
  -- Update escrow account
  UPDATE public.escrow_accounts
  SET 
    status = 'released',
    released_to_seller_at = now(),
    released_amount = commission_record.seller_payout_amount,
    updated_at = now()
  WHERE id = escrow_account_id_param;
  
  -- Update commission status
  UPDATE public.platform_commissions
  SET 
    status = 'collected',
    collected_at = now(),
    updated_at = now()
  WHERE id = commission_record.id;
  
  -- Update order or transaction
  IF escrow_record.order_id IS NOT NULL THEN
    UPDATE public.orders
    SET 
      escrow_status = 'released',
      updated_at = now()
    WHERE id = escrow_record.order_id;
  END IF;
  
  IF escrow_record.transaction_id IS NOT NULL THEN
    UPDATE public.transactions
    SET 
      escrow_status = 'released',
      updated_at = now()
    WHERE id = escrow_record.transaction_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Function to refund escrow to buyer (khi có dispute hoặc cancel)
CREATE OR REPLACE FUNCTION refund_escrow_to_buyer(
  escrow_account_id_param uuid,
  refund_reason_param text DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  escrow_record RECORD;
  commission_record RECORD;
BEGIN
  -- Get escrow account
  SELECT * INTO escrow_record
  FROM public.escrow_accounts
  WHERE id = escrow_account_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Escrow account not found';
  END IF;
  
  IF escrow_record.status NOT IN ('escrowed', 'disputed') THEN
    RAISE EXCEPTION 'Escrow account cannot be refunded in current status';
  END IF;
  
  -- Get commission record
  SELECT * INTO commission_record
  FROM public.platform_commissions
  WHERE escrow_account_id = escrow_account_id_param;
  
  -- Update escrow account
  UPDATE public.escrow_accounts
  SET 
    status = 'refunded',
    refunded_at = now(),
    refund_amount = escrow_record.amount, -- Full refund
    refund_reason = refund_reason_param,
    updated_at = now()
  WHERE id = escrow_account_id_param;
  
  -- Update commission status (refund commission)
  IF commission_record.id IS NOT NULL THEN
    UPDATE public.platform_commissions
    SET 
      status = 'refunded',
      updated_at = now()
    WHERE id = commission_record.id;
  END IF;
  
  -- Update order or transaction
  IF escrow_record.order_id IS NOT NULL THEN
    UPDATE public.orders
    SET 
      escrow_status = 'refunded',
      payment_status = 'refunded',
      status = 'cancelled',
      updated_at = now()
    WHERE id = escrow_record.order_id;
  END IF;
  
  IF escrow_record.transaction_id IS NOT NULL THEN
    UPDATE public.transactions
    SET 
      escrow_status = 'refunded',
      status = 'cancelled',
      updated_at = now()
    WHERE id = escrow_record.transaction_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Function to open dispute
CREATE OR REPLACE FUNCTION open_escrow_dispute(
  escrow_account_id_param uuid
)
RETURNS void AS $$
DECLARE
  escrow_record RECORD;
BEGIN
  -- Get escrow account
  SELECT * INTO escrow_record
  FROM public.escrow_accounts
  WHERE id = escrow_account_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Escrow account not found';
  END IF;
  
  IF escrow_record.status != 'escrowed' THEN
    RAISE EXCEPTION 'Escrow account must be in escrowed status to open dispute';
  END IF;
  
  -- Update escrow account
  UPDATE public.escrow_accounts
  SET 
    status = 'disputed',
    dispute_opened_at = now(),
    updated_at = now()
  WHERE id = escrow_account_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. Trigger to update escrow_accounts updated_at
CREATE OR REPLACE FUNCTION update_escrow_accounts_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_escrow_accounts_timestamp_trigger
  BEFORE UPDATE ON public.escrow_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_escrow_accounts_timestamp();

-- 15. Trigger to update platform_commissions updated_at
CREATE OR REPLACE FUNCTION update_platform_commissions_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_platform_commissions_timestamp_trigger
  BEFORE UPDATE ON public.platform_commissions
  FOR EACH ROW
  EXECUTE FUNCTION update_platform_commissions_timestamp();

-- =====================================================
-- COMPLETED! 🎉
-- ESCROW & COMMISSION SYSTEM created
-- =====================================================

