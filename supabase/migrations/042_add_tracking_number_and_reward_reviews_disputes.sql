-- =====================================================
-- ADD TRACKING NUMBER, REWARD SYSTEM, REVIEWS, DISPUTES
-- Thêm tracking number, hệ thống reward, đánh giá, tranh chấp
-- =====================================================

-- 1. Add tracking_number to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS tracking_number text;

-- Create index for tracking number
CREATE INDEX IF NOT EXISTS idx_orders_tracking_number ON public.orders(tracking_number) WHERE tracking_number IS NOT NULL;

-- 2. Create user_rewards table (Hệ thống điểm thưởng)
CREATE TABLE IF NOT EXISTS public.user_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Reward details
  points decimal(12, 2) NOT NULL DEFAULT 0 CHECK (points >= 0), -- Tổng điểm hiện tại
  cashback_balance decimal(12, 2) NOT NULL DEFAULT 0 CHECK (cashback_balance >= 0), -- Số tiền cashback
  
  -- Lifetime stats
  total_points_earned decimal(12, 2) NOT NULL DEFAULT 0 CHECK (total_points_earned >= 0),
  total_points_spent decimal(12, 2) NOT NULL DEFAULT 0 CHECK (total_points_spent >= 0),
  total_cashback_earned decimal(12, 2) NOT NULL DEFAULT 0 CHECK (total_cashback_earned >= 0),
  total_cashback_used decimal(12, 2) NOT NULL DEFAULT 0 CHECK (total_cashback_used >= 0),
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- One reward record per user
  UNIQUE(user_id)
);

-- 3. Create reward_transactions table (Lịch sử giao dịch điểm)
CREATE TABLE IF NOT EXISTS public.reward_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reward_id uuid NOT NULL REFERENCES public.user_rewards(id) ON DELETE CASCADE,
  
  -- Transaction details
  transaction_type text NOT NULL CHECK (transaction_type IN ('earn', 'spend', 'cashback_earn', 'cashback_use', 'expire')),
  points_amount decimal(12, 2) NOT NULL DEFAULT 0,
  cashback_amount decimal(12, 2) NOT NULL DEFAULT 0,
  
  -- Source reference
  source_type text NOT NULL CHECK (source_type IN ('order', 'transaction', 'referral', 'promotion', 'manual', 'purchase', 'redemption')),
  source_id uuid, -- Reference to order_id, transaction_id, etc.
  
  -- Description
  description text,
  metadata jsonb, -- Additional data
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz -- For points expiration
);

-- 4. Create product_reviews table (Đánh giá sản phẩm)
CREATE TABLE IF NOT EXISTS public.product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Review details
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title text,
  comment text,
  
  -- Review status
  status text DEFAULT 'active' CHECK (status IN ('active', 'hidden', 'deleted')),
  
  -- Response from seller
  seller_response text,
  seller_response_at timestamptz,
  
  -- Helpful votes
  helpful_count integer DEFAULT 0 CHECK (helpful_count >= 0),
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- One review per order
  UNIQUE(order_id)
);

-- 5. Create review_helpful_votes table (Đánh giá hữu ích)
CREATE TABLE IF NOT EXISTS public.review_helpful_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.product_reviews(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Vote
  is_helpful boolean NOT NULL DEFAULT true,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  
  -- One vote per user per review
  UNIQUE(review_id, user_id)
);

-- 6. Create escrow_disputes table (Tranh chấp escrow)
CREATE TABLE IF NOT EXISTS public.escrow_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escrow_account_id uuid NOT NULL REFERENCES public.escrow_accounts(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  
  -- Parties
  opened_by uuid NOT NULL REFERENCES public.profiles(id), -- Buyer or seller who opened dispute
  buyer_id uuid NOT NULL REFERENCES public.profiles(id),
  seller_id uuid NOT NULL REFERENCES public.profiles(id),
  
  -- Dispute details
  dispute_type text NOT NULL CHECK (dispute_type IN ('product_not_received', 'product_damaged', 'product_not_as_described', 'seller_not_responding', 'other')),
  reason text NOT NULL,
  description text NOT NULL,
  
  -- Evidence (images, documents)
  evidence_urls text[], -- Array of URLs to evidence files
  
  -- Status
  status text DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'resolved', 'closed', 'cancelled')),
  
  -- Resolution
  resolved_by uuid REFERENCES public.profiles(id), -- Admin who resolved
  resolution text, -- Admin's decision
  resolution_type text CHECK (resolution_type IN ('refund_buyer', 'release_to_seller', 'partial_refund', 'no_action')),
  resolution_amount decimal(12, 2) CHECK (resolution_amount >= 0), -- If partial refund
  
  -- Timestamps
  opened_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraints
  CONSTRAINT check_reference CHECK (
    (order_id IS NOT NULL AND transaction_id IS NULL) OR
    (order_id IS NULL AND transaction_id IS NOT NULL)
  )
);

-- 7. Create dispute_messages table (Tin nhắn trong tranh chấp)
CREATE TABLE IF NOT EXISTS public.dispute_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id uuid NOT NULL REFERENCES public.escrow_disputes(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Message content
  message text NOT NULL,
  attachments text[], -- Array of URLs to attachment files
  
  -- Message type
  message_type text DEFAULT 'user' CHECK (message_type IN ('user', 'admin', 'system')),
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  
  -- Soft delete
  deleted_at timestamptz
);

-- 8. Create indexes
CREATE INDEX IF NOT EXISTS idx_user_rewards_user_id ON public.user_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_reward_transactions_user_id ON public.reward_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_reward_transactions_source ON public.reward_transactions(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON public.product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_order_id ON public.product_reviews(order_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_buyer_id ON public.product_reviews(buyer_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_seller_id ON public.product_reviews(seller_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_rating ON public.product_reviews(product_id, rating);
CREATE INDEX IF NOT EXISTS idx_review_helpful_votes_review_id ON public.review_helpful_votes(review_id);
CREATE INDEX IF NOT EXISTS idx_escrow_disputes_escrow_account_id ON public.escrow_disputes(escrow_account_id);
CREATE INDEX IF NOT EXISTS idx_escrow_disputes_order_id ON public.escrow_disputes(order_id);
CREATE INDEX IF NOT EXISTS idx_escrow_disputes_status ON public.escrow_disputes(status);
CREATE INDEX IF NOT EXISTS idx_dispute_messages_dispute_id ON public.dispute_messages(dispute_id);

-- 9. Enable RLS
ALTER TABLE public.user_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_helpful_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispute_messages ENABLE ROW LEVEL SECURITY;

-- 10. RLS Policies for user_rewards
DROP POLICY IF EXISTS "Users can view their own rewards" ON public.user_rewards;
CREATE POLICY "Users can view their own rewards"
  ON public.user_rewards FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own rewards" ON public.user_rewards;
CREATE POLICY "Users can update their own rewards"
  ON public.user_rewards FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 11. RLS Policies for reward_transactions
DROP POLICY IF EXISTS "Users can view their own reward transactions" ON public.reward_transactions;
CREATE POLICY "Users can view their own reward transactions"
  ON public.reward_transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 12. RLS Policies for product_reviews
DROP POLICY IF EXISTS "Anyone can view active reviews" ON public.product_reviews;
CREATE POLICY "Anyone can view active reviews"
  ON public.product_reviews FOR SELECT
  TO authenticated
  USING (status = 'active');

DROP POLICY IF EXISTS "Buyers can view their own reviews" ON public.product_reviews;
CREATE POLICY "Buyers can view their own reviews"
  ON public.product_reviews FOR SELECT
  TO authenticated
  USING (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "Sellers can view reviews for their products" ON public.product_reviews;
CREATE POLICY "Sellers can view reviews for their products"
  ON public.product_reviews FOR SELECT
  TO authenticated
  USING (auth.uid() = seller_id);

DROP POLICY IF EXISTS "Buyers can create reviews" ON public.product_reviews;
CREATE POLICY "Buyers can create reviews"
  ON public.product_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = buyer_id AND
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id
      AND o.buyer_id = auth.uid()
      AND o.status = 'delivered'
    )
  );

DROP POLICY IF EXISTS "Buyers can update their own reviews" ON public.product_reviews;
CREATE POLICY "Buyers can update their own reviews"
  ON public.product_reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = buyer_id)
  WITH CHECK (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "Sellers can respond to reviews" ON public.product_reviews;
CREATE POLICY "Sellers can respond to reviews"
  ON public.product_reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = seller_id)
  WITH CHECK (
    auth.uid() = seller_id AND
    seller_response IS NOT NULL
  );

-- 13. RLS Policies for review_helpful_votes
DROP POLICY IF EXISTS "Anyone can view helpful votes" ON public.review_helpful_votes;
CREATE POLICY "Anyone can view helpful votes"
  ON public.review_helpful_votes FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can vote on reviews" ON public.review_helpful_votes;
CREATE POLICY "Users can vote on reviews"
  ON public.review_helpful_votes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their votes" ON public.review_helpful_votes;
CREATE POLICY "Users can update their votes"
  ON public.review_helpful_votes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 14. RLS Policies for escrow_disputes
DROP POLICY IF EXISTS "Buyers and sellers can view their disputes" ON public.escrow_disputes;
CREATE POLICY "Buyers and sellers can view their disputes"
  ON public.escrow_disputes FOR SELECT
  TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

DROP POLICY IF EXISTS "Buyers and sellers can create disputes" ON public.escrow_disputes;
CREATE POLICY "Buyers and sellers can create disputes"
  ON public.escrow_disputes FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = opened_by AND
    (auth.uid() = buyer_id OR auth.uid() = seller_id)
  );

DROP POLICY IF EXISTS "Buyers and sellers can update their disputes" ON public.escrow_disputes;
CREATE POLICY "Buyers and sellers can update their disputes"
  ON public.escrow_disputes FOR UPDATE
  TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id)
  WITH CHECK (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- 15. RLS Policies for dispute_messages
DROP POLICY IF EXISTS "Buyers and sellers can view dispute messages" ON public.dispute_messages;
CREATE POLICY "Buyers and sellers can view dispute messages"
  ON public.dispute_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.escrow_disputes d
      WHERE d.id = dispute_id
      AND (d.buyer_id = auth.uid() OR d.seller_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Buyers and sellers can create dispute messages" ON public.dispute_messages;
CREATE POLICY "Buyers and sellers can create dispute messages"
  ON public.dispute_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.escrow_disputes d
      WHERE d.id = dispute_id
      AND (d.buyer_id = auth.uid() OR d.seller_id = auth.uid())
    )
  );

-- 16. Function to auto-create reward record for new user
CREATE OR REPLACE FUNCTION create_user_reward_record()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_rewards (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create reward record when profile is created
DROP TRIGGER IF EXISTS trigger_create_user_reward_record ON public.profiles;
CREATE TRIGGER trigger_create_user_reward_record
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_user_reward_record();

-- 17. Function to award points and cashback after order delivery
CREATE OR REPLACE FUNCTION award_rewards_after_delivery()
RETURNS TRIGGER AS $$
DECLARE
  reward_record_id uuid;
  points_to_award decimal(12, 2);
  cashback_to_award decimal(12, 2);
  order_final_price decimal(12, 2);
BEGIN
  -- Only process when order status changes to 'delivered'
  IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
    -- Get or create reward record
    SELECT id INTO reward_record_id
    FROM public.user_rewards
    WHERE user_id = NEW.buyer_id;
    
    IF reward_record_id IS NULL THEN
      INSERT INTO public.user_rewards (user_id)
      VALUES (NEW.buyer_id)
      RETURNING id INTO reward_record_id;
    END IF;
    
    -- Calculate rewards (1% cashback, 10 points per 1000 VND)
    order_final_price := NEW.final_price;
    cashback_to_award := order_final_price * 0.01; -- 1% cashback
    points_to_award := FLOOR(order_final_price / 1000) * 10; -- 10 points per 1000 VND
    
    -- Update reward record
    UPDATE public.user_rewards
    SET
      points = points + points_to_award,
      cashback_balance = cashback_balance + cashback_to_award,
      total_points_earned = total_points_earned + points_to_award,
      total_cashback_earned = total_cashback_earned + cashback_to_award,
      updated_at = now()
    WHERE id = reward_record_id;
    
    -- Create reward transaction record
    INSERT INTO public.reward_transactions (
      user_id,
      reward_id,
      transaction_type,
      points_amount,
      cashback_amount,
      source_type,
      source_id,
      description
    )
    VALUES (
      NEW.buyer_id,
      reward_record_id,
      'earn',
      points_to_award,
      cashback_to_award,
      'order',
      NEW.id,
      'Reward for order #' || SUBSTRING(NEW.id::text, 1, 8)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to award rewards when order is delivered
DROP TRIGGER IF EXISTS trigger_award_rewards_after_delivery ON public.orders;
CREATE TRIGGER trigger_award_rewards_after_delivery
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  WHEN (NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered'))
  EXECUTE FUNCTION award_rewards_after_delivery();

-- 18. Function to lock escrow when dispute is opened
CREATE OR REPLACE FUNCTION lock_escrow_on_dispute()
RETURNS TRIGGER AS $$
BEGIN
  -- Update escrow status to 'disputed'
  UPDATE public.escrow_accounts
  SET
    status = 'disputed',
    updated_at = now()
  WHERE id = NEW.escrow_account_id;
  
  -- Update order escrow_status if exists
  IF NEW.order_id IS NOT NULL THEN
    UPDATE public.orders
    SET escrow_status = 'disputed'
    WHERE id = NEW.order_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to lock escrow when dispute is opened
DROP TRIGGER IF EXISTS trigger_lock_escrow_on_dispute ON public.escrow_disputes;
CREATE TRIGGER trigger_lock_escrow_on_dispute
  AFTER INSERT ON public.escrow_disputes
  FOR EACH ROW
  EXECUTE FUNCTION lock_escrow_on_dispute();

-- 19. Function to trigger review notification after delivery
CREATE OR REPLACE FUNCTION notify_review_after_delivery()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process when order status changes to 'delivered'
  IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
    -- Create notification to prompt buyer to review
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      body,
      data
    )
    VALUES (
      NEW.buyer_id,
      'order_delivered',
      'Đơn hàng đã được giao',
      'Hãy đánh giá sản phẩm để nhận điểm thưởng!',
      jsonb_build_object(
        'order_id', NEW.id,
        'product_id', NEW.product_id
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to notify buyer to review after delivery
DROP TRIGGER IF EXISTS trigger_notify_review_after_delivery ON public.orders;
CREATE TRIGGER trigger_notify_review_after_delivery
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  WHEN (NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered'))
  EXECUTE FUNCTION notify_review_after_delivery();

-- 20. Add rating and review_count to products table if not exists
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS rating decimal(3, 2) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
ADD COLUMN IF NOT EXISTS review_count integer DEFAULT 0 CHECK (review_count >= 0);

-- 21. Function to update product rating when review is created/updated
CREATE OR REPLACE FUNCTION update_product_rating()
RETURNS TRIGGER AS $$
DECLARE
  avg_rating numeric;
  total_reviews integer;
BEGIN
  -- Calculate average rating and total reviews
  SELECT
    COALESCE(AVG(rating), 0),
    COUNT(*)
  INTO avg_rating, total_reviews
  FROM public.product_reviews
  WHERE product_id = NEW.product_id
  AND status = 'active';
  
  -- Update product
  UPDATE public.products
  SET
    rating = avg_rating,
    review_count = total_reviews,
    updated_at = now()
  WHERE id = NEW.product_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update product rating
DROP TRIGGER IF EXISTS trigger_update_product_rating_insert ON public.product_reviews;
CREATE TRIGGER trigger_update_product_rating_insert
  AFTER INSERT ON public.product_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_product_rating();

DROP TRIGGER IF EXISTS trigger_update_product_rating_update ON public.product_reviews;
CREATE TRIGGER trigger_update_product_rating_update
  AFTER UPDATE ON public.product_reviews
  FOR EACH ROW
  WHEN (OLD.rating IS DISTINCT FROM NEW.rating OR OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION update_product_rating();

-- 22. Function to update helpful count
CREATE OR REPLACE FUNCTION update_review_helpful_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.product_reviews
    SET helpful_count = helpful_count + 1
    WHERE id = NEW.review_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.is_helpful IS DISTINCT FROM NEW.is_helpful THEN
    IF NEW.is_helpful THEN
      UPDATE public.product_reviews
      SET helpful_count = helpful_count + 1
      WHERE id = NEW.review_id;
    ELSE
      UPDATE public.product_reviews
      SET helpful_count = GREATEST(helpful_count - 1, 0)
      WHERE id = NEW.review_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.is_helpful THEN
      UPDATE public.product_reviews
      SET helpful_count = GREATEST(helpful_count - 1, 0)
      WHERE id = OLD.review_id;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update helpful count
DROP TRIGGER IF EXISTS trigger_update_review_helpful_count ON public.review_helpful_votes;
CREATE TRIGGER trigger_update_review_helpful_count
  AFTER INSERT OR UPDATE OR DELETE ON public.review_helpful_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_review_helpful_count();

-- 23. Create index for product rating
CREATE INDEX IF NOT EXISTS idx_products_rating ON public.products(rating DESC) WHERE rating > 0;

