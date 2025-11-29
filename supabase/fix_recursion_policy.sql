-- =====================================================
-- FIX: Xóa RLS policies gây infinite recursion
-- =====================================================

-- Xóa tất cả policies cũ gây vòng lặp
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow admins to update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete any profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;

-- Tạo policies mới đơn giản - không gây recursion
-- 1. SELECT: Cho phép tất cả người dùng đã xác thực xem profiles
CREATE POLICY "Authenticated users can view profiles"
  ON public.profiles FOR SELECT
  USING (auth.role() = 'authenticated');

-- 2. UPDATE: User chỉ có thể update profile của chính họ
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 3. DELETE: User chỉ có thể xóa profile của chính họ  
CREATE POLICY "Users can delete own profile"
  ON public.profiles FOR DELETE
  USING (auth.uid() = id);

-- 4. INSERT: Cho phép xác thực người dùng insert
CREATE POLICY "Authenticated users can insert profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Kiểm tra policies
SELECT policyname, qual, with_check, cmd 
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;
