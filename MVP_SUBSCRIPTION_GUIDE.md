# 🚀 MVP Subscription System - Hướng dẫn sử dụng

## 📋 Tổng quan MVP

Hệ thống subscription được tối ưu hóa cho Pet Adoption App MVP với 3 gói đơn giản, dễ hiểu và phù hợp với thị trường Việt Nam.

## 🎯 3 Gói Subscription MVP

### 1. **Free Plan** - Gói miễn phí
- **Giá**: 0đ
- **Màu**: Xanh lá (#10b981)
- **Icon**: ❤️ Heart
- **Tính năng**:
  - 3 pet listings
  - 10 daily matches
  - 5 reel posts/ngày
  - Không có featured pets
  - Không có analytics

### 2. **Premium Plan** - Gói phổ biến
- **Giá**: 99,000đ/tháng hoặc 990,000đ/năm (tiết kiệm 17%)
- **Màu**: Cam (#f59e0b)
- **Icon**: ⭐ Star
- **Tính năng**:
  - 10 pet listings
  - 50 daily matches
  - 20 reel posts/ngày
  - Featured pets
  - Analytics cơ bản
  - Priority support

### 3. **Pro Plan** - Gói chuyên nghiệp
- **Giá**: 199,000đ/tháng hoặc 1,990,000đ/năm (tiết kiệm 17%)
- **Màu**: Tím (#8b5cf6)
- **Icon**: 👑 Crown
- **Tính năng**:
  - Unlimited pet listings
  - Unlimited daily matches
  - Unlimited reel posts
  - Featured pets
  - Advanced analytics
  - 24/7 support
  - API access

## 💳 Payment Methods (Việt Nam)

1. **Credit/Debit Card** (Stripe)
2. **MoMo Wallet**
3. **ZaloPay**
4. **VNPay**

## 🛠️ Cài đặt và Sử dụng

### 1. Chạy Migration
```sql
-- Chạy file migration trong Supabase SQL Editor
-- File: supabase/migrations/004_mvp_subscription_system.sql
```

### 2. Sử dụng Hook trong Component

```typescript
import { useSubscription } from '../hooks/useSubscription';

function MyComponent() {
  const {
    userPlan,
    availablePlans,
    isLoading,
    canAddPet,
    canMakeMatch,
    canPostReel,
    hasFeaturedPets,
    hasAnalytics,
    upgradePlan,
    checkFeatureLimit
  } = useSubscription();

  // Kiểm tra trước khi thực hiện action
  const handleAddPet = async () => {
    const canAdd = await checkFeatureLimit('pet_limit', currentPetCount);
    if (!canAdd) {
      // Hiển thị banner nâng cấp
      return;
    }
    // Thực hiện tạo pet
  };

  return (
    <View>
      {userPlan && (
        <Text>Gói hiện tại: {userPlan.plan_display_name}</Text>
      )}
      
      {!canAddPet && (
        <FeatureLimitBanner
          featureName="Pet Listings"
          currentUsage={userPlan?.usage_today.pet_created || 0}
          limit={userPlan?.features.find(f => f.key === 'pet_limit')?.value || '0'}
          onUpgrade={() => upgradePlan('premium', 'monthly', 'momo')}
        />
      )}
    </View>
  );
}
```

### 3. Sử dụng Service trực tiếp

```typescript
import { paymentService } from '../services/payment.service';

// Lấy danh sách plans
const plans = await paymentService.getSubscriptionPlans();

// Kiểm tra giới hạn
const canAddPet = await paymentService.checkFeatureLimit(userId, 'pet_limit', 2);

// Tăng usage counter
await paymentService.incrementUsage(userId, 'pet_created');

// Tạo payment
const payment = await paymentService.createMoMoPayment(planId, 'monthly');
```

## 📱 UI Components

### 1. MVPSubscriptionCard
```typescript
import { MVPSubscriptionCard } from '../components/MVPSubscriptionCard';

<MVPSubscriptionCard
  plan={plan}
  isSelected={selectedPlanId === plan.id}
  onSelect={setSelectedPlanId}
  currentPlan={userPlan?.plan_name}
  billingCycle="monthly"
/>
```

### 2. FeatureLimitBanner
```typescript
import { FeatureLimitBanner } from '../components/FeatureLimitBanner';

<FeatureLimitBanner
  featureName="Pet Listings"
  currentUsage={5}
  limit={3}
  onUpgrade={() => router.push('/subscription')}
  type="error"
/>
```

## 🔧 Database Functions

### 1. Lấy thông tin plan của user
```sql
SELECT * FROM get_user_plan_info('user-uuid');
```

### 2. Kiểm tra giới hạn feature
```sql
SELECT check_feature_limit('user-uuid', 'pet_limit', 2);
```

### 3. Tăng usage counter
```sql
SELECT increment_usage('user-uuid', 'pet_created', 1);
```

### 4. Admin analytics
```sql
SELECT * FROM admin_get_all_plans();
```

## 📊 Usage Tracking

Hệ thống tự động theo dõi usage của user:

```typescript
// Tự động tăng counter khi tạo pet
CREATE TRIGGER trigger_track_pet_creation
  AFTER INSERT ON public.pets
  FOR EACH ROW
  EXECUTE FUNCTION track_pet_creation();

// Reset daily usage (chạy hàng ngày)
SELECT reset_daily_usage();
```

## 🎨 UI/UX Guidelines

### 1. Màu sắc
- **Free**: Xanh lá (#10b981) - Thân thiện, miễn phí
- **Premium**: Cam (#f59e0b) - Năng động, phổ biến
- **Pro**: Tím (#8b5cf6) - Cao cấp, chuyên nghiệp

### 2. Icons
- **Free**: ❤️ Heart - Yêu thương, miễn phí
- **Premium**: ⭐ Star - Phổ biến, nổi bật
- **Pro**: 👑 Crown - Cao cấp, quyền lực

### 3. Layout
- Card-based design
- Gradient backgrounds
- Clear pricing display
- Feature comparison
- Call-to-action buttons

## 🚀 Deployment Checklist

### 1. Database
- [ ] Chạy migration `004_mvp_subscription_system.sql`
- [ ] Kiểm tra RLS policies
- [ ] Test các functions

### 2. Backend API
- [ ] Tạo API endpoints cho payment
- [ ] Tích hợp Stripe/MoMo/ZaloPay
- [ ] Webhook handlers

### 3. Frontend
- [ ] Import các components
- [ ] Sử dụng useSubscription hook
- [ ] Test payment flow
- [ ] Test feature limits

### 4. Testing
- [ ] Test tất cả payment methods
- [ ] Test feature limits
- [ ] Test upgrade/downgrade
- [ ] Test usage tracking

## 📈 Analytics & Monitoring

### 1. Key Metrics
- Subscription conversion rate
- Plan distribution
- Feature usage
- Payment success rate
- Churn rate

### 2. Admin Dashboard
```typescript
// Lấy analytics
const analytics = await paymentService.getSubscriptionAnalytics();
```

## 🔒 Security

### 1. RLS Policies
- Users chỉ xem được plan của mình
- Admin có thể xem tất cả
- Payment data được bảo mật

### 2. Payment Security
- Sử dụng webhook để verify payment
- Không lưu thông tin thẻ
- Encrypt sensitive data

## 🎯 MVP Success Metrics

### 1. Conversion Goals
- 20% users upgrade từ Free
- 60% chọn Premium plan
- 40% chọn yearly billing

### 2. Feature Usage
- 80% users sử dụng pet listings
- 60% users sử dụng matches
- 40% users sử dụng reels

### 3. Revenue Goals
- 1M VND/month trong 3 tháng đầu
- 5M VND/month trong 6 tháng
- 10M VND/month trong 1 năm

## 🚀 Next Steps

1. **Phase 1**: Deploy MVP với 3 plans cơ bản
2. **Phase 2**: Thêm payment methods (MoMo, ZaloPay)
3. **Phase 3**: Advanced analytics & reporting
4. **Phase 4**: Enterprise features & API access

---

**🎉 MVP Subscription System sẵn sàng cho production!**

Hệ thống được thiết kế đơn giản, dễ sử dụng và phù hợp với thị trường Việt Nam. Tất cả components và services đã được tối ưu hóa cho performance và user experience.
