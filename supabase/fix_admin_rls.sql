-- =====================================================
-- FIX: Thêm RLS Policy cho Admin có thể update profiles
-- =====================================================

-- Kiểm tra existing policies
SELECT tablename, policyname, qual, with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY tablename, policyname;

-- Thêm policy cho admin update bất kỳ profile nào
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (
    -- Admin là user có email trong admin list hoặc role = 'admin'
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- Thêm policy cho admin xóa profile
CREATE POLICY "Admins can delete any profile"
  ON public.profiles FOR DELETE
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- Thêm policy cho admin insert profile
CREATE POLICY "Admins can insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );
