-- =====================================================
-- ADD PAYOS TRANSACTION CONFIRMATION FUNCTION
-- Function to confirm transaction after successful PayOS payment
-- =====================================================

CREATE OR REPLACE FUNCTION confirm_transaction_with_payos(
  transaction_id_param UUID,
  payos_payment_link_id TEXT,
  payment_proof_url_param TEXT DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  transaction_record RECORD;
BEGIN
  -- Get transaction details
  SELECT * INTO transaction_record
  FROM public.transactions
  WHERE id = transaction_id_param
    AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found or already processed';
  END IF;

  -- Verify current user is the buyer
  IF transaction_record.buyer_id != auth.uid() THEN
    RAISE EXCEPTION 'Only buyer can confirm payment';
  END IF;

  -- Update transaction
  UPDATE public.transactions
  SET 
    status = 'completed',
    payment_method = 'payos',
    payment_proof_url = payment_proof_url_param,
    confirmed_by = auth.uid(),
    completed_at = NOW(),
    updated_at = NOW()
  WHERE id = transaction_id_param;

  -- Update pet availability (mark as sold)
  UPDATE public.pets
  SET is_available = false,
      updated_at = NOW()
  WHERE id = transaction_record.pet_id;

  -- Send notification to seller
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    body,
    data,
    created_at
  )
  VALUES (
    transaction_record.seller_id,
    'new_message', -- You may want to add a new type like 'transaction_completed'
    'Giao dịch đã hoàn thành',
    'Người mua đã thanh toán thành công qua PayOS',
    jsonb_build_object(
      'transaction_id', transaction_id_param,
      'payment_method', 'payos',
      'payos_payment_link_id', payos_payment_link_id
    ),
    NOW()
  );

  -- Log transaction completion (optional)
  -- You can create a separate table for transaction logs if needed
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
GRANT EXECUTE ON FUNCTION confirm_transaction_with_payos TO authenticated;

-- =====================================================
-- COMPLETED! 🎉
-- =====================================================

