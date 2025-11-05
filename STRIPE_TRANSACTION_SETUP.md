# Stripe Transaction Payment Setup Guide

Hướng dẫn tích hợp Stripe Payment cho transactions trong chat.

## 📋 Tổng quan

Khi người mua quét thú cưng trong chat và nhận transaction code, họ có thể:
1. **Thanh toán bằng thẻ qua Stripe** (tự động, an toàn)
2. **Chuyển khoản thủ công** (upload ảnh chứng từ)

## 🚀 Bước 1: Cài đặt Dependencies

### 1.1 Cài đặt Stripe React Native

```bash
npm install @stripe/stripe-react-native
```

### 1.2 iOS Setup (nếu dùng iOS)

```bash
cd ios
pod install
cd ..
```

## 🔑 Bước 2: Cấu hình Stripe Keys

### 2.1 Lấy Stripe Keys từ Dashboard

1. Đăng nhập vào [Stripe Dashboard](https://dashboard.stripe.com/)
2. Vào **Developers > API keys**
3. Copy **Publishable key** (test mode cho sandbox)
4. Copy **Secret key** (cho backend)

### 2.2 Thêm vào .env

```env
# Stripe Configuration
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...  # Chỉ dùng ở backend
```

## 📱 Bước 3: Khởi tạo Stripe trong App

Cập nhật `app/_layout.tsx` hoặc app root:

```typescript
import { StripeProvider } from '@stripe/stripe-react-native';
import { STRIPE_CONFIG } from '@/src/config/stripe.config';

export default function RootLayout() {
  return (
    <StripeProvider publishableKey={STRIPE_CONFIG.publishableKey}>
      {/* Your app content */}
    </StripeProvider>
  );
}
```

## 🔧 Bước 4: Tạo Supabase Edge Function

### 4.1 Tạo Edge Function

Tạo file `supabase/functions/create-transaction-payment-intent/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

serve(async (req) => {
  try {
    const { transaction_id, amount, currency = 'vnd' } = await req.json();

    // Validate input
    if (!transaction_id || !amount) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount), // Stripe requires integer
      currency: currency,
      metadata: {
        transaction_id: transaction_id,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return new Response(
      JSON.stringify({
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error creating payment intent:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

### 4.2 Deploy Edge Function

```bash
supabase functions deploy create-transaction-payment-intent
```

### 4.3 Set Environment Variables

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
```

## 💳 Bước 5: Cập nhật StripeTransactionPaymentSheet

Uncomment các phần code đã được đánh dấu `TODO` trong:
- `src/features/chat/components/StripeTransactionPaymentSheet.tsx`

Cụ thể:

```typescript
// Uncomment these imports
import { useStripe, usePaymentSheet } from '@stripe/stripe-react-native';

// Uncomment in component
const { initPaymentSheet, presentPaymentSheet } = usePaymentSheet();
const stripe = useStripe();

// Uncomment in initializePaymentSheet
const { error } = await initPaymentSheet({
  merchantDisplayName: 'AdoPet',
  paymentIntentClientSecret: intent.client_secret,
  returnURL: 'adopet://payment-return',
  defaultBillingDetails: {
    name: 'Customer',
  },
});

// Uncomment in handlePayment
const { error } = await presentPaymentSheet();
```

## 🗄️ Bước 6: Cập nhật Database Function

Tạo migration để thêm function xác nhận transaction với Stripe:

```sql
-- supabase/migrations/015_add_stripe_transaction_confirmation.sql

CREATE OR REPLACE FUNCTION confirm_transaction_with_stripe(
  transaction_id_param UUID,
  stripe_payment_intent_id TEXT,
  payment_proof_url_param TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  UPDATE public.transactions
  SET 
    status = 'completed',
    payment_method = 'stripe',
    payment_proof_url = payment_proof_url_param,
    confirmed_by = auth.uid(),
    completed_at = NOW(),
    updated_at = NOW(),
    -- Store Stripe payment intent ID in a JSON field (if you add it)
    -- stripe_payment_intent_id = stripe_payment_intent_id
  WHERE id = transaction_id_param
    AND status = 'pending';

  -- Update pet availability
  UPDATE public.pets
  SET is_available = false
  WHERE id = (
    SELECT pet_id FROM public.transactions WHERE id = transaction_id_param
  );

  -- Send notification to seller
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    body,
    data
  )
  SELECT 
    seller_id,
    'transaction_completed',
    'Giao dịch đã hoàn thành',
    'Người mua đã thanh toán thành công qua Stripe',
    jsonb_build_object(
      'transaction_id', transaction_id_param,
      'payment_method', 'stripe'
    )
  FROM public.transactions
  WHERE id = transaction_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 🧪 Bước 7: Test với Stripe Test Cards

Sử dụng các test card sau trong Stripe sandbox:

| Card Number | Description |
|------------|-------------|
| `4242 4242 4242 4242` | Success |
| `4000 0000 0000 0002` | Card declined |
| `4000 0025 0000 3155` | Requires authentication |

- **Expiry**: Bất kỳ ngày trong tương lai
- **CVC**: Bất kỳ 3 số
- **ZIP**: Bất kỳ 5 số

## 📝 Checklist

- [ ] Cài đặt `@stripe/stripe-react-native`
- [ ] Thêm `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` vào `.env`
- [ ] Khởi tạo `StripeProvider` trong app root
- [ ] Tạo Supabase Edge Function `create-transaction-payment-intent`
- [ ] Set `STRIPE_SECRET_KEY` trong Supabase secrets
- [ ] Deploy Edge Function
- [ ] Uncomment code trong `StripeTransactionPaymentSheet.tsx`
- [ ] Tạo database function `confirm_transaction_with_stripe`
- [ ] Test với Stripe test cards

## 🎯 Features

✅ **Hiển thị ảnh pet** trong transaction card
✅ **Tự động mapping giá** từ pet.price
✅ **Stripe Payment Sheet** cho thanh toán an toàn
✅ **Fallback** chuyển khoản thủ công

## 🔒 Security Notes

- **KHÔNG** commit Stripe secret keys vào Git
- **LUÔN** sử dụng environment variables
- **LUÔN** validate payment intent trên backend
- **LUÔN** sử dụng test mode trước khi deploy production

## 📚 Tài liệu tham khảo

- [Stripe React Native Docs](https://stripe.dev/stripe-react-native/)
- [Stripe Payment Sheet](https://stripe.dev/stripe-react-native/api/payment-sheet)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

