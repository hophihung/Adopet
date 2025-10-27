# 🔧 Fix: Seller Subscription Auto-Creation

## Vấn đề đã được giải quyết

Khi user chọn role "seller" lần đầu đăng nhập, hệ thống không tự động tạo subscription và không redirect đến trang subscription.

## ✅ Giải pháp đã implement

### 1. **Database Migration** (`005_auto_create_subscription_for_sellers.sql`)

#### **Tự động tạo subscription cho seller:**
```sql
-- Trigger tự động tạo free subscription khi tạo profile với role 'seller'
CREATE TRIGGER trigger_auto_create_subscription_for_seller
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_subscription_for_seller();
```

#### **Function đảm bảo seller có subscription:**
```sql
-- Function để kiểm tra và tạo subscription cho seller hiện tại
CREATE OR REPLACE FUNCTION ensure_seller_has_subscription(user_profile_id uuid)
```

#### **Function kiểm tra redirect:**
```sql
-- Function để kiểm tra có nên redirect đến subscription page không
CREATE OR REPLACE FUNCTION should_redirect_to_subscription(user_profile_id uuid)
```

### 2. **AuthContext Updates**

#### **Cập nhật createProfile:**
```typescript
const createProfile = async (role: 'user' | 'seller') => {
  // ... existing code ...
  
  // Return role để component có thể xử lý redirect
  return role;
};
```

#### **Cập nhật fetchProfile:**
```typescript
// Nếu là seller và chưa có subscription, đảm bảo tạo free subscription
if (data && data.role === 'seller') {
  await supabase.rpc('ensure_seller_has_subscription', {
    user_profile_id: userId
  });
}
```

### 3. **Select Role Screen Updates**

#### **Redirect logic:**
```typescript
const handleSelectRole = async (role: 'user' | 'seller') => {
  const createdRole = await createProfile(role);
  
  // Nếu là seller, redirect đến subscription page
  if (createdRole === 'seller') {
    router.replace('/(auth)/subscription');
  } else {
    // Nếu là user, redirect đến filter screen
    router.replace('/(auth)/filter-pets');
  }
};
```

### 4. **New Subscription Screen** (`app/(auth)/subscription.tsx`)

- Màn hình chọn subscription plan cho seller mới
- Hiển thị 3 gói: Free, Premium, Pro
- Toggle monthly/yearly billing
- Mặc định chọn Free plan
- Có thể skip payment trong MVP

### 5. **Auth Layout Updates**

```typescript
// Thêm subscription screen vào auth stack
<Stack.Screen name="subscription" />
```

## 🚀 Flow mới cho Seller

### **Khi seller đăng ký lần đầu:**

1. **Login/Register** → Chọn role "Pet Care Provider"
2. **Auto-create profile** với role 'seller'
3. **Auto-create free subscription** (trigger)
4. **Redirect to subscription page** để chọn plan
5. **Continue** → Redirect to filter-pets hoặc main app

### **Khi seller đăng nhập lại:**

1. **Login** → Load profile
2. **Check subscription** → Đảm bảo có free subscription
3. **Redirect to main app** (không cần chọn plan lại)

## 📱 UI/UX Improvements

### **Subscription Screen Features:**
- ✅ Beautiful gradient background
- ✅ Plan cards với pricing
- ✅ Monthly/Yearly toggle
- ✅ Popular plan highlighting
- ✅ Feature comparison
- ✅ Continue button
- ✅ Help text

### **Plan Cards:**
- **Free Plan**: Xanh lá + Heart icon
- **Premium Plan**: Cam + Star icon (Popular)
- **Pro Plan**: Tím + Crown icon

## 🔧 Cách deploy

### 1. **Chạy Migration:**
```sql
-- Chạy file migration trong Supabase SQL Editor
-- File: supabase/migrations/005_auto_create_subscription_for_sellers.sql
```

### 2. **Test Flow:**
1. Tạo user mới
2. Chọn role "Pet Care Provider"
3. Kiểm tra có redirect đến subscription page
4. Kiểm tra có tạo free subscription trong database
5. Test continue flow

### 3. **Verify Database:**
```sql
-- Kiểm tra subscription được tạo
SELECT p.role, s.plan, sp.display_name
FROM profiles p
LEFT JOIN subscriptions s ON p.id = s.profile_id
LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
WHERE p.role = 'seller';
```

## 🎯 Kết quả

### **Trước khi fix:**
- Seller chọn role → Redirect to filter-pets
- Không có subscription
- Không có plan management

### **Sau khi fix:**
- Seller chọn role → Redirect to subscription page
- Auto-create free subscription
- Có thể chọn upgrade plan
- Full subscription management

## 🔍 Debug Commands

### **Kiểm tra subscription của user:**
```sql
SELECT * FROM get_user_subscription_info('user-uuid');
```

### **Kiểm tra có nên redirect:**
```sql
SELECT should_redirect_to_subscription('user-uuid');
```

### **Force create subscription:**
```sql
SELECT ensure_seller_has_subscription('user-uuid');
```

---

**🎉 Seller subscription flow đã được fix hoàn toàn!**

Bây giờ khi seller đăng ký lần đầu, họ sẽ được redirect đến trang subscription để chọn plan, và hệ thống sẽ tự động tạo free subscription cho họ.
