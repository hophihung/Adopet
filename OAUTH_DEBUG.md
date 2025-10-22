# 🔧 Debugging Google/Facebook OAuth

## 🔍 Checklist - Kiểm tra từng bước

### ✅ 1. Kiểm tra Supabase Configuration

#### Vào Supabase Dashboard:
1. Truy cập https://app.supabase.com
2. Chọn project của bạn
3. Vào **Authentication** → **Providers**

#### Kiểm tra Google Provider:
- [ ] **Google enabled** = ON (màu xanh)
- [ ] **Client ID (for OAuth)** đã điền đúng
- [ ] **Client Secret (for OAuth)** đã điền đúng
- [ ] **Authorized Client IDs** có thể để trống hoặc thêm iOS/Android Client IDs

#### Kiểm tra Facebook Provider:
- [ ] **Facebook enabled** = ON (màu xanh)  
- [ ] **Facebook client ID** đã điền (App ID từ Facebook)
- [ ] **Facebook client secret** đã điền (App Secret từ Facebook)

### ✅ 2. Kiểm tra Redirect URL

#### URL cần cấu hình:

**Trong Supabase:**
- Site URL: `petadoption://`
- Redirect URLs: `petadoption://auth/callback`

**Trong Google Cloud Console:**
- Authorized redirect URIs: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`

**Trong Facebook App Dashboard:**
- Valid OAuth Redirect URIs: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`

### ✅ 3. Kiểm tra app.json

File `app.json` của bạn:
```json
{
  "expo": {
    "scheme": "petadoption",
    "ios": {
      "infoPlist": {
        "CFBundleURLTypes": [
          {
            "CFBundleURLSchemes": ["petadoption"]
          }
        ]
      }
    },
    "android": {
      "intentFilters": [
        {
          "action": "VIEW",
          "autoVerify": true,
          "data": [{ "scheme": "petadoption" }],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    }
  }
}
```

### ✅ 4. Test OAuth trên platform khác nhau

#### Web (Development):
OAuth **SẼ KHÔNG HOẠT ĐỘNG** trên Expo Go hoặc web development.

#### Android/iOS Real Device:
OAuth **CẦN BUILD** thật (không chạy trên Expo Go)

### ✅ 5. Lỗi thường gặp

#### Lỗi 1: "Invalid OAuth redirect"
**Nguyên nhân:** Redirect URL không khớp

**Giải pháp:**
1. Kiểm tra lại redirect URL trong Supabase
2. Đảm bảo scheme `petadoption://` đúng
3. Restart app sau khi thay đổi

#### Lỗi 2: "OAuth popup không mở"
**Nguyên nhân:** Đang chạy trên Expo Go

**Giải pháp:** 
Build app thật:
```bash
# Android
eas build --platform android --profile development

# iOS
eas build --platform ios --profile development
```

#### Lỗi 3: "Google/Facebook login button không response"
**Nguyên nhân:** Provider chưa được enable trong Supabase

**Giải pháp:**
1. Vào Supabase → Authentication → Providers
2. Enable Google/Facebook
3. Điền Client ID và Secret

#### Lỗi 4: "User không được tạo sau OAuth"
**Nguyên nhân:** Email confirmation enabled

**Giải pháp:**
Vào Supabase → Authentication → Settings → Email Auth:
- Tắt **"Confirm email"** (cho development)

## 🚀 Quick Test - OAuth hoạt động chưa?

### Test 1: Check provider status
```bash
# Vào Supabase SQL Editor và chạy:
SELECT * FROM auth.identities;

# Nếu có data = OAuth providers đang hoạt động
```

### Test 2: Test Google OAuth flow
1. Click "Continue with Google" trong app
2. **EXPECTED**: Browser mở ra với Google login
3. Login Google
4. **EXPECTED**: Redirect về app
5. **EXPECTED**: User được tạo trong Supabase

### Test 3: Check console logs
Trong Expo terminal, xem logs:
```bash
npx expo start
```

Khi click OAuth button, bạn sẽ thấy:
- `Opening OAuth URL: https://...` = OK
- `Error:` = Có lỗi

## 🔧 Advanced Debugging

### Bật debug mode trong AuthContext

Thêm console.log vào `signInWithGoogle`:

```typescript
const signInWithGoogle = async () => {
  console.log('🔵 Starting Google OAuth...');
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'petadoption://auth/callback',
    },
  });
  
  console.log('🔵 OAuth Data:', data);
  console.log('🔴 OAuth Error:', error);
  
  if (error) {
    console.error('🔴 Google OAuth failed:', error);
    throw error;
  }
};
```

### Check Supabase logs

1. Vào Supabase Dashboard
2. Click **Logs** → **Auth Logs**
3. Tìm requests từ OAuth

## 📱 Platform-specific Issues

### Expo Go (Development)
❌ **OAuth KHÔNG hoạt động** trên Expo Go

✅ **Giải pháp:**
- Sử dụng Development Build
- Hoặc test trên simulator/emulator với custom build

### iOS
⚠️ **Yêu cầu:**
- Bundle Identifier phải khớp với Google Cloud Console
- URL Schemes phải được config trong Info.plist

### Android  
⚠️ **Yêu cầu:**
- Package name phải khớp với Google Cloud Console
- SHA-1 fingerprint phải được thêm vào Google Cloud Console

## 🎯 Solution - OAuth cho Development

### Option 1: Sử dụng Email/Password (Recommended cho testing)
Email/Password luôn hoạt động mà không cần config OAuth phức tạp.

### Option 2: Development Build
```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Create development build
eas build --profile development --platform android

# Install và test
```

### Option 3: Test trên Web (Production build)
```bash
# Build production web
npm run build:web

# Deploy và test OAuth
```

## 📝 Recommended Flow cho Development

**Giai đoạn Development:**
1. ✅ Sử dụng Email/Password login
2. ✅ Test tất cả features
3. ✅ UI/UX hoàn chỉnh

**Giai đoạn Production:**
1. ✅ Cấu hình OAuth đầy đủ
2. ✅ Build production
3. ✅ Test OAuth trên real devices

## 🆘 Still Not Working?

### Debug steps:
1. Check Supabase dashboard → Auth logs
2. Check browser console (nếu test trên web)
3. Check Expo terminal logs
4. Verify Supabase env variables:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### Common fix:
```bash
# Clear cache và restart
npx expo start --clear

# Rebuild
rm -rf node_modules
npm install
npx expo start
```

Nếu vẫn không được, hãy sử dụng **Email/Password** cho development và cấu hình OAuth sau khi app đã hoàn thiện! 🎯
