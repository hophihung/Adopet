# Hướng dẫn sử dụng hệ thống Subscription Plans mới

## Cấu trúc Database mới

### 1. Bảng `subscription_plans`
Lưu thông tin các gói subscription:
- `id`: UUID primary key
- `name`: Tên plan ('free', 'premium', 'pro')
- `display_name`: Tên hiển thị ('Free Plan', 'Premium Plan', 'Pro Plan')
- `description`: Mô tả plan
- `price_monthly`: Giá hàng tháng
- `price_yearly`: Giá hàng năm
- `currency`: Đơn vị tiền tệ (mặc định 'VND')
- `is_active`: Trạng thái active
- `sort_order`: Thứ tự sắp xếp

### 2. Bảng `plan_features`
Lưu các tính năng của từng plan:
- `id`: UUID primary key
- `plan_id`: Foreign key đến subscription_plans
- `feature_key`: Key của tính năng ('pet_limit', 'post_limit', etc.)
- `feature_name`: Tên hiển thị của tính năng
- `feature_value`: Giá trị của tính năng
- `feature_type`: Loại giá trị ('number', 'boolean', 'text', 'unlimited')
- `description`: Mô tả tính năng

### 3. Bảng `subscriptions` (đã cập nhật)
- Thêm cột `plan_id` để tham chiếu đến subscription_plans
- Giữ nguyên cột `plan` (text) để backward compatibility

## Các Function hữu ích

### 1. `get_user_plan_info(user_profile_id)`
Lấy thông tin đầy đủ về plan của user:

```sql
-- Lấy thông tin plan của user
SELECT * FROM get_user_plan_info('user-uuid-here');
```

Kết quả:
```json
{
  "plan_name": "premium",
  "plan_display_name": "Premium Plan",
  "plan_price_monthly": 99000,
  "plan_price_yearly": 990000,
  "features": [
    {
      "key": "pet_limit",
      "name": "Pet Limit",
      "value": "6",
      "type": "number",
      "description": "Maximum number of pets you can list"
    },
    {
      "key": "featured_pets",
      "name": "Featured Pets",
      "value": "true",
      "type": "boolean",
      "description": "Can feature pets in search results"
    }
  ]
}
```

### 2. `check_user_feature_limit(user_profile_id, feature_key, current_count)`
Kiểm tra xem user có thể thực hiện action dựa trên giới hạn plan:

```sql
-- Kiểm tra user có thể thêm pet không
SELECT check_user_feature_limit('user-uuid', 'pet_limit', 3); -- true nếu < limit

-- Kiểm tra user có thể tạo post không
SELECT check_user_feature_limit('user-uuid', 'post_limit', 5); -- true nếu < limit

-- Kiểm tra user có tính năng featured pets không
SELECT check_user_feature_limit('user-uuid', 'featured_pets', 0); -- true nếu có tính năng
```

## Ví dụ sử dụng trong TypeScript/JavaScript

### 1. Lấy thông tin plan của user
```typescript
import { supabase } from './lib/supabase';

async function getUserPlanInfo(userId: string) {
  const { data, error } = await supabase
    .rpc('get_user_plan_info', { user_profile_id: userId });
  
  if (error) throw error;
  return data[0];
}

// Sử dụng
const planInfo = await getUserPlanInfo('user-uuid');
console.log('Plan:', planInfo.plan_display_name);
console.log('Features:', planInfo.features);
```

### 2. Kiểm tra giới hạn trước khi thực hiện action
```typescript
async function canUserAddPet(userId: string, currentPetCount: number): Promise<boolean> {
  const { data, error } = await supabase
    .rpc('check_user_feature_limit', {
      user_profile_id: userId,
      feature_key: 'pet_limit',
      current_count: currentPetCount
    });
  
  if (error) throw error;
  return data;
}

// Sử dụng trước khi tạo pet mới
const canAdd = await canUserAddPet('user-uuid', 3);
if (!canAdd) {
  throw new Error('Bạn đã đạt giới hạn pet cho plan hiện tại');
}
```

### 3. Lấy danh sách tất cả plans
```typescript
async function getAllPlans() {
  const { data, error } = await supabase
    .from('subscription_plans')
    .select(`
      *,
      plan_features (*)
    `)
    .eq('is_active', true)
    .order('sort_order');
  
  if (error) throw error;
  return data;
}
```

### 4. Kiểm tra tính năng cụ thể
```typescript
async function hasFeature(userId: string, featureKey: string): Promise<boolean> {
  const { data, error } = await supabase
    .rpc('check_user_feature_limit', {
      user_profile_id: userId,
      feature_key: featureKey,
      current_count: 0
    });
  
  if (error) throw error;
  return data;
}

// Kiểm tra các tính năng
const canFeaturePets = await hasFeature('user-uuid', 'featured_pets');
const hasAnalytics = await hasFeature('user-uuid', 'analytics');
const hasPrioritySupport = await hasFeature('user-uuid', 'priority_support');
```

## Lợi ích của hệ thống mới

### 1. **Linh hoạt hơn**
- Dễ dàng thêm plan mới mà không cần sửa code
- Có thể thay đổi tính năng của plan mà không cần migration
- Hỗ trợ nhiều loại tính năng (number, boolean, text, unlimited)

### 2. **Dễ quản lý**
- Tất cả thông tin plan được centralize
- Có thể quản lý qua admin panel
- Dễ dàng A/B testing các plan khác nhau

### 3. **Performance tốt hơn**
- Index được tối ưu cho các query thường dùng
- Function được cache để tăng tốc độ
- Realtime support cho các thay đổi

### 4. **Scalable**
- Có thể thêm unlimited features
- Hỗ trợ multi-currency
- Có thể mở rộng cho enterprise features

## Migration từ hệ thống cũ

Hệ thống mới vẫn giữ backward compatibility với cột `plan` (text) cũ, nhưng khuyến khích sử dụng `plan_id` mới.

### Bước 1: Chạy migration
```sql
-- Chạy file 003_normalize_subscription_plans.sql trong Supabase SQL Editor
```

### Bước 2: Cập nhật code
- Thay thế các query sử dụng `plan` text bằng `plan_id`
- Sử dụng các function mới để kiểm tra tính năng
- Cập nhật UI để hiển thị thông tin plan đầy đủ

### Bước 3: Test
- Test tất cả các tính năng liên quan đến subscription
- Đảm bảo các giới hạn hoạt động đúng
- Kiểm tra performance của các query mới
