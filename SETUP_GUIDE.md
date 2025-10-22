# 🐾 Pet Adoption App - Setup Guide Đầy Đủ

Hướng dẫn cài đặt và cấu hình hoàn chỉnh cho Pet Adoption App sử dụng Expo SDK 54 và Supabase.

## 📋 Tổng quan

App Pet Adoption được xây dựng với:
- **Expo SDK 54** (React Native 0.81)
- **Supabase** cho backend, database và authentication
- **Expo Router** cho navigation
- **React Native Paper** cho UI components
- **TypeScript** cho type safety

## ✨ Tính năng

- ✅ Đăng nhập Email/Password
- ✅ Đăng nhập Google OAuth
- ✅ Đăng nhập Facebook OAuth
- ✅ Chọn role (User/Seller)
- ✅ Filter pet preferences
- ✅ Match screen (Tinder-style)
- ✅ Reels screen (TikTok-style)
- ✅ Auto-login với AsyncStorage
- ✅ Row Level Security policies

## 🚀 Cài đặt nhanh

### 1. Cài đặt dependencies
```bash
npm install
```

### 2. Khởi chạy app
```bash
npm run dev
```

Sau đó:
- Nhấn `i` để mở iOS simulator
- Nhấn `a` để mở Android emulator
- Quét QR code bằng Expo Go app trên điện thoại thật

## 🔐 Cấu hình Supabase Authentication

### A. Cấu hình Email/Password Authentication

Email/Password authentication đã được kích hoạt mặc định trong Supabase. Bạn có thể sử dụng ngay!

**Test thử:**
1. Mở app và chọn "Đăng ký"
2. Nhập email và mật khẩu
3. Chọn role (User hoặc Seller)
4. Hoàn thành!

### B. Cấu hình Google OAuth

#### Bước 1: Tạo Google OAuth Client

1. Truy cập [Google Cloud Console](https://console.cloud.google.com/)
2. Tạo project mới hoặc chọn project có sẵn
3. Vào **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth client ID**

#### Bước 2: Cấu hình OAuth Consent Screen

1. Chọn **External** user type
2. Điền thông tin app:
   - App name: `Pet Adoption`
   - User support email: email của bạn
   - Developer contact: email của bạn
3. Thêm scopes: `email`, `profile`, `openid`
4. Thêm test users nếu app đang ở chế độ testing

#### Bước 3: Tạo OAuth Client IDs

Bạn cần tạo 3 OAuth clients:

**3.1. Web Application (cho Supabase callback)**
- Application type: **Web application**
- Name: `Pet Adoption Web`
- Authorized redirect URIs:
  ```
  https://fftiuqnuiuvkubiktjhf.supabase.co/auth/v1/callback
  ```
- Copy **Client ID** và **Client Secret**

**3.2. iOS Application**
- Application type: **iOS**
- Name: `Pet Adoption iOS`
- Bundle ID: `com.petadoption.app`
- Copy **Client ID**

**3.3. Android Application**
- Application type: **Android**
- Name: `Pet Adoption Android`
- Package name: `com.petadoption.app`
- SHA-1 certificate fingerprint (để lấy SHA-1):
  ```bash
  # Debug keystore
  keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
  ```
- Copy **Client ID**

#### Bước 4: Cấu hình Supabase

1. Vào [Supabase Dashboard](https://app.supabase.com)
2. Chọn project của bạn
3. Vào **Authentication** > **Providers**
4. Tìm **Google** và click để cấu hình
5. Bật **Google enabled**
6. Nhập thông tin:
   - **Client ID (for OAuth)**: Web Client ID từ bước 3.1
   - **Client Secret (for OAuth)**: Web Client Secret từ bước 3.1
7. (Tùy chọn) Thêm iOS và Android Client IDs vào phần Advanced:
   - iOS Client ID: từ bước 3.2
   - Android Client ID: từ bước 3.3
8. Click **Save**

#### Bước 5: Cập nhật app.json (nếu cần)

File `app.json` đã được cấu hình sẵn với scheme `myapp`. Nếu bạn muốn đổi:

```json
{
  "expo": {
    "scheme": "petadoption",
    "ios": {
      "bundleIdentifier": "com.petadoption.app"
    },
    "android": {
      "package": "com.petadoption.app"
    }
  }
}
```

### C. Cấu hình Facebook OAuth

#### Bước 1: Tạo Facebook App

1. Truy cập [Facebook Developers](https://developers.facebook.com/)
2. Click **My Apps** > **Create App**
3. Chọn use case: **Authenticate and request data from users with Facebook Login**
4. Điền thông tin:
   - App name: `Pet Adoption`
   - App contact email: email của bạn
5. Click **Create App**

#### Bước 2: Thêm Facebook Login

1. Trong dashboard của app, click **Add Product**
2. Tìm **Facebook Login** và click **Set Up**
3. Chọn platform:
   - **iOS** và **Android** cho mobile app

#### Bước 3: Cấu hình iOS

1. Vào **Facebook Login** > **Settings**
2. Enable **Single Sign On**
3. Trong **Valid OAuth Redirect URIs**, thêm:
   ```
   https://fftiuqnuiuvkubiktjhf.supabase.co/auth/v1/callback
   myapp://
   ```
4. Bundle ID: `com.petadoption.app`

#### Bước 4: Cấu hình Android

1. Package Name: `com.petadoption.app`
2. Class Name: `com.petadoption.app.MainActivity`
3. Key Hashes (để lấy key hash):
   ```bash
   # macOS/Linux
   keytool -exportcert -alias androiddebugkey -keystore ~/.android/debug.keystore | openssl sha1 -binary | openssl base64

   # Password: android
   ```

#### Bước 5: Cấu hình Supabase

1. Vào **Settings** > **Basic** trong Facebook App Dashboard
2. Copy **App ID** và **App Secret**
3. Vào [Supabase Dashboard](https://app.supabase.com)
4. Chọn project > **Authentication** > **Providers**
5. Tìm **Facebook** và cấu hình:
   - Bật **Facebook enabled**
   - **Facebook client ID**: App ID từ Facebook
   - **Facebook client secret**: App Secret từ Facebook
6. Click **Save**

#### Bước 6: Thêm Redirect URIs

Trong Facebook App Dashboard:
1. Vào **Facebook Login** > **Settings**
2. **Valid OAuth Redirect URIs**:
   ```
   https://fftiuqnuiuvkubiktjhf.supabase.co/auth/v1/callback
   myapp://
   ```
3. **Save Changes**

## 📱 Cấu trúc thư mục

```
project/
├── app/
│   ├── _layout.tsx          # Root layout với AuthProvider và navigation logic
│   ├── login.tsx            # Màn hình đăng nhập (Email/Google/Facebook)
│   ├── select-role.tsx      # Màn hình chọn role (User/Seller)
│   ├── filter-pet.tsx       # Màn hình lọc thú cưng
│   └── (tabs)/
│       ├── _layout.tsx      # Tab navigation
│       ├── index.tsx        # Match tab (Tinder-style)
│       └── reel.tsx         # Reel tab (TikTok-style)
├── contexts/
│   └── AuthContext.tsx      # Auth context với Supabase
├── lib/
│   └── supabase.ts         # Supabase client configuration
└── .env                     # Environment variables
```

## 🔑 Environment Variables

File `.env` đã được cấu hình sẵn với Supabase credentials:

```env
EXPO_PUBLIC_SUPABASE_URL=https://fftiuqnuiuvkubiktjhf.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

## 🗄️ Database Schema

### Table: `profiles`

```sql
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text CHECK (role IN ('user', 'seller')) DEFAULT 'user',
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Row Level Security (RLS) đã được kích hoạt:**
- Users có thể xem tất cả profiles
- Users chỉ có thể tạo, sửa, xóa profile của chính họ

## 🔄 Authentication Flow

1. **Lần đầu mở app:**
   - User → Login Screen

2. **Sau khi đăng nhập thành công:**
   - Kiểm tra có profile chưa?
   - **Chưa có**: Select Role → Filter Pet → Main (Tabs)
   - **Có rồi**: Main (Tabs) trực tiếp

3. **Main Screen (Tabs):**
   - **Match Tab**: Swipe thú cưng như Tinder
   - **Reel Tab**: Xem video ngắn như TikTok

## 🧪 Testing

### Test Email/Password Auth
```bash
# Không cần cấu hình gì thêm
# Đăng ký tài khoản mới ngay trong app
```

### Test Google OAuth
```bash
# Cần hoàn thành cấu hình Google OAuth ở trên
# Sau đó click "Đăng nhập với Google" trong app
```

### Test Facebook OAuth
```bash
# Cần hoàn thành cấu hình Facebook OAuth ở trên
# Sau đó click "Đăng nhập với Facebook" trong app
```

## 🚨 Troubleshooting

### Lỗi: "Invalid OAuth callback URL"
- Kiểm tra redirect URI trong Google/Facebook console
- Đảm bảo URL Supabase chính xác: `https://fftiuqnuiuvkubiktjhf.supabase.co/auth/v1/callback`

### Lỗi: "OAuth client not found"
- Kiểm tra Client ID và Client Secret trong Supabase
- Đảm bảo đã Save settings trong Supabase Dashboard

### Lỗi: "Scheme not found"
- Kiểm tra `scheme` trong `app.json`
- Rebuild app sau khi thay đổi scheme

### OAuth không hoạt động trên device thật
- Đảm bảo đã thêm iOS/Android Client IDs trong Google Console
- Đảm bảo Bundle ID và Package name khớp với cấu hình
- Với Android, kiểm tra SHA-1 fingerprint

## 📚 Resources

- [Expo Documentation](https://docs.expo.dev/)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Google OAuth Setup](https://developers.google.com/identity/protocols/oauth2)
- [Facebook Login Setup](https://developers.facebook.com/docs/facebook-login)

## 💡 Tips

1. **Development**: OAuth có thể không hoạt động tốt trên Expo Go. Cân nhắc build development client:
   ```bash
   npx expo run:ios
   npx expo run:android
   ```

2. **Testing OAuth**: Sử dụng test users trong Google/Facebook console khi app chưa public

3. **Deep Linking**: Scheme `myapp://` đã được cấu hình. Có thể đổi thành tên app của bạn

4. **Security**: Không commit `.env` file lên Git (đã có trong `.gitignore`)

## 🎉 Hoàn thành!

App của bạn đã sẵn sàng! Chạy `npm run dev` và bắt đầu phát triển.

**Happy Coding! 🚀🐾**
