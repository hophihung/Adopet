-- =====================================================
-- DISABLE AUTO-CREATE PROFILE
-- Chạy script này để TẮT tính năng tự động tạo profile
-- User sẽ phải chọn role thì mới tạo profile
-- =====================================================

-- Xóa trigger nếu đang tồn tại
drop trigger if exists on_auth_user_created on auth.users;

-- Xóa function nếu đang tồn tại
drop function if exists public.handle_new_user();

-- Hoàn tất!
-- Bây giờ user phải chọn role trong app mới tạo được profile
