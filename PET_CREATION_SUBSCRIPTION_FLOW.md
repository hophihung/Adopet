# Pet Creation & Subscription Flow

## 📋 Tổng quan

Hệ thống giới hạn số lượng pet dựa trên **subscription plan** để ngăn người dùng đăng pet quá nhiều và monetize ứng dụng.

---

## 🎯 Subscription Plans & Limits

| Plan | Giá | Giới hạn Pet | Giới hạn Ảnh/Pet | Tính năng khác |
|------|-----|--------------|------------------|----------------|
| **Free** | $0 | 4 pets | 4 ảnh | Basic features |
| **Premium** | $9.99/tháng | 6 pets | 4 ảnh | Priority listing, Analytics |
| **Pro** | $19.99/tháng | 9 pets | 4 ảnh | Featured pets, Advanced analytics |

---

## 🔄 Flow 1: Subscription Management

```
┌──────────────────────────────────────────────────────────────┐
│                    User Onboarding                           │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │  Login Successfully    │
        └───────────┬────────────┘
                    │
                    ▼
        ┌────────────────────────┐
        │  Select Role: Seller   │◄─────── Nếu chọn "Pet Lover"
        └───────────┬────────────┘         thì không cần subscription
                    │
                    ▼
        ┌────────────────────────────────────────┐
        │  Check Subscription Status             │
        │  - Query: subscriptions table          │
        │  - Filter: profile_id = user.id        │
        └───────────┬────────────────────────────┘
                    │
        ┌───────────┴────────────┐
        │                        │
        ▼                        ▼
┌──────────────┐      ┌──────────────────────┐
│ Has Active   │      │ No Subscription      │
│ Subscription │      │                      │
└──────┬───────┘      └──────────┬───────────┘
       │                         │
       │                         ▼
       │              ┌──────────────────────┐
       │              │ Create Free Plan     │
       │              │ - Auto create        │
       │              │ - Default: "free"    │
       │              │ - Limit: 4 pets      │
       │              └──────────┬───────────┘
       │                         │
       └─────────────┬───────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │  Navigate to Home      │
        └────────────────────────┘
```

### Database Schema: `subscriptions`

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id),
  plan TEXT CHECK (plan IN ('free', 'premium', 'pro')),
  status TEXT CHECK (status IN ('active', 'canceled', 'expired')),
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

---

## 🐾 Flow 2: Create Pet (với giới hạn)

```
┌──────────────────────────────────────────────────────────────┐
│              User clicks "Add Pet" Button                    │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────────────────┐
        │  Fetch Subscription & Pet Count    │
        │  1. Get user's subscription plan   │
        │  2. Count current pets (seller_id) │
        │  3. Get limit from plan            │
        └───────────┬────────────────────────┘
                    │
        ┌───────────┴────────────┐
        │                        │
        ▼                        ▼
┌──────────────────┐    ┌──────────────────────┐
│ currentCount     │    │ currentCount >= limit│
│ < limit          │    │ (At Limit)           │
│ (Can Create)     │    │                      │
└─────┬────────────┘    └─────┬────────────────┘
      │                       │
      │                       ▼
      │          ┌────────────────────────────┐
      │          │ Show Error Message         │
      │          │ "Bạn đã đạt giới hạn X     │
      │          │  pet objects. Hãy nâng cấp │
      │          │  gói để tạo thêm!"         │
      │          └────────┬───────────────────┘
      │                   │
      │                   ▼
      │          ┌────────────────────────────┐
      │          │ Show Upgrade Modal         │
      │          │ - Hiện các gói Premium/Pro │
      │          │ - Button: "Nâng cấp ngay"  │
      │          └────────────────────────────┘
      │
      ▼
┌────────────────────────────┐
│ Open Create Pet Form       │
│ - Name                     │
│ - Type (dog/cat/...)       │
│ - Age, Gender              │
│ - Images (max 4)           │
│ - Description              │
│ - Enhanced fields:         │
│   • Breed                  │
│   • Weight                 │
│   • Health status          │
│   • Vaccination status     │
│   • Spayed/Neutered        │
│   • Good with kids/pets    │
│   • Energy level           │
│   • Size                   │
└─────┬──────────────────────┘
      │
      ▼
┌────────────────────────────┐
│ User Fills Form & Submit   │
└─────┬──────────────────────┘
      │
      ▼
┌─────────────────────────────────┐
│ Validation                      │
│ 1. Check images.length <= 4     │
│ 2. Check required fields        │
│ 3. RE-CHECK pet limit (security)│
└─────┬───────────────────────────┘
      │
      ▼
┌─────────────────────────────────┐
│ Insert to Database              │
│ INSERT INTO pets (              │
│   seller_id,                    │
│   name, type, age_months,       │
│   images, description, ...      │
│ )                               │
└─────┬───────────────────────────┘
      │
      ▼
┌─────────────────────────────────┐
│ Success                         │
│ - Update local state            │
│ - Refresh pet limit info        │
│ - Navigate to Pet List          │
└─────────────────────────────────┘
```

---

## 💡 Key Implementation Points

### 1. **Pre-check trước khi mở form**

```typescript path=null start=null
// Hook: usePetManagement.tsx
const { canCreatePet, currentPetCount, petLimit } = usePetManagement();

// Trong component
const handleAddPet = () => {
  if (!canCreatePet) {
    Alert.alert(
      'Đã đạt giới hạn',
      `Bạn đã tạo ${currentPetCount}/${petLimit} pets. Nâng cấp để tạo thêm!`,
      [
        { text: 'Huỷ', style: 'cancel' },
        { text: 'Nâng cấp', onPress: () => router.push('/(auth)/subscription') }
      ]
    );
    return;
  }
  
  // Open create form
  router.push('/create-pet');
};
```

### 2. **Server-side validation (Double check)**

```typescript path=null start=null
// Service: pet.service.ts
async createPet(userId: string, petData: PetCreateData, plan: string) {
  // ALWAYS check limit on server
  const { canCreate, currentCount, limit } = await this.canCreatePet(userId, plan);
  
  if (!canCreate) {
    throw new Error(`Bạn đã đạt giới hạn ${limit} pet objects. Hãy nâng cấp gói để tạo thêm!`);
  }
  
  // Proceed with creation...
}
```

### 3. **Display Pet Limit Banner**

```typescript path=null start=null
// Component: PetLimitBanner.tsx
{petLimitInfo && (
  <PetLimitBanner
    currentCount={petLimitInfo.currentCount}
    limit={petLimitInfo.limit}
    plan={petLimitInfo.plan}
    onUpgrade={() => router.push('/(auth)/subscription')}
  />
)}
```

Banner hiển thị khi:
- **80% limit**: Warning màu vàng
- **100% limit**: Error màu đỏ

---

## 🔐 Security Considerations

### 1. **Row Level Security (RLS)**

```sql
-- Users chỉ có thể tạo pet cho chính mình
CREATE POLICY "Users can insert their own pets"
  ON pets FOR INSERT
  WITH CHECK (seller_id = auth.uid());

-- Users chỉ xem được subscription của mình
CREATE POLICY "Users can view their own subscription"
  ON subscriptions FOR SELECT
  USING (profile_id = auth.uid());
```

### 2. **Backend Validation**

- ✅ **Client check**: UX tốt, ngăn request không cần thiết
- ✅ **Server check**: Security, không thể bypass
- ✅ **Database constraint**: Last line of defense

### 3. **Race Condition Protection**

```typescript path=null start=null
// Use transaction nếu cần
const { data: count } = await supabase
  .from('pets')
  .select('*', { count: 'exact', head: true })
  .eq('seller_id', userId);

// Check trong cùng 1 transaction với insert
if (count >= limit) {
  throw new Error('Limit reached');
}
```

---

## 📊 User Journey Examples

### Scenario 1: Free User tạo pet thứ 4 (OK)
```
1. User đang có 3 pets (Free plan: limit 4)
2. Click "Add Pet" → Pass pre-check
3. Fill form → Submit
4. Server check: 3 < 4 → ✅ Success
5. Pet created, count = 4
```

### Scenario 2: Free User tạo pet thứ 5 (Blocked)
```
1. User đang có 4 pets (Free plan: limit 4)
2. Click "Add Pet" → Show alert:
   "Đã đạt giới hạn 4/4 pets"
3. Button: [Huỷ] [Nâng cấp]
4. Click "Nâng cấp" → Navigate to Subscription screen
5. Choose Premium ($9.99) → Limit increases to 6
6. Now can create 2 more pets
```

### Scenario 3: Premium User downgrade (Edge case)
```
1. User có 6 pets (Premium plan: limit 6)
2. Subscription expires → Auto downgrade to Free
3. Limit giảm xuống 4 (nhưng vẫn giữ 6 pets cũ)
4. Không thể tạo pet mới cho đến khi:
   - Delete 2 pets (6 → 4), HOẶC
   - Nâng cấp lại Premium/Pro
```

**Implementation cho edge case:**
```typescript path=null start=null
// Cho phép xem pets cũ, nhưng block create mới
const canCreate = currentCount < limit; // 6 < 4 = false

// UI: Show all 6 pets, nhưng "Add Pet" button disabled với message
"Bạn có 6 pets nhưng gói Free chỉ cho phép 4. 
 Xoá 2 pets hoặc nâng cấp để tạo mới."
```

---

## 🎨 UI Components Involved

### 1. **PetLimitBanner** (Exists)
- File: `src/features/pets/components/PetLimitBanner.tsx`
- Hiển thị ở Pet List Screen
- Warning khi gần limit (80%)
- Error khi đạt limit (100%)

### 2. **SubscriptionScreen** (Exists)
- File: `app/(auth)/subscription.tsx`
- Hiển thị các gói pricing
- Handle payment (TODO: integrate payment gateway)
- Update subscription plan

### 3. **CreatePetForm** (TODO: check if exists)
- File: Cần kiểm tra trong `app/` hoặc `src/features/pets/`
- Form tạo pet mới
- Pre-check limit trước khi submit

### 4. **PetListScreen** (TODO: check if exists)
- Hiển thị danh sách pets của seller
- Button "Add Pet" với validation
- Hiển thị PetLimitBanner

---

## 🔄 State Management

### Context: `SubscriptionContext`
```typescript path=null start=null
const { 
  subscription,        // Current subscription object
  loading,
  error,
  createSubscription,  // Create new subscription
  upgradeSubscription, // Upgrade to higher plan
  cancelSubscription,  // Cancel subscription
  getPetLimit,         // Get limit for a plan
} = useSubscription();
```

### Hook: `usePetManagement`
```typescript path=null start=null
const {
  userPets,            // Array of user's pets
  petLimitInfo,        // { currentCount, limit, canCreate, plan }
  loading,
  error,
  createPet,           // Create new pet (with limit check)
  deletePet,           // Delete pet
  canCreatePet,        // Boolean: can create or not
  currentPetCount,     // Current number of pets
  petLimit,            // Max allowed pets
} = usePetManagement();
```

---

## 📝 Database Queries

### 1. Get Pet Count
```sql
SELECT COUNT(*) 
FROM pets 
WHERE seller_id = $1;
```

### 2. Get Subscription
```sql
SELECT * 
FROM subscriptions 
WHERE profile_id = $1 
  AND status = 'active';
```

### 3. Create Pet (with check)
```sql
-- Step 1: Check count
SELECT COUNT(*) FROM pets WHERE seller_id = $1;

-- Step 2: If count < limit, insert
INSERT INTO pets (
  seller_id, name, type, images, ...
) VALUES (
  $1, $2, $3, $4, ...
) RETURNING *;
```

---

## ✅ Testing Checklist

- [ ] Free user có thể tạo tối đa 4 pets
- [ ] Premium user có thể tạo tối đa 6 pets
- [ ] Pro user có thể tạo tối đa 9 pets
- [ ] Hiển thị error khi đạt limit
- [ ] Banner warning hiển thị ở 80% limit
- [ ] Banner error hiển thị ở 100% limit
- [ ] Button "Nâng cấp" navigate đúng screen
- [ ] Server-side validation hoạt động (không bypass được)
- [ ] Downgrade subscription handle gracefully (giữ pets cũ nhưng block create mới)
- [ ] Upgrade subscription increase limit ngay lập tức
- [ ] RLS policies hoạt động đúng

---

## 🚀 Future Enhancements

1. **Payment Integration**
   - Stripe/PayPal for Premium/Pro plans
   - Auto-renewal handling
   - Proration khi upgrade mid-cycle

2. **Analytics Dashboard**
   - Pet view count
   - Like/Match statistics
   - Revenue tracking

3. **Featured Pets (Pro plan)**
   - Highlight pets in search
   - Push to top of feed
   - Time-limited featuring

4. **Soft Delete for Pets**
   - Archive thay vì delete
   - Restore trong 30 ngày
   - Count based on active pets only

5. **Grace Period**
   - Cho phép 1-2 days sau khi subscription hết hạn
   - Soft limit warning trước khi hard block

---

## 📚 Related Files

- **Context**: `contexts/SubscriptionContext.tsx`
- **Hook**: `src/features/pets/hooks/usePetManagement.tsx`
- **Service**: `src/features/pets/services/pet.service.ts`
- **Component**: `src/features/pets/components/PetLimitBanner.tsx`
- **Migration**: `supabase/migrations/001_create_subscriptions_table.sql`
- **Screen**: `app/(auth)/subscription.tsx`

---

## 🎯 Kết luận

Hệ thống subscription + pet limit này:
- ✅ Ngăn spam (giới hạn số pet)
- ✅ Monetization (upsell Premium/Pro)
- ✅ Scalable (dễ thêm plan mới)
- ✅ Secure (server validation + RLS)
- ✅ UX tốt (pre-check + clear messaging)

