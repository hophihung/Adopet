-- =====================================================
-- REMOVE NOTIFICATIONS AND CREATE ORDERS SYSTEM
-- Xóa notifications table và tạo hệ thống đơn hàng
-- =====================================================

-- 1. Drop notifications table and related functions
DROP TABLE IF EXISTS public.notifications CASCADE;

-- 2. Remove notification references from functions
-- Update create_conversation_on_like to remove notification creation
CREATE OR REPLACE FUNCTION create_conversation_on_like()
RETURNS TRIGGER AS $$
DECLARE
  pet_record RECORD;
  conversation_id uuid;
BEGIN
  -- Fetch pet info
  SELECT p.id,
         p.seller_id,
         p.name,
         p.type,
         p.price,
         p.images,
         COALESCE(p.images[1], NULL) AS thumb
  INTO pet_record
  FROM public.pets p
  WHERE p.id = NEW.pet_id;

  -- Reuse or create conversation
  BEGIN
    SELECT id INTO conversation_id
    FROM public.conversations
    WHERE buyer_id = NEW.user_id
      AND seller_id = pet_record.seller_id
      AND is_active = true
    ORDER BY created_at DESC
    LIMIT 1;

    IF conversation_id IS NULL THEN
      BEGIN
        INSERT INTO public.conversations (pet_id, buyer_id, seller_id)
        VALUES (NEW.pet_id, NEW.user_id, pet_record.seller_id)
        RETURNING id INTO conversation_id;
      EXCEPTION
        WHEN unique_violation THEN
          SELECT id INTO conversation_id
          FROM public.conversations
          WHERE buyer_id = NEW.user_id
            AND seller_id = pet_record.seller_id
            AND is_active = true
          ORDER BY created_at DESC
          LIMIT 1;
      END;
    END IF;
  END;

  -- Insert a rich 'pet_like' message with meta (NO NOTIFICATION)
  INSERT INTO public.messages (conversation_id, sender_id, content, message_type, meta)
  VALUES (
    conversation_id,
    NEW.user_id,
    'đã quan tâm một thú cưng',
    'system',
    jsonb_build_object(
      'pet_id', pet_record.id,
      'name', pet_record.name,
      'type', pet_record.type,
      'price', pet_record.price,
      'thumb', pet_record.thumb,
      'images', pet_record.images
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create orders table for product purchases
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  
  -- Order details
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price decimal(12, 2) NOT NULL CHECK (unit_price >= 0),
  total_price decimal(12, 2) NOT NULL CHECK (total_price >= 0),
  shipping_fee decimal(12, 2) DEFAULT 0 CHECK (shipping_fee >= 0),
  final_price decimal(12, 2) NOT NULL CHECK (final_price >= 0),
  
  -- Shipping info
  shipping_name text NOT NULL,
  shipping_phone text NOT NULL,
  shipping_address text NOT NULL,
  shipping_city text,
  shipping_district text,
  shipping_ward text,
  shipping_note text,
  
  -- Order status
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
  
  -- Payment
  payment_method text DEFAULT 'cod' CHECK (payment_method IN ('cod', 'bank_transfer', 'e_wallet')),
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  payment_transaction_id text, -- Reference to payment transaction if any
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  confirmed_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  
  -- Notes
  buyer_note text,
  seller_note text,
  cancellation_reason text
);

-- 4. Create indexes for orders
CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON public.orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON public.orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_product_id ON public.orders(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

-- 5. Enable RLS for orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for orders
-- Buyers can view their own orders
CREATE POLICY "Buyers can view their own orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (auth.uid() = buyer_id);

-- Sellers can view orders for their products
CREATE POLICY "Sellers can view their product orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (
    auth.uid() = seller_id OR
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'seller'
  );

-- Buyers can create orders
CREATE POLICY "Buyers can create orders"
  ON public.orders FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = buyer_id AND
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_id
      AND p.is_available = true
      AND p.stock_quantity >= quantity
    )
  );

-- Sellers can update their product orders (status, notes)
-- Note: Cannot use OLD in RLS policies, so we allow sellers to update any order they own
CREATE POLICY "Sellers can update their product orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (auth.uid() = seller_id)
  WITH CHECK (auth.uid() = seller_id);

-- Buyers can cancel their pending orders
-- Note: Status check will be done in application logic or trigger
CREATE POLICY "Buyers can update their own orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (auth.uid() = buyer_id)
  WITH CHECK (auth.uid() = buyer_id);

-- 7. Function to update order timestamps
CREATE OR REPLACE FUNCTION update_order_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
    NEW.confirmed_at = now();
  END IF;
  
  IF NEW.status = 'shipped' AND OLD.status != 'shipped' THEN
    NEW.shipped_at = now();
  END IF;
  
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
    NEW.delivered_at = now();
  END IF;
  
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    NEW.cancelled_at = now();
  END IF;
  
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_order_timestamps_trigger
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION update_order_timestamps();

-- 8. Function to update product stock when order is confirmed
CREATE OR REPLACE FUNCTION update_product_stock_on_order()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
    -- Decrease stock
    UPDATE public.products
    SET stock_quantity = stock_quantity - NEW.quantity,
        sales_count = sales_count + NEW.quantity
    WHERE id = NEW.product_id;
  END IF;
  
  -- If order is cancelled and was confirmed, restore stock
  IF NEW.status = 'cancelled' AND OLD.status = 'confirmed' THEN
    UPDATE public.products
    SET stock_quantity = stock_quantity + OLD.quantity,
        sales_count = GREATEST(0, sales_count - OLD.quantity)
    WHERE id = OLD.product_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_product_stock_trigger
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION update_product_stock_on_order();

-- 9. Function to auto-calculate final_price
CREATE OR REPLACE FUNCTION calculate_order_final_price()
RETURNS TRIGGER AS $$
BEGIN
  NEW.final_price = NEW.total_price + NEW.shipping_fee;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_final_price_trigger
  BEFORE INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION calculate_order_final_price();

-- =====================================================
-- COMPLETED! 🎉
-- Notifications removed, Orders system created
-- =====================================================

