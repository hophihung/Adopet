# Stripe Subscription Payment Integration Setup Guide

## 📋 Prerequisites

- Stripe account (sign up at https://stripe.com)
- Supabase project with Edge Functions enabled
- Supabase CLI installed (`npm install -g supabase`)
- React Native app with `@stripe/stripe-react-native` installed (✅ already done)

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
supabase functions deploy create-subscription-payment-intent
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

Run the migration to create the `subscription_payments` table:

```bash
supabase db push
```

Or manually execute `supabase/migrations/20250105_subscription_payments.sql` in Supabase SQL Editor.

This creates:
- `subscription_payments` table - Tracks Stripe payment transactions
- `subscriptions` table - Stores user subscription plans (should already exist)

Key columns in `subscription_payments`:
- `profile_id` - User ID
- `plan` - Subscription plan (free/premium/pro)
- `amount` - Payment amount in VND
- `payment_intent_id` - Stripe Payment Intent ID
- `status` - Payment status (pending/succeeded/failed/canceled)

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
2. Navigate to subscription screen
3. Choose a paid subscription plan (Premium ₫99,000 or Pro ₫149,000)
4. Click "Chọn gói" button
5. Stripe Payment Sheet will open
6. Enter test card: `4242 4242 4242 4242`
7. Enter any future expiry date and CVC
8. Complete payment
9. Webhook will automatically:
   - Update `subscription_payments` status to 'succeeded'
   - Create/update subscription in `subscriptions` table
   - Activate subscription for user
10. User will be redirected to main app

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

## 📊 Current Subscription Plans

| Plan | Price | Pet Limit | Features |
|------|-------|-----------|----------|
| Free | ₫0 | 4 pets | Basic features, 5 views/day |
| Premium | ₫99,000/month | 6 pets | Unlimited views, priority contact |
| Pro | ₫149,000/month | 9 pets | All Premium + Analytics, Badge, API access |

## 🔧 Key Files

- `lib/stripe.ts` - Stripe payment service utilities
- `contexts/SubscriptionContext.tsx` - Subscription state management
- `app/subscription.tsx` - Subscription UI screen
- `app/_layout.tsx` - Stripe Provider initialization
- `supabase/functions/create-subscription-payment-intent/index.ts` - Payment intent creation
- `supabase/functions/stripe-webhook/index.ts` - Webhook event handler
- `supabase/migrations/20250105_subscription_payments.sql` - Database schema

## 🎯 How It Works

1. **User selects plan** → SubscriptionContext.createSubscription()
2. **Payment initiated** → lib/stripe.processSubscriptionPayment()
3. **Edge Function called** → create-subscription-payment-intent
4. **Stripe Payment Intent created** → Returns client_secret
5. **Payment Sheet shown** → User completes payment
6. **Webhook triggered** → stripe-webhook function
7. **Database updated** → Subscription activated
8. **User redirected** → Main app with active subscription

