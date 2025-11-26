-- =====================================================
-- ADD ESCROW & PAYOUT NOTIFICATIONS
-- Tạo notifications cho escrow và payout events
-- =====================================================

-- 1. Create notifications table (if not exists)
-- Note: Notifications table was dropped in migration 037, need to recreate
-- Check if exists, if not create it
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notifications') THEN
    CREATE TABLE public.notifications (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      type text NOT NULL, -- 'escrow_created', 'payment_success', 'escrow_released', 'payout_created', 'payout_completed', 'payout_failed', etc.
      title text NOT NULL,
      body text NOT NULL,
      data jsonb,
      is_read boolean DEFAULT false,
      created_at timestamptz DEFAULT now(),
      read_at timestamptz
    );
  END IF;
END $$;

-- 2. Create indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- 3. Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies (drop if exists first to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;

CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  user_id_param uuid,
  type_param text,
  title_param text,
  body_param text,
  data_param jsonb DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  notification_id uuid;
BEGIN
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    body,
    data
  )
  VALUES (
    user_id_param,
    type_param,
    title_param,
    body_param,
    data_param
  )
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Update create_escrow_for_order to send notification
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
    5.00,
    commission_calc.commission_amount,
    1.00,
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
  
  -- Send notification to seller
  PERFORM create_notification(
    order_record.seller_id,
    'escrow_created',
    'Đơn hàng đã được thanh toán',
    'Đơn hàng #' || SUBSTRING(order_id_param::text, 1, 8) || ' đã được thanh toán. Tiền đã được giữ trong escrow.',
    jsonb_build_object(
      'order_id', order_id_param,
      'escrow_account_id', escrow_id,
      'amount', order_record.final_price
    )
  );
  
  -- Send notification to buyer
  PERFORM create_notification(
    order_record.buyer_id,
    'payment_success',
    'Thanh toán thành công',
    'Đơn hàng của bạn đã được thanh toán thành công.',
    jsonb_build_object(
      'order_id', order_id_param,
      'amount', order_record.final_price
    )
  );
  
  RETURN escrow_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Update release_escrow_to_seller to send notification
CREATE OR REPLACE FUNCTION release_escrow_to_seller(
  escrow_account_id_param uuid
)
RETURNS void AS $$
DECLARE
  escrow_record RECORD;
  commission_record RECORD;
  order_record RECORD;
  transaction_record RECORD;
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
    SELECT * INTO order_record
    FROM public.orders
    WHERE id = escrow_record.order_id;
    
    UPDATE public.orders
    SET 
      escrow_status = 'released',
      updated_at = now()
    WHERE id = escrow_record.order_id;
    
    -- Send notification to seller
    PERFORM create_notification(
      escrow_record.seller_id,
      'escrow_released',
      'Tiền đã được giải phóng',
      'Tiền từ đơn hàng #' || SUBSTRING(escrow_record.order_id::text, 1, 8) || ' đã được giải phóng. Payout đang được xử lý.',
      jsonb_build_object(
        'order_id', escrow_record.order_id,
        'escrow_account_id', escrow_account_id_param,
        'payout_amount', commission_record.seller_payout_amount
      )
    );
  END IF;
  
  IF escrow_record.transaction_id IS NOT NULL THEN
    SELECT * INTO transaction_record
    FROM public.transactions
    WHERE id = escrow_record.transaction_id;
    
    UPDATE public.transactions
    SET 
      escrow_status = 'released',
      updated_at = now()
    WHERE id = escrow_record.transaction_id;
    
    -- Send notification to seller
    PERFORM create_notification(
      escrow_record.seller_id,
      'escrow_released',
      'Tiền đã được giải phóng',
      'Tiền từ giao dịch đã được giải phóng. Payout đang được xử lý.',
      jsonb_build_object(
        'transaction_id', escrow_record.transaction_id,
        'escrow_account_id', escrow_account_id_param,
        'payout_amount', commission_record.seller_payout_amount
      )
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Update create_payout_record to send notification
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
  
  -- Send notification to seller
  PERFORM create_notification(
    escrow_record.seller_id,
    'payout_created',
    'Payout đã được tạo',
    'Payout ' || formatPrice(commission_record.seller_payout_amount) || ' đã được tạo và đang chờ xử lý.',
    jsonb_build_object(
      'payout_id', payout_id,
      'escrow_account_id', escrow_account_id_param,
      'payout_amount', commission_record.seller_payout_amount,
      'status', 'pending'
    )
  );
  
  RETURN payout_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to format price (for notification)
CREATE OR REPLACE FUNCTION formatPrice(amount decimal)
RETURNS text AS $$
BEGIN
  RETURN TO_CHAR(amount, 'FM999,999,999') || ' VNĐ';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 8. Update update_payout_status to send notification
CREATE OR REPLACE FUNCTION update_payout_status(
  payout_id_param uuid,
  status_param text,
  external_transaction_id_param text DEFAULT NULL,
  failure_reason_param text DEFAULT NULL,
  admin_note_param text DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  payout_record RECORD;
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
  WHERE id = payout_id_param
  RETURNING * INTO payout_record;
  
  -- Send notification based on status
  IF status_param = 'completed' THEN
    PERFORM create_notification(
      payout_record.seller_id,
      'payout_completed',
      'Payout đã hoàn thành',
      'Payout ' || formatPrice(payout_record.payout_amount) || ' đã được chuyển vào tài khoản của bạn.',
      jsonb_build_object(
        'payout_id', payout_id_param,
        'payout_amount', payout_record.payout_amount,
        'external_transaction_id', external_transaction_id_param
      )
    );
  ELSIF status_param = 'failed' THEN
    PERFORM create_notification(
      payout_record.seller_id,
      'payout_failed',
      'Payout thất bại',
      'Payout ' || formatPrice(payout_record.payout_amount) || ' đã thất bại. ' || COALESCE(failure_reason_param, 'Vui lòng liên hệ hỗ trợ.'),
      jsonb_build_object(
        'payout_id', payout_id_param,
        'payout_amount', payout_record.payout_amount,
        'failure_reason', failure_reason_param
      )
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMPLETED! 🎉
-- Notifications for escrow and payout added
-- =====================================================

