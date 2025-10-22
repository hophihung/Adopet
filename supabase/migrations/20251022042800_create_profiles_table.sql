/*
  # Tạo bảng profiles cho Pet Adoption App
  
  1. Bảng mới
    - `profiles`
      - `id` (uuid, primary key, tham chiếu auth.users)
      - `role` (text, 'user' hoặc 'seller', mặc định 'user')
      - `email` (text, lưu email để dễ truy vấn)
      - `full_name` (text, tên người dùng)
      - `avatar_url` (text, URL ảnh đại diện)
      - `created_at` (timestamptz, thời gian tạo)
      - `updated_at` (timestamptz, thời gian cập nhật)
  
  2. Bảo mật
    - Bật RLS trên bảng `profiles`
    - Policy cho phép user đọc profile của chính họ
    - Policy cho phép user cập nhật profile của chính họ
    - Policy cho phép authenticated user tạo profile khi đăng ký
    - Policy cho phép user đọc profiles của những user khác (để xem thông tin seller)
*/

-- Tạo bảng profiles
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text CHECK (role IN ('user', 'seller')) DEFAULT 'user',
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Bật Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users có thể đọc tất cả profiles (để xem thông tin người khác)
CREATE POLICY "Users can view all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: User có thể insert profile của chính họ khi đăng ký lần đầu
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Policy: User chỉ có thể cập nhật profile của chính họ
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy: User chỉ có thể xóa profile của chính họ
CREATE POLICY "Users can delete own profile"
  ON profiles
  FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- Tạo function để tự động cập nhật updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger tự động cập nhật updated_at khi có thay đổi
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();