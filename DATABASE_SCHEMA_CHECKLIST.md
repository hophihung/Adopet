# Database Schema Checklist - Subscription & Pet Creation System

## ✅ Status: ALREADY COMPLETE

Tất cả các tables và columns cần thiết **đã được tạo sẵn** trong migrations! ✨

---

## 📊 Required Tables Overview

### 1. ✅ `profiles` table
**File**: `supabase/migrations/20251022042800_create_profiles_table.sql`

```sql
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  role text CHECK (role IN ('user', 'seller')),
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz,
  updated_at timestamptz
);
```

**Status**: ✅ **Complete** - Không cần thêm column

**Note**: Không có `subscription_id` column trực tiếp trong profiles. Relationship được handle qua `subscriptions.profile_id` (one-to-one).

---

### 2. ✅ `subscriptions` table
**File**: `supabase/migrations/001_create_subscriptions_table.sql`

```sql
CREATE TABLE subscriptions (
  id uuid PRIMARY KEY,
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  plan text CHECK (plan IN ('free', 'premium', 'pro')),
  status text CHECK (status IN ('active', 'canceled', 'expired')),
  start_date timestamptz,
  end_date timestamptz,
  created_at timestamptz,
  updated_at timestamptz
);
```

**Status**: ✅ **Complete** - Tất cả columns đã có

**Columns needed:**
- ✅ `id` - Primary key
- ✅ `profile_id` - Foreign key to profiles
- ✅ `plan` - 'free' | 'premium' | 'pro'
- ✅ `status` - 'active' | 'canceled' | 'expired'
- ✅ `start_date` - Ngày bắt đầu subscription
- ✅ `end_date` - Ngày hết hạn (nullable)
- ✅ `created_at` - Timestamp
- ✅ `updated_at` - Timestamp

---

### 3. ✅ `pets` table
**Files**: 
- `supabase/migration.sql` (base table)
- `supabase/migrations/002_enhance_pets_table.sql` (enhancements)

```sql
CREATE TABLE pets (
  id uuid PRIMARY KEY,
  seller_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text CHECK (type IN ('dog', 'cat', 'hamster', 'bird', 'rabbit', 'other')),
  age_months integer,
  gender text CHECK (gender IN ('male', 'female', 'unknown')),
  description text,
  location text,
  price numeric(10,2),
  images text[], -- Array of image URLs
  is_available boolean DEFAULT true,
  created_at timestamptz,
  updated_at timestamptz,
  
  -- Enhanced fields (from 002_enhance_pets_table.sql)
  breed text,
  weight_kg numeric(5,2),
  color text,
  health_status text,
  vaccination_status text,
  spayed_neutered boolean,
  microchipped boolean,
  house_trained boolean,
  good_with_kids boolean,
  good_with_pets boolean,
  energy_level text,
  size text,
  special_needs text,
  adoption_fee numeric(10,2),
  contact_phone text,
  contact_email text,
  view_count integer DEFAULT 0,
  like_count integer DEFAULT 0,
  is_featured boolean DEFAULT false,
  featured_until timestamptz,
  last_viewed_at timestamptz
);
```

**Status**: ✅ **Complete** - Tất cả columns đã có

---

### 4. ✅ `pet_likes` table
**File**: `supabase/migrations/002_enhance_pets_table.sql`

```sql
CREATE TABLE pet_likes (
  id uuid PRIMARY KEY,
  pet_id uuid REFERENCES pets(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz,
  UNIQUE(pet_id, user_id)
);
```

**Status**: ✅ **Complete**

---

### 5. ✅ `pet_views` table
**File**: `supabase/migrations/002_enhance_pets_table.sql`

```sql
CREATE TABLE pet_views (
  id uuid PRIMARY KEY,
  pet_id uuid REFERENCES pets(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address inet,
  user_agent text,
  viewed_at timestamptz
);
```

**Status**: ✅ **Complete**

---

## 🔧 Database Functions & Triggers

### ✅ Subscription Limit Check (Database Level)

**File**: `supabase/migrations/002_enhance_pets_table.sql`

```sql
-- Function to check pet limit before insert
CREATE FUNCTION check_pet_limit() RETURNS TRIGGER AS $$
DECLARE
  current_count integer;
  user_plan text;
  pet_limit integer;
BEGIN
  -- Get user's subscription plan
  SELECT s.plan INTO user_plan
  FROM subscriptions s
  WHERE s.profile_id = NEW.seller_id
    AND s.status = 'active'
  ORDER BY s.created_at DESC
  LIMIT 1;
  
  -- Default to 'free' if no subscription
  IF user_plan IS NULL THEN
    user_plan := 'free';
  END IF;
  
  -- Set limit based on plan
  CASE user_plan
    WHEN 'free' THEN pet_limit := 4;
    WHEN 'premium' THEN pet_limit := 6;
    WHEN 'pro' THEN pet_limit := 9;
    ELSE pet_limit := 4;
  END CASE;
  
  -- Count current pets
  SELECT COUNT(*) INTO current_count
  FROM pets
  WHERE seller_id = NEW.seller_id;
  
  -- Check limit
  IF current_count >= pet_limit THEN
    RAISE EXCEPTION 'User has reached the pet limit for their subscription plan (%)';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on INSERT
CREATE TRIGGER trigger_check_pet_limit
  BEFORE INSERT ON pets
  FOR EACH ROW
  EXECUTE FUNCTION check_pet_limit();
```

**Status**: ✅ **Complete** - Database-level validation đã có

---

## 🔐 Row Level Security (RLS) Policies

### ✅ Subscriptions RLS

```sql
-- Users can view their own subscription
CREATE POLICY "Users can view their own subscription"
  ON subscriptions FOR SELECT
  USING (profile_id = auth.uid());

-- Users can insert their own subscription
CREATE POLICY "Users can insert their own subscription"
  ON subscriptions FOR INSERT
  WITH CHECK (profile_id = auth.uid());

-- Users can update their own subscription
CREATE POLICY "Users can update their own subscription"
  ON subscriptions FOR UPDATE
  USING (profile_id = auth.uid());
```

**Status**: ✅ **Complete**

### ✅ Pets RLS

```sql
-- Anyone can view pets
CREATE POLICY "Anyone can view pets"
  ON pets FOR SELECT
  USING (true);

-- Authenticated users can create pets (checked by seller_id)
CREATE POLICY "Authenticated users can create pets"
  ON pets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = seller_id);

-- Users can update their own pets
CREATE POLICY "Users can update own pets"
  ON pets FOR UPDATE
  USING (auth.uid() = seller_id);

-- Users can delete their own pets
CREATE POLICY "Users can delete own pets"
  ON pets FOR DELETE
  USING (auth.uid() = seller_id);
```

**Status**: ✅ **Complete**

---

## 📋 Action Items Checklist

### Database Setup
- [x] ✅ Create `profiles` table
- [x] ✅ Create `subscriptions` table
- [x] ✅ Create `pets` table with all required columns
- [x] ✅ Create `pet_likes` table
- [x] ✅ Create `pet_views` table
- [x] ✅ Add indexes for performance
- [x] ✅ Enable RLS on all tables
- [x] ✅ Create RLS policies
- [x] ✅ Create `check_pet_limit()` function
- [x] ✅ Create trigger for pet limit validation
- [x] ✅ Create `update_pet_view_count()` function
- [x] ✅ Create `update_pet_like_count()` function

### Application Code
- [x] ✅ Create `SubscriptionContext`
- [x] ✅ Create `usePetManagement` hook
- [x] ✅ Create `PetService` with limit checks
- [x] ✅ Create `PetLimitBanner` component

### TODO (Not blocking)
- [ ] ⏳ Payment integration (Stripe/PayPal)
- [ ] ⏳ Subscription renewal automation
- [ ] ⏳ Email notifications for subscription expiry
- [ ] ⏳ Analytics dashboard

---

## 🚀 How to Apply Migrations

### Method 1: Supabase Dashboard (Recommended)

1. Go to Supabase Dashboard → SQL Editor
2. Run migrations in order:
   ```
   20251022042800_create_profiles_table.sql
   001_create_subscriptions_table.sql
   002_enhance_pets_table.sql
   ```

### Method 2: Supabase CLI

```bash
# Link your project
supabase link --project-ref your-project-ref

# Apply migrations
supabase db push

# Or run specific migration
supabase db execute --file supabase/migrations/001_create_subscriptions_table.sql
```

---

## 🧪 How to Test the Schema

### 1. Test Pet Limit (Free User)

```sql
-- Create a test subscription (free plan)
INSERT INTO subscriptions (profile_id, plan, status)
VALUES ('your-user-id', 'free', 'active');

-- Try to create 5 pets (should fail on 5th)
INSERT INTO pets (seller_id, name, type, images)
VALUES ('your-user-id', 'Pet 1', 'dog', ARRAY['url1']);
-- ... repeat 4 more times

-- Expected: 5th insert should throw error
-- "User has reached the pet limit for their subscription plan (free)"
```

### 2. Test Subscription Upgrade

```sql
-- Upgrade to premium
UPDATE subscriptions
SET plan = 'premium', updated_at = now()
WHERE profile_id = 'your-user-id';

-- Now can create up to 6 pets total
-- Should be able to create 5th and 6th pet
```

### 3. Test View/Like Count

```sql
-- Track a view
INSERT INTO pet_views (pet_id, user_id)
VALUES ('pet-uuid', 'user-uuid');

-- Check if view_count increased
SELECT view_count FROM pets WHERE id = 'pet-uuid';
-- Should be incremented by trigger

-- Like a pet
INSERT INTO pet_likes (pet_id, user_id)
VALUES ('pet-uuid', 'user-uuid');

-- Check if like_count increased
SELECT like_count FROM pets WHERE id = 'pet-uuid';
```

---

## 📊 Database Relationship Diagram

```
auth.users (Supabase Auth)
    │
    ├──> profiles (1:1)
    │       │
    │       ├──> subscriptions (1:1)
    │       │       └── plan: free/premium/pro
    │       │
    │       └──> pets (1:many)
    │               ├── seller_id → profiles.id
    │               ├──> pet_likes (many)
    │               └──> pet_views (many)
    │
    └──> pet_likes.user_id (many:many with pets)
```

---

## 🎯 Conclusion

### ✅ ALL REQUIRED COLUMNS EXIST

**Bạn KHÔNG cần thêm column nào!** Tất cả đã được implement trong migrations:

1. ✅ `subscriptions` table - Đầy đủ columns cho subscription system
2. ✅ `pets.seller_id` - Foreign key to profiles
3. ✅ Enhanced pet columns - Breed, weight, health status, etc.
4. ✅ `pet_likes` & `pet_views` - Tracking tables
5. ✅ Database triggers - Auto-check pet limits
6. ✅ RLS policies - Security đã được setup

### 📝 Next Steps

1. **Apply migrations** (nếu chưa):
   - Copy SQL vào Supabase Dashboard → SQL Editor
   - Chạy từng file theo thứ tự

2. **Test the system**:
   - Tạo test user với free plan
   - Thử tạo 5 pets (pet thứ 5 sẽ bị block)
   - Upgrade lên premium
   - Verify có thể tạo thêm pets

3. **Integrate payment** (future):
   - Stripe/PayPal for Premium/Pro plans
   - Auto-renewal handling

---

## 📚 Related Files

- **Migrations**: `supabase/migrations/`
- **Context**: `contexts/SubscriptionContext.tsx`
- **Hook**: `src/features/pets/hooks/usePetManagement.tsx`
- **Service**: `src/features/pets/services/pet.service.ts`
- **Flow Doc**: `PET_CREATION_SUBSCRIPTION_FLOW.md`

**All set! 🚀 No additional columns needed.**

