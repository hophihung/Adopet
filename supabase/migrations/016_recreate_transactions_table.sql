-- =====================================================
-- RECREATE TRANSACTIONS TABLE
-- Tạo lại bảng transactions sau khi đã drop
-- Chạy file này SAU migration 014 và TRƯỚC migration 015
-- =====================================================

-- 1. Create transactions table (từ migration 012)
CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  pet_id uuid REFERENCES public.pets(id) ON DELETE CASCADE NOT NULL,
  seller_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  buyer_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  transaction_code text NOT NULL UNIQUE,
  amount numeric(10, 2) NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  payment_method text,
  payment_proof_url text, -- URL ảnh chứng từ chuyển khoản
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  confirmed_by uuid REFERENCES public.profiles(id) -- Admin/system user who confirmed
);

-- 2. Add transaction_id column to messages table (if not exists)
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL;

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_conversation_id ON public.transactions(conversation_id);
CREATE INDEX IF NOT EXISTS idx_transactions_pet_id ON public.transactions(pet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_seller_id ON public.transactions(seller_id);
CREATE INDEX IF NOT EXISTS idx_transactions_buyer_id ON public.transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_code ON public.transactions(transaction_code);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);

-- 4. Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for transactions
CREATE POLICY "Users can view transactions in their conversations"
  ON public.transactions FOR SELECT
  USING (
    seller_id = auth.uid() OR buyer_id = auth.uid()
  );

CREATE POLICY "Sellers can create transactions"
  ON public.transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    seller_id = auth.uid() AND
    conversation_id IN (
      SELECT id FROM public.conversations 
      WHERE seller_id = auth.uid()
    )
  );

CREATE POLICY "Buyers can update transactions they own"
  ON public.transactions FOR UPDATE
  USING (buyer_id = auth.uid())
  WITH CHECK (buyer_id = auth.uid());

CREATE POLICY "Sellers can update their own transactions"
  ON public.transactions FOR UPDATE
  USING (seller_id = auth.uid())
  WITH CHECK (seller_id = auth.uid());

-- 6. Function to generate transaction code (NO PARAMETERS)
CREATE OR REPLACE FUNCTION generate_transaction_code()
RETURNS text AS $$
DECLARE
  code text;
  exists_check boolean;
BEGIN
  LOOP
    -- Generate a 8-character alphanumeric code
    code := upper(
      substr(md5(random()::text || clock_timestamp()::text), 1, 8)
    );
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM public.transactions WHERE transaction_code = code)
    INTO exists_check;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT exists_check;
  END LOOP;
  
  RETURN code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Function to update seller reputation when transaction is completed
CREATE OR REPLACE FUNCTION update_seller_reputation()
RETURNS TRIGGER AS $$
DECLARE
  total_points integer;
  new_frame text;
BEGIN
  -- Only process when status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Calculate reputation points based on transaction amount
    -- Formula: 1 point per 100,000 VND
    total_points := COALESCE(
      (SELECT reputation_points FROM public.profiles WHERE id = NEW.seller_id), 
      0
    ) + GREATEST(1, FLOOR(NEW.amount / 100000));
    
    -- Determine avatar frame based on total reputation points
    new_frame := CASE
      WHEN total_points >= 1000 THEN 'diamond'
      WHEN total_points >= 500 THEN 'platinum'
      WHEN total_points >= 200 THEN 'gold'
      WHEN total_points >= 100 THEN 'silver'
      WHEN total_points >= 50 THEN 'bronze'
      ELSE 'default'
    END;
    
    -- Update seller's reputation
    UPDATE public.profiles
    SET 
      reputation_points = total_points,
      avatar_frame = new_frame,
      updated_at = now()
    WHERE id = NEW.seller_id;
    
    -- Set completed_at timestamp
    NEW.completed_at := now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Trigger to update seller reputation
DROP TRIGGER IF EXISTS trigger_update_seller_reputation ON public.transactions;
CREATE TRIGGER trigger_update_seller_reputation
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_seller_reputation();

-- 9. Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Trigger to update updated_at
DROP TRIGGER IF EXISTS update_transactions_updated_at ON public.transactions;
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_transactions_updated_at();

-- 11. Function to confirm transaction completion (for buyer)
CREATE OR REPLACE FUNCTION confirm_transaction(
  transaction_id_param uuid,
  payment_proof_url_param text DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  transaction_record public.transactions%ROWTYPE;
BEGIN
  -- Get transaction
  SELECT * INTO transaction_record
  FROM public.transactions
  WHERE id = transaction_id_param;
  
  -- Check if transaction exists and belongs to the buyer
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;
  
  IF transaction_record.buyer_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: Only buyer can confirm this transaction';
  END IF;
  
  IF transaction_record.status != 'pending' THEN
    RAISE EXCEPTION 'Transaction is not pending';
  END IF;
  
  -- Update transaction status to completed
  UPDATE public.transactions
  SET 
    status = 'completed',
    payment_proof_url = COALESCE(payment_proof_url_param, payment_proof_url),
    completed_at = now(),
    confirmed_by = auth.uid(),
    updated_at = now()
  WHERE id = transaction_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Enable realtime for transactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;

-- 13. Function to get seller's reputation tier (bonus)
CREATE OR REPLACE FUNCTION get_reputation_tier(reputation_points integer)
RETURNS text AS $$
BEGIN
  RETURN CASE
    WHEN reputation_points >= 1000 THEN 'diamond'
    WHEN reputation_points >= 500 THEN 'platinum'
    WHEN reputation_points >= 200 THEN 'gold'
    WHEN reputation_points >= 100 THEN 'silver'
    WHEN reputation_points >= 50 THEN 'bronze'
    ELSE 'default'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 14. Grant permissions
GRANT EXECUTE ON FUNCTION generate_transaction_code() TO authenticated;
GRANT EXECUTE ON FUNCTION confirm_transaction(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_reputation_tier(integer) TO authenticated;

-- =====================================================
-- COMPLETED! 🎉
-- Bảng transactions đã được tạo lại với đầy đủ:
-- - Table structure
-- - Indexes
-- - RLS policies
-- - Functions (generate_transaction_code, confirm_transaction)
-- - Triggers (update_seller_reputation, update_transactions_updated_at)
-- 
-- Bây giờ bạn có thể chạy migration 015 để thêm PayOS function
-- =====================================================

