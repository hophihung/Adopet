-- =====================================================
-- SUPABASE DATABASE MIGRATION
-- Pet Adoption App
-- =====================================================

-- Enable UUID extension (nếu chưa có)
create extension if not exists "uuid-ossp";

-- =====================================================
-- TABLE: profiles
-- Lưu thông tin user và role (user hoặc seller)
-- =====================================================
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  role text check (role in ('user', 'seller')) default 'user',
  email text,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable Row Level Security
alter table public.profiles enable row level security;

-- Policy: Users có thể đọc profile của mọi người
create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using (true);

-- Policy: Users chỉ có thể update profile của chính họ
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Policy: Users có thể insert profile của chính họ
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- =====================================================
-- FUNCTION: Tự động tạo profile khi user đăng ký
-- TẮT ĐI - Không tự động tạo profile
-- User phải chọn role thì mới tạo profile
-- =====================================================
-- create or replace function public.handle_new_user()
-- returns trigger as $$
-- begin
--   insert into public.profiles (id, email, full_name, avatar_url)
--   values (
--     new.id,
--     new.email,
--     coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
--     new.raw_user_meta_data->>'avatar_url'
--   );
--   return new;
-- end;
-- $$ language plpgsql security definer;

-- =====================================================
-- TRIGGER: TẮT - Không tự động tạo profile
-- =====================================================
-- drop trigger if exists on_auth_user_created on auth.users;
-- create trigger on_auth_user_created
--   after insert on auth.users
--   for each row execute function public.handle_new_user();

-- =====================================================
-- FUNCTION: Cập nhật updated_at timestamp
-- =====================================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- =====================================================
-- TRIGGER: Tự động update timestamp khi profile thay đổi
-- =====================================================
drop trigger if exists on_profile_updated on public.profiles;
create trigger on_profile_updated
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- =====================================================
-- TABLE: pets (optional - để mở rộng sau này)
-- =====================================================
create table if not exists public.pets (
  id uuid default uuid_generate_v4() primary key,
  seller_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  type text check (type in ('dog', 'cat', 'hamster', 'bird', 'rabbit', 'other')) not null,
  age_months integer,
  gender text check (gender in ('male', 'female', 'unknown')),
  description text,
  location text,
  price numeric(10, 2),
  images text[], -- Array of image URLs
  is_available boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.pets enable row level security;

-- Policy: Mọi người có thể xem pets có sẵn
create policy "Pets are viewable by everyone"
  on public.pets for select
  using (is_available = true or auth.uid() = seller_id);

-- Policy: Seller có thể tạo pet của mình
create policy "Sellers can create pets"
  on public.pets for insert
  with check (
    auth.uid() = seller_id and
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'seller'
    )
  );

-- Policy: Seller có thể update pet của mình
create policy "Sellers can update own pets"
  on public.pets for update
  using (auth.uid() = seller_id);

-- Policy: Seller có thể delete pet của mình
create policy "Sellers can delete own pets"
  on public.pets for delete
  using (auth.uid() = seller_id);

-- Trigger cho pets updated_at
drop trigger if exists on_pet_updated on public.pets;
create trigger on_pet_updated
  before update on public.pets
  for each row execute function public.handle_updated_at();

-- =====================================================
-- TABLE: matches (tương tự Tinder - user swipe pet)
-- =====================================================
create table if not exists public.matches (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  pet_id uuid references public.pets(id) on delete cascade not null,
  liked boolean not null, -- true = like, false = pass
  created_at timestamp with time zone default now(),
  unique(user_id, pet_id)
);

alter table public.matches enable row level security;

-- Policy: Users chỉ có thể xem matches của mình
create policy "Users can view own matches"
  on public.matches for select
  using (auth.uid() = user_id);

-- Policy: Users có thể tạo match của mình
create policy "Users can create own matches"
  on public.matches for insert
  with check (auth.uid() = user_id);

-- =====================================================
-- TABLE: reels (video ngắn về pets)
-- =====================================================
create table if not exists public.reels (
  id uuid default uuid_generate_v4() primary key,
  pet_id uuid references public.pets(id) on delete cascade,
  seller_id uuid references public.profiles(id) on delete cascade not null,
  video_url text not null,
  thumbnail_url text,
  caption text,
  views_count integer default 0,
  likes_count integer default 0,
  created_at timestamp with time zone default now()
);

alter table public.reels enable row level security;

-- Policy: Mọi người có thể xem reels
create policy "Reels are viewable by everyone"
  on public.reels for select
  using (true);

-- Policy: Sellers có thể tạo reels
create policy "Sellers can create reels"
  on public.reels for insert
  with check (
    auth.uid() = seller_id and
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'seller'
    )
  );

-- Policy: Sellers có thể update reels của mình
create policy "Sellers can update own reels"
  on public.reels for update
  using (auth.uid() = seller_id);

-- =====================================================
-- INDEXES để tăng performance
-- =====================================================
create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_pets_seller_id on public.pets(seller_id);
create index if not exists idx_pets_type on public.pets(type);
create index if not exists idx_pets_is_available on public.pets(is_available);
create index if not exists idx_matches_user_id on public.matches(user_id);
create index if not exists idx_matches_pet_id on public.matches(pet_id);
create index if not exists idx_reels_seller_id on public.reels(seller_id);
create index if not exists idx_reels_pet_id on public.reels(pet_id);

-- =====================================================
-- HOÀN TẤT!
-- Chạy script này trong Supabase SQL Editor
-- =====================================================
