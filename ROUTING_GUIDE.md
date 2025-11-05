# 🗺️ Routing Guide - Cấu trúc Navigation mới

## 📱 Cấu trúc App (Nested Tabs)

### Main Tabs (Bottom Bar - 4 tabs):

```
/(tabs)/
├── home/                    # 🏠 Trang chủ
│   ├── index.tsx           # Match (default)
│   ├── community.tsx       # Cộng đồng
│   ├── explore.tsx         # Khám phá
│   └── reel.tsx            # Reels (hidden)
├── pets/                    # 🐾 Pets
│   ├── my-pets.tsx         # My Pets
│   └── virtual-pet.tsx     # Virtual Pet
├── activity/                # ⚡ Hoạt động
│   ├── chat.tsx            # Chat
│   └── reminders.tsx       # Reminders
└── profile.tsx             # 👤 Cá nhân
```

## 🔄 Route Mapping

### Chuyển đổi từ cấu trúc cũ:

| Cũ | Mới | Notes |
|---|---|---|
| `/(tabs)` | `/(tabs)/home` | Home group (default: Match) |
| `/explore` | `/(tabs)/home/explore` | Nested trong home |
| `/reel` | `/(tabs)/home/reel` | Nested trong home (hidden) |
| `/chat` | `/(tabs)/activity/chat` | Nested trong activity |
| `/reminders` | `/(tabs)/activity/reminders` | Nested trong activity |
| `/my-pets` | `/(tabs)/pets/my-pets` | Nested trong pets |
| `/virtual-pet` | `/(tabs)/pets/virtual-pet` | Nested trong pets |
| `/profile` | `/(tabs)/profile` | Root level (không đổi) |

### Stack Routes (không đổi):

- `/pet/[id]` - Pet detail
- `/pet/create-pet` - Create pet
- `/edit-pet/[id]` - Edit pet
- `/post/create-post` - Create post
- `/post/edit-post` - Edit post
- `/post/post-detail` - Post detail
- `/reminder/create-reminder` - Create reminder
- `/reminder/edit-reminder` - Edit reminder
- `/(auth)/login` - Login
- `/(auth)/select-role` - Select role
- `/(auth)/filter-pets` - Filter pets
- `/(auth)/subscription` - Subscription

## 🎯 Navigation Examples

### Trong code:

```typescript
import { useRouter } from 'expo-router';

const router = useRouter();

// Navigate to home (match)
router.push('/(tabs)/home');
router.replace('/(tabs)/home');

// Navigate to explore
router.push('/(tabs)/home/explore');
router.replace('/(tabs)/home/explore');

// Navigate to chat
router.push('/(tabs)/activity/chat');

// Navigate to virtual pet
router.push('/(tabs)/pets/virtual-pet');

// Navigate to pet detail (stack route)
router.push(`/pet/${petId}`);
```

## 🔐 Authentication Flow

```
Login → Select Role → Filter Pets → /(tabs)/home
```

### Redirect paths:
- `/(auth)/login` - Login screen
- `/(auth)/select-role` - Select role (required)
- `/(auth)/filter-pets` - Filter pets (optional)
- `/(tabs)/home` - Main app (after onboarding)

## 📝 Notes

1. **Default route**: `/(tabs)/home` → Shows `home/index.tsx` (Match screen)
2. **Nested navigation**: Mỗi tab group có layout riêng với nested tabs
3. **Hidden routes**: `reel` được ẩn khỏi tab bar (href: null)
4. **Stack routes**: Các routes như `/pet/[id]` là stack routes, không nằm trong tabs

## ✅ Đã cập nhật

- ✅ `app/_layout.tsx` - Redirect to `/(tabs)/home`
- ✅ `app/(auth)/filter-pets.tsx` - Redirect to `/(tabs)/home`
- ✅ `app/subscription.tsx` - Redirect to `/(tabs)/home`
- ✅ `app/(tabs)/home/index.tsx` - Navigation paths
- ✅ `app/(tabs)/home/explore.tsx` - Navigation paths
- ✅ `FLOW.md` - Updated với cấu trúc mới

## 🐛 Troubleshooting

### Lỗi: Route không tìm thấy
- Kiểm tra file đã được move vào đúng folder chưa
- Kiểm tra tên file khớp với route path

### Lỗi: Tab không hiển thị
- Kiểm tra `_layout.tsx` của tab group có đúng không
- Kiểm tra `href: null` nếu muốn ẩn tab

