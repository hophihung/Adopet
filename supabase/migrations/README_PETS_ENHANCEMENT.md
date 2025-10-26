# 🐾 Pet Table Enhancement Migration

## Tổng quan
Migration này bổ sung các tính năng nâng cao cho bảng `pets` và tạo các bảng liên quan để hỗ trợ hệ thống subscription và quản lý pet tốt hơn.

## 📋 Các thay đổi chính

### 1. **Bảng `pets` - Thêm các cột mới**

#### Thông tin chi tiết về pet:
- `breed` - Giống loài
- `weight_kg` - Cân nặng (kg)
- `color` - Màu sắc
- `size` - Kích thước (small, medium, large, extra_large)
- `energy_level` - Mức độ năng động (low, medium, high)

#### Tình trạng sức khỏe:
- `health_status` - Tình trạng sức khỏe (healthy, sick, vaccinated, needs_attention)
- `vaccination_status` - Tình trạng tiêm phòng (up_to_date, partial, not_vaccinated, unknown)
- `spayed_neutered` - Đã triệt sản chưa
- `microchipped` - Đã cấy chip chưa
- `special_needs` - Nhu cầu đặc biệt

#### Tính cách và hành vi:
- `house_trained` - Đã được huấn luyện trong nhà
- `good_with_kids` - Thân thiện với trẻ em
- `good_with_pets` - Thân thiện với thú cưng khác

#### Thông tin liên hệ và tài chính:
- `adoption_fee` - Phí nhận nuôi
- `contact_phone` - Số điện thoại liên hệ
- `contact_email` - Email liên hệ

#### Thống kê và tính năng nâng cao:
- `view_count` - Số lượt xem
- `like_count` - Số lượt thích
- `is_featured` - Pet nổi bật
- `featured_until` - Thời gian hiển thị nổi bật
- `last_viewed_at` - Lần xem cuối cùng

### 2. **Bảng `pet_likes` - Quản lý lượt thích**
- Theo dõi ai đã thích pet nào
- Tự động cập nhật `like_count` trong bảng pets
- Ngăn chặn duplicate likes

### 3. **Bảng `pet_views` - Theo dõi lượt xem**
- Theo dõi lượt xem pet (có thể ẩn danh)
- Tự động cập nhật `view_count` trong bảng pets
- Lưu thông tin IP và User Agent

### 4. **Functions và Triggers**

#### `check_pet_limit()`
- Kiểm tra giới hạn số lượng pet theo subscription plan
- Tự động chặn tạo pet mới khi đạt giới hạn

#### `update_pet_view_count()`
- Tự động tăng view_count khi có lượt xem mới

#### `update_pet_like_count()`
- Tự động cập nhật like_count khi có like/unlike

### 5. **Indexes cho Performance**
- Index trên các cột thường được query
- Tối ưu hóa tìm kiếm và sắp xếp

### 6. **Row Level Security (RLS)**
- Cập nhật policies để phù hợp với tính năng mới
- Cho phép tất cả authenticated users tạo pet
- Bảo mật dữ liệu likes và views

## 🚀 Cách sử dụng

### 1. **Chạy Migration**
```sql
-- Chạy file migration trong Supabase SQL Editor
-- File: 002_enhance_pets_table.sql
```

### 2. **Sử dụng trong Code**

#### Tạo pet với thông tin chi tiết:
```typescript
const petData = {
  name: "Buddy",
  type: "dog",
  breed: "Golden Retriever",
  age_months: 24,
  weight_kg: 25.5,
  color: "Golden",
  size: "large",
  energy_level: "high",
  health_status: "healthy",
  vaccination_status: "up_to_date",
  spayed_neutered: true,
  house_trained: true,
  good_with_kids: true,
  good_with_pets: true,
  images: ["url1", "url2"],
  // ... other fields
};

await PetService.createPet(userId, petData, subscription.plan);
```

#### Like/Unlike pet:
```typescript
const result = await PetService.toggleLike(petId, userId);
console.log(result.liked); // true/false
```

#### Track view:
```typescript
await PetService.trackView(petId, userId, ipAddress, userAgent);
```

#### Tìm kiếm pet với filters:
```typescript
const pets = await PetService.searchPets({
  type: "dog",
  location: "Hà Nội",
  minPrice: 0,
  maxPrice: 1000000,
  ageRange: { min: 6, max: 24 },
  size: "medium",
  energyLevel: "medium"
});
```

## 📊 Subscription Limits

| Plan | Pet Limit | Images per Pet | Features |
|------|-----------|----------------|----------|
| Free | 4 | 4 | Basic features |
| Premium | 6 | 4 | Advanced features |
| Pro | 9 | 4 | All features + analytics |

## 🔒 Bảo mật

- Tất cả operations đều được bảo vệ bởi RLS
- Users chỉ có thể thao tác với pets của mình
- Likes và views được track an toàn
- Subscription limits được enforce ở database level

## 📈 Performance

- Indexes được tối ưu cho các query thường dùng
- Triggers tự động cập nhật counters
- Realtime subscriptions cho likes và views
- Pagination support cho search results

## 🎯 Tính năng mới

1. **Enhanced Pet Profiles** - Thông tin chi tiết hơn về pet
2. **Like System** - Users có thể like pets
3. **View Tracking** - Theo dõi lượt xem
4. **Featured Pets** - Pet nổi bật
5. **Advanced Search** - Tìm kiếm với nhiều filters
6. **Subscription Enforcement** - Giới hạn theo gói subscription
7. **Analytics** - Thống kê lượt xem và like

## 🔄 Migration Notes

- Migration này tương thích ngược với dữ liệu hiện tại
- Tất cả cột mới đều optional (nullable)
- Không ảnh hưởng đến existing pets
- Có thể rollback nếu cần thiết

## 📝 Next Steps

1. Chạy migration trong Supabase
2. Cập nhật frontend để sử dụng các tính năng mới
3. Test subscription limits
4. Implement advanced search UI
5. Add analytics dashboard
