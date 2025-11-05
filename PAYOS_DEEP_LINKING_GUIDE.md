# PayOS Deep Linking Setup Guide

## 📱 Deep Linking là gì?

Deep Linking cho phép PayOS redirect về app của bạn sau khi thanh toán thành công hoặc bị hủy.

**Flow:**
```
User thanh toán trên PayOS
    ↓
PayOS xử lý thanh toán
    ↓
PayOS redirect về: petadoption://payment-success (hoặc payment-cancel)
    ↓
App của bạn mở và xử lý kết quả
```

## 🔧 Cấu hình URL Scheme

### 1. URL Scheme trong `app.json`

Trong file `app.json`, bạn đã có:
```json
{
  "expo": {
    "scheme": "petadoption"
  }
}
```

Điều này có nghĩa là app của bạn có thể nhận deep links với format:
- `petadoption://payment-success`
- `petadoption://payment-cancel`
- `petadoption://anything`

### 2. Cấu hình trong `.env`

```env
# PayOS Return URLs
EXPO_PUBLIC_PAYOS_RETURN_URL=petadoption://payment-success
EXPO_PUBLIC_PAYOS_CANCEL_URL=petadoption://payment-cancel
```

**Lưu ý:**
- URL scheme (`petadoption://`) phải khớp với `scheme` trong `app.json`
- Phần sau `://` là path, bạn có thể đặt bất kỳ (ví dụ: `payment-success`, `pay-success`, etc.)

## 🎯 Cách hoạt động

### Khi thanh toán thành công:
1. User thanh toán trên PayOS
2. PayOS redirect về: `petadoption://payment-success`
3. Hệ điều hành (iOS/Android) nhận diện scheme `petadoption://`
4. Mở app của bạn và truyền URL vào
5. App xử lý deep link và hiển thị kết quả

### Khi thanh toán bị hủy:
1. User nhấn "Hủy" trên PayOS
2. PayOS redirect về: `petadoption://payment-cancel`
3. App của bạn mở và hiển thị thông báo hủy

## 📝 Xử lý Deep Link trong App

### Option 1: Sử dụng Expo Linking (Khuyến nghị)

Tạo file `app/payment-handler.tsx`:

```typescript
import { useEffect } from 'react';
import { Linking } from 'react-native';
import { useRouter } from 'expo-router';

export default function PaymentHandler() {
  const router = useRouter();

  useEffect(() => {
    // Xử lý deep link khi app mở từ PayOS
    const handleDeepLink = (event: { url: string }) => {
      const { url } = event;
      
      if (url.includes('payment-success')) {
        // Thanh toán thành công
        // Có thể lấy transaction_id từ URL nếu cần
        router.push('/(tabs)/me');
        // Hoặc show success screen
      } else if (url.includes('payment-cancel')) {
        // Thanh toán bị hủy
        router.back();
        // Hoặc show cancel screen
      }
    };

    // Lắng nghe deep link khi app đang mở
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Kiểm tra nếu app mở từ deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return null; // Component này không render gì
}
```

### Option 2: Sử dụng Expo Router (Auto-handling)

Nếu bạn dùng Expo Router, có thể tạo routes:
- `app/payment-success.tsx` - Xử lý khi thanh toán thành công
- `app/payment-cancel.tsx` - Xử lý khi thanh toán bị hủy

## 🔍 Kiểm tra Deep Link

### Test trên iOS Simulator:
```bash
xcrun simctl openurl booted "petadoption://payment-success"
```

### Test trên Android:
```bash
adb shell am start -W -a android.intent.action.VIEW -d "petadoption://payment-success" com.petadoption.app
```

### Test trên thiết bị thật:
1. Build app và cài trên thiết bị
2. Mở browser và nhập: `petadoption://payment-success`
3. App sẽ mở và xử lý deep link

## ⚠️ Lưu ý quan trọng

1. **Scheme phải khớp:**
   - `app.json`: `"scheme": "petadoption"`
   - `.env`: `petadoption://payment-success`
   - Không được dùng `adopet://` nếu scheme là `petadoption`

2. **Rebuild app sau khi đổi scheme:**
   ```bash
   npx expo prebuild --clean
   npx expo run:ios
   # hoặc
   npx expo run:android
   ```

3. **Expo Go không hỗ trợ deep linking:**
   - Cần build development client hoặc production build
   - Deep linking chỉ hoạt động trên app đã build

## 📚 Tài liệu tham khảo

- [Expo Linking](https://docs.expo.dev/guides/linking/)
- [Expo Router Deep Linking](https://docs.expo.dev/router/introduction/#linking)
- [PayOS Payment Flow](https://payos.vn/docs/)

