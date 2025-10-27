# 🔍 Debug Subscription Issues

## Vấn đề hiện tại:
1. **Không redirect đến subscription page** khi chọn role seller
2. **Banner nâng cấp không hoạt động** - redirect về home thay vì subscription page

## 🔧 Debug Steps:

### 1. Kiểm tra Console Logs
Khi chọn role "Pet Care Provider", bạn sẽ thấy các logs sau:
```
🔵 Creating profile with role: seller
🔵 Profile created successfully
🔵 Returning role: seller
🔵 Created role: seller
🔵 Redirecting seller to subscription page
🔵 Loading subscription plans...
🔵 Loaded plans: 3
🔵 Selected free plan: [plan-id]
```

### 2. Kiểm tra Database
Chạy query này trong Supabase SQL Editor:
```sql
-- Kiểm tra profile được tạo
SELECT id, role, email, created_at 
FROM profiles 
WHERE role = 'seller' 
ORDER BY created_at DESC 
LIMIT 5;

-- Kiểm tra subscription được tạo
SELECT p.role, s.plan, sp.display_name, s.status
FROM profiles p
LEFT JOIN subscriptions s ON p.id = s.profile_id
LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
WHERE p.role = 'seller'
ORDER BY p.created_at DESC
LIMIT 5;

-- Kiểm tra subscription plans
SELECT * FROM subscription_plans WHERE is_active = true;
```

### 3. Kiểm tra Migration
Chạy migration này nếu chưa chạy:
```sql
-- File: 005_auto_create_subscription_for_sellers.sql
```

### 4. Test Manual
1. **Tạo user mới** và chọn role "Pet Care Provider"
2. **Kiểm tra console logs** xem có redirect không
3. **Kiểm tra database** xem có tạo subscription không
4. **Test banner** khi tạo pet và hết limit

## 🚨 Common Issues:

### Issue 1: Không redirect đến subscription
**Nguyên nhân**: Migration chưa chạy hoặc trigger không hoạt động
**Giải pháp**: 
```sql
-- Chạy migration
-- File: 005_auto_create_subscription_for_sellers.sql
```

### Issue 2: Banner redirect về home
**Nguyên nhân**: PetLimitBanner redirect sai path
**Giải pháp**: Đã fix trong code - redirect đến `/subscription` thay vì `/(auth)/subscription`

### Issue 3: Subscription screen không load plans
**Nguyên nhân**: Payment service import sai hoặc database chưa có data
**Giải pháp**: 
```sql
-- Tạo dữ liệu mẫu
INSERT INTO subscription_plans (name, display_name, description, price_monthly, price_yearly, color, icon, is_popular, sort_order) VALUES
('free', 'Free', 'Perfect for getting started', 0, 0, '#10b981', 'heart', false, 1),
('premium', 'Premium', 'Most popular choice', 99000, 990000, '#f59e0b', 'star', true, 2),
('pro', 'Pro', 'For power users', 199000, 1990000, '#8b5cf6', 'crown', false, 3)
ON CONFLICT (name) DO NOTHING;
```

## 🎯 Expected Behavior:

### Khi chọn role "Pet Care Provider":
1. ✅ Tạo profile với role 'seller'
2. ✅ Tạo free subscription (trigger)
3. ✅ Redirect đến subscription page
4. ✅ Load 3 plans (Free, Premium, Pro)
5. ✅ Mặc định chọn Free plan
6. ✅ Click Continue → Redirect to filter-pets

### Khi tạo pet và hết limit:
1. ✅ Hiển thị banner cảnh báo
2. ✅ Click "Nâng cấp" → Redirect đến `/subscription`
3. ✅ Chọn plan và upgrade

## 🔧 Quick Fix Commands:

```sql
-- 1. Tạo dữ liệu mẫu plans
INSERT INTO subscription_plans (name, display_name, description, price_monthly, price_yearly, color, icon, is_popular, sort_order) VALUES
('free', 'Free', 'Perfect for getting started', 0, 0, '#10b981', 'heart', false, 1),
('premium', 'Premium', 'Most popular choice', 99000, 990000, '#f59e0b', 'star', true, 2),
('pro', 'Pro', 'For power users', 199000, 1990000, '#8b5cf6', 'crown', false, 3)
ON CONFLICT (name) DO NOTHING;

-- 2. Tạo features cho free plan
INSERT INTO plan_features (plan_id, feature_key, feature_name, feature_value, feature_type, description, icon, sort_order)
SELECT 
  sp.id,
  'pet_limit',
  'Pet Listings',
  '3',
  'number',
  'Maximum pets you can list',
  'paw-print',
  1
FROM subscription_plans sp 
WHERE sp.name = 'free'
ON CONFLICT DO NOTHING;

-- 3. Kiểm tra trigger
SELECT * FROM pg_trigger WHERE tgname = 'trigger_auto_create_subscription_for_seller';
```

## 📱 Test Flow:

1. **Logout** khỏi app
2. **Tạo account mới** hoặc login với account khác
3. **Chọn role "Pet Care Provider"**
4. **Kiểm tra console logs** và database
5. **Test banner** khi tạo pet

---

**🎉 Sau khi fix, seller sẽ được redirect đến subscription page và banner sẽ hoạt động đúng!**
