-- =====================================================
-- ENABLE REALTIME FOR NEW TABLES
-- Bật realtime cho các bảng mới: profiles, products, orders, reel_products
-- =====================================================

-- Function to safely add table to realtime publication
DO $$
BEGIN
  -- Enable realtime for profiles (for avatar/name updates)
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;

  -- Enable realtime for products (for seller product management)
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'products'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
  END IF;

  -- Enable realtime for orders (for order status updates)
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;

  -- Enable realtime for reel_products (for product tags on reels)
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'reel_products'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reel_products;
  END IF;
END $$;

-- Note: reels, reel_likes, reel_comments đã được enable trong migration 013_create_reels_system.sql

