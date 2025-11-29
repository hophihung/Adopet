-- =====================================================
-- Thêm role 'admin' vào profiles table
-- =====================================================

-- 1. Cập nhật constraint check
ALTER TABLE public.profiles 
DROP CONSTRAINT profiles_role_check;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role in ('user', 'seller', 'admin'));

-- 2. Tạo một admin test (nếu cần)
-- INSERT INTO public.profiles (id, role, email, full_name)
-- VALUES (
--   'your-user-id-here',
--   'admin',
--   'admin@adopet.com',
--   'Admin User'
-- )
-- ON CONFLICT (id) DO UPDATE SET role = 'admin';

-- 3. Kiểm tra profiles hiện tại
SELECT id, role, email, full_name FROM public.profiles LIMIT 10;
