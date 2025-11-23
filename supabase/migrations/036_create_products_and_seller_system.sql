-- =====================================================
-- CREATE PRODUCTS AND SELLER SYSTEM
-- Hệ thống bán hàng cho seller, đính kèm sản phẩm trên video
-- =====================================================

-- 1. Tạo bảng product_categories (phân loại sản phẩm)
CREATE TABLE IF NOT EXISTS public.product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE, -- Tên danh mục (VD: "Thức ăn", "Đồ chơi", "Phụ kiện")
  name_en text, -- Tên tiếng Anh (optional)
  description text,
  icon_url text, -- Icon cho category
  display_order integer DEFAULT 0, -- Thứ tự hiển thị
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Tạo bảng products (sản phẩm)
CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.product_categories(id) ON DELETE SET NULL,
  
  -- Thông tin sản phẩm
  name text NOT NULL,
  description text,
  price decimal(12, 2) NOT NULL CHECK (price >= 0),
  original_price decimal(12, 2) CHECK (original_price >= 0), -- Giá gốc (nếu có giảm giá)
  currency text DEFAULT 'VND',
  
  -- Hình ảnh
  image_url text, -- Ảnh chính
  image_urls text[], -- Mảng ảnh phụ
  
  -- Thông tin bán hàng
  stock_quantity integer DEFAULT 0 CHECK (stock_quantity >= 0), -- Số lượng tồn kho
  is_available boolean DEFAULT true, -- Còn hàng không
  is_featured boolean DEFAULT false, -- Sản phẩm nổi bật
  
  -- Thông tin vận chuyển
  shipping_fee decimal(12, 2) DEFAULT 0 CHECK (shipping_fee >= 0),
  estimated_delivery_days integer DEFAULT 3, -- Số ngày giao hàng dự kiến
  
  -- Metadata
  tags text[], -- Tags để tìm kiếm
  views_count integer DEFAULT 0,
  sales_count integer DEFAULT 0, -- Số lượng đã bán
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraints
  CONSTRAINT valid_price CHECK (original_price IS NULL OR original_price >= price)
);

-- 3. Tạo bảng reel_products (quan hệ many-to-many giữa reels và products)
CREATE TABLE IF NOT EXISTS public.reel_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reel_id uuid NOT NULL REFERENCES public.reels(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  
  -- Vị trí tag trên video (tọa độ x, y trong video frame)
  position_x decimal(5, 2) DEFAULT 50, -- 0-100 (percentage)
  position_y decimal(5, 2) DEFAULT 50, -- 0-100 (percentage)
  
  -- Thời gian hiển thị tag (seconds)
  start_time decimal(6, 2) DEFAULT 0, -- Thời điểm bắt đầu hiển thị (giây)
  end_time decimal(6, 2), -- Thời điểm kết thúc hiển thị (giây, null = hiển thị đến hết video)
  
  -- Thứ tự hiển thị (nếu có nhiều sản phẩm trên 1 video)
  display_order integer DEFAULT 0,
  
  created_at timestamptz DEFAULT now(),
  
  -- Unique constraint: một sản phẩm chỉ có thể được đính kèm 1 lần trên 1 reel
  UNIQUE(reel_id, product_id)
);

-- 4. Tạo indexes cho performance
CREATE INDEX IF NOT EXISTS idx_products_seller_id ON public.products(seller_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_is_available ON public.products(is_available);
CREATE INDEX IF NOT EXISTS idx_products_is_featured ON public.products(is_featured);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reel_products_reel_id ON public.reel_products(reel_id);
CREATE INDEX IF NOT EXISTS idx_reel_products_product_id ON public.reel_products(product_id);
CREATE INDEX IF NOT EXISTS idx_reel_products_display_order ON public.reel_products(reel_id, display_order);

-- 5. Enable RLS
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reel_products ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies cho product_categories (public read)
CREATE POLICY "Anyone can view product categories"
  ON public.product_categories FOR SELECT
  USING (true);

-- 7. RLS Policies cho products
-- Anyone can view available products
CREATE POLICY "Anyone can view available products"
  ON public.products FOR SELECT
  USING (is_available = true);

-- Sellers can view their own products (including unavailable)
CREATE POLICY "Sellers can view own products"
  ON public.products FOR SELECT
  USING (
    auth.uid() = seller_id OR
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'seller'
  );

-- Only sellers can insert products
CREATE POLICY "Only sellers can create products"
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = seller_id AND
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'seller'
  );

-- Sellers can only update their own products
CREATE POLICY "Sellers can update own products"
  ON public.products FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = seller_id AND
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'seller'
  )
  WITH CHECK (
    auth.uid() = seller_id AND
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'seller'
  );

-- Sellers can only delete their own products
CREATE POLICY "Sellers can delete own products"
  ON public.products FOR DELETE
  TO authenticated
  USING (
    auth.uid() = seller_id AND
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'seller'
  );

-- 8. RLS Policies cho reel_products
-- Anyone can view reel products
CREATE POLICY "Anyone can view reel products"
  ON public.reel_products FOR SELECT
  USING (true);

-- Only reel owners (sellers) can add products to their reels
CREATE POLICY "Reel owners can add products to reels"
  ON public.reel_products FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.reels r
      JOIN public.profiles p ON r.user_id = p.id
      WHERE r.id = reel_id
      AND r.user_id = auth.uid()
      AND p.role = 'seller'
    )
    AND EXISTS (
      SELECT 1 FROM public.products pr
      WHERE pr.id = product_id
      AND pr.seller_id = auth.uid()
    )
  );

-- Reel owners can update products on their reels
CREATE POLICY "Reel owners can update reel products"
  ON public.reel_products FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.reels r
      WHERE r.id = reel_id
      AND r.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.reels r
      WHERE r.id = reel_id
      AND r.user_id = auth.uid()
    )
  );

-- Reel owners can remove products from their reels
CREATE POLICY "Reel owners can delete reel products"
  ON public.reel_products FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.reels r
      WHERE r.id = reel_id
      AND r.user_id = auth.uid()
    )
  );

-- 9. Insert default product categories
INSERT INTO public.product_categories (name, name_en, description, display_order) VALUES
  ('Thức ăn', 'Food', 'Thức ăn cho thú cưng', 1),
  ('Đồ chơi', 'Toys', 'Đồ chơi cho thú cưng', 2),
  ('Phụ kiện', 'Accessories', 'Phụ kiện cho thú cưng', 3),
  ('Chăm sóc', 'Care', 'Sản phẩm chăm sóc sức khỏe', 4),
  ('Quần áo', 'Clothing', 'Quần áo cho thú cưng', 5),
  ('Vận chuyển', 'Transport', 'Đồ dùng vận chuyển', 6),
  ('Khác', 'Other', 'Sản phẩm khác', 7)
ON CONFLICT (name) DO NOTHING;

-- 10. Function để tự động cập nhật updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_product_categories_updated_at
  BEFORE UPDATE ON public.product_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 11. Function để tăng views_count khi xem sản phẩm
CREATE OR REPLACE FUNCTION increment_product_views(product_uuid uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.products
  SET views_count = views_count + 1
  WHERE id = product_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMPLETED! 🎉
-- Products and seller system is ready
-- =====================================================

