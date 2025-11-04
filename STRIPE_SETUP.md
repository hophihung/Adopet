# Stripe Payment Integration Setup Guide

## 📋 Prerequisites

- Stripe account (sign up at https://stripe.com)
- Supabase project with Edge Functions enabled
- Supabase CLI installed (`npm install -g supabase`)

## 🔑 Step 1: Get Stripe API Keys

1. Go to https://dashboard.stripe.com/apikeys
2. Copy your **Publishable key** (starts with `pk_test_`)
3. Copy your **Secret key** (starts with `sk_test_`)
4. Add to your `.env` file:
   ```
   EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
   ```

## ⚡ Step 2: Deploy Supabase Edge Functions

### Login to Supabase
```bash
supabase login
```

### Link to your project
```bash
supabase link --project-ref YOUR_PROJECT_REF
```

### Set secrets for Edge Functions
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_your_secret_key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Deploy the functions
```bash
supabase functions deploy create-payment-intent
supabase functions deploy stripe-webhook
```

## 🔔 Step 3: Configure Stripe Webhooks

1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Enter your  L:
   ```
   https://yxzvjlcyfcjcksrjjmmi.supabase.co/functions/v1/stripe-webhook
   ```
4. Select events to listen for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Click "Add endpoint"
6. Copy the **Signing secret** (starts with `whsec_`)
7. Set it in Supabase:
   ```bash
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
   ```

## 🗄️ Step 4: Setup Database Tables

Ensure your `subscriptions` table has these columns:
```sql
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  plan TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  billing_cycle TEXT,
  payment_method TEXT,
  payment_id TEXT,
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date TIMESTAMPTZ,
  auto_renew BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id)
);
```

## 🧪 Step 5: Test Payment

Use Stripe test cards:
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Authentication Required**: `4000 0025 0000 3155`

Use any future date for expiration and any 3 digits for CVC.

## 🚀 Step 6: Run the App

```bash
npm run dev
```

## 📱 Testing Flow

1. Sign up / Login to app
2. Select "Seller" role
3. Choose a paid subscription plan
4. Click "Continue"
5. Payment sheet will open
6. Enter test card: `4242 4242 4242 4242`
7. Complete payment
8. Webhook will update subscription status

## 🔒 Production Checklist

Before going live:
- [ ] Replace test API keys with live keys
- [ ] Update webhook endpoint to production URL
- [ ] Test all payment scenarios
- [ ] Set up Stripe billing portal for customers
- [ ] Configure email notifications
- [ ] Set up monitoring and alerts
- [ ] Review Stripe security best practices

## 📞 Support

- Stripe Docs: https://stripe.com/docs
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- Stripe React Native: https://stripe.dev/stripe-react-native

## 💡 Common Issues

### "No publishable key found"
Make sure `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` is set in `.env` file

### "Function invocation failed"
Check Edge Function logs: `supabase functions logs create-payment-intent`

### "Webhook signature verification failed"
Ensure `STRIPE_WEBHOOK_SECRET` is correctly set in Supabase secrets

### "Payment intent creation failed"
Verify `STRIPE_SECRET_KEY` is set correctly in Edge Functions

