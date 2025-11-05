# 🐾 Pet Adoption App - User Flow

## 📱 Onboarding Flow (User mới)

```
┌─────────────┐
│   Login     │  Email/Google/Facebook
└──────┬──────┘
       │
       ▼
┌─────────────┐
│Select Role  │  Pet Lover / Pet Care Provider
│             │  (KHÔNG THỂ SKIP)
└──────┬──────┘
       │ (Tự động sau khi chọn)
       ▼
┌─────────────┐
│ Pet Filter  │  Chọn sở thích về pet
│             │  (Có thể Skip)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Home Screen │  Match & Reels tabs
│   (Tabs)    │
└─────────────┘
```

## 🔄 Returning User Flow

```
┌─────────────┐
│  App Start  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Auto Login  │  Từ AsyncStorage
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Home Screen │  Trực tiếp vào app
│   (Tabs)    │
└─────────────┘
```

## 🔐 Authentication States

### State 1: Chưa đăng nhập
- **Điều kiện**: `user === null`
- **Action**: Redirect to `/(auth)/login`
- **Screen**: Login Screen

### State 2: Đã login, chưa có profile
- **Điều kiện**: `user !== null && profile === null`
- **Action**: Redirect to `/(auth)/select-role`
- **Screen**: Select Role Screen
- **Note**: KHÔNG THỂ skip, phải chọn role

### State 3: Có profile, chưa complete onboarding
- **Điều kiện**: `user !== null && profile !== null && !hasCompletedOnboarding`
- **Action**: Redirect to `/(auth)/filter-pets`
- **Screen**: Pet Filter Screen
- **Note**: Có thể skip bằng nút "Skip for now"

### State 4: Đã hoàn thành tất cả
- **Điều kiện**: `user !== null && profile !== null && hasCompletedOnboarding === true`
- **Action**: Access `/(tabs)` (Home)
- **Screen**: Main App

## 💾 Data Storage

### AsyncStorage Keys:
- `onboarding_completed`: `'true'` | `'false'`
  - Được set khi user complete Pet Filter screen
  - Reset về `'false'` khi tạo profile mới

### Supabase Database:
- `profiles` table:
  - `id` (uuid) - Foreign key to auth.users
  - `role` ('user' | 'seller')
  - `email`, `full_name`, `avatar_url`
  - `created_at`, `updated_at`

## 🎯 Navigation Logic

```typescript
// app/_layout.tsx

if (!user) {
  // State 1: Chưa login
  → /(auth)/login
}
else if (!profile) {
  // State 2: Đã login, chưa có profile
  → /(auth)/select-role
}
else if (!hasCompletedOnboarding) {
  // State 3: Có profile, chưa complete onboarding
  → /(auth)/filter-pets
}
else {
  // State 4: Hoàn thành
  → /(tabs)/home - Home (Match screen)
}
```

## 📱 App Structure (Nested Tabs)

### Main Tabs (Bottom Bar - 4 tabs):
1. **/(tabs)/home** - Trang chủ
   - Nested: Match (index) | Community | Explore | Reel (hidden)
2. **/(tabs)/pets** - Pets
   - Nested: My Pets | Virtual Pet
3. **/(tabs)/activity** - Hoạt động
   - Nested: Chat | Reminders
4. **/(tabs)/profile** - Cá nhân

### Route Mapping:

| Old Path | New Path | Notes |
|----------|----------|-------|
| `/(tabs)` | `/(tabs)/home` | Home group (default: Match) |
| `/explore` | `/(tabs)/home/explore` | Nested trong home |
| `/reel` | `/(tabs)/home/reel` | Nested trong home (hidden) |
| `/chat` | `/(tabs)/activity/chat` | Nested trong activity |
| `/reminders` | `/(tabs)/activity/reminders` | Nested trong activity |
| `/my-pets` | `/(tabs)/pets/my-pets` | Nested trong pets |
| `/virtual-pet` | `/(tabs)/pets/virtual-pet` | Nested trong pets |
| `/profile` | `/(tabs)/profile` | Root level |

## 🚫 Prevent Skipping

### Select Role Screen:
- ❌ KHÔNG có nút Skip
- ✅ Phải click vào 1 trong 2 cards
- ✅ Tự động navigate sau khi chọn
- ✅ Show loading khi đang tạo profile

### Pet Filter Screen:
- ✅ CÓ nút "Skip for now"
- ✅ Cả "Continue" và "Skip" đều mark onboarding complete
- ✅ Navigate tới Home sau khi click

## 🔧 Testing Flow

### Test 1: User mới đăng nhập lần đầu
1. ✅ Mở app → Thấy Login screen
2. ✅ Login thành công → Redirect to Select Role
3. ✅ Click "Pet Lover" → Loading → Redirect to Pet Filter
4. ✅ Click "Continue" hoặc "Skip" → Redirect to Home
5. ✅ Close app và mở lại → Tự động vào Home (không qua onboarding)

### Test 2: User đã có account
1. ✅ Mở app → Tự động login → Vào Home trực tiếp
2. ✅ Không thấy Select Role hay Pet Filter

### Test 3: Clear data và login lại
1. ✅ Clear AsyncStorage
2. ✅ Login → Không thấy Select Role (vì đã có profile)
3. ✅ Thấy Pet Filter (vì onboarding_completed = false)
4. ✅ Complete → Vào Home

## 📝 Notes

- Select Role screen sử dụng `router.replace()` để không thể back
- Pet Filter cũng dùng `router.replace()` để không back về Select Role
- Navigation logic trong `_layout.tsx` tự động handle tất cả cases
- Không cần manual navigation trong screens (trừ khi user action)

## 🐛 Troubleshooting

### Vấn đề: Bị loop giữa các screens
**Giải pháp**: Check `currentScreen` để tránh navigate lại screen hiện tại

### Vấn đề: Sau khi login vẫn thấy Select Role mỗi lần
**Nguyên nhân**: Profile không được lưu đúng trong Supabase
**Giải pháp**: Check Supabase trigger `on_auth_user_created`

### Vấn đề: Không thể skip Pet Filter
**Giải pháp**: Đảm bảo `completeOnboarding()` được gọi trong `handleSkip()`
