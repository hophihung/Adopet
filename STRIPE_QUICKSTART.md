# Stripe Quick Start Guide

Get Stripe payments working in 5 minutes! ⚡

## 1. Get Stripe Keys (2 min)

1. Go to https://dashboard.stripe.com/test/apikeys
2. Copy **Publishable key** (pk_test_...)
3. Copy **Secret key** (sk_test_...)

## 2. Configure Environment (1 min)

Add to your `.env` file:

```bash
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
```

## 3. Setup Supabase Secrets (1 min)

```bash
# Login to Supabase
npx supabase login

# Link project (if not already linked)
npx supabase link --project-ref your-project-ref

# Set secrets
npx supabase secrets set STRIPE_SECRET_KEY=sk_test_your_secret_key
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Get your service role key from: Supabase Dashboard > Project Settings > API > service_role key

## 4. Deploy Edge Functions (1 min)

```bash
npx supabase functions deploy create-subscription-payment-intent
npx supabase functions deploy stripe-webhook
```

## 5. Setup Database (30 sec)

```bash
npx supabase db push
```

## 6. Configure Webhook (Optional - for production)

1. Go to https://dashboard.stripe.com/test/webhooks
2. Add endpoint: `https://your-project.supabase.co/functions/v1/stripe-webhook`
3. Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`
4. Copy signing secret (whsec_...)
5. Set in Supabase: `npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_your_secret`

## ✅ You're Done!

Run the app and test:

```bash
npm run dev
```

**Test Card**: 4242 4242 4242 4242 (any future date, any CVC)

---

## Troubleshooting

**"No publishable key found"**
→ Make sure `.env` file has `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`

**"Payment intent creation failed"**
→ Check Edge Functions are deployed: `npx supabase functions list`

**"Database error"**
→ Run migration: `npx supabase db push`

For detailed setup, see [STRIPE_SETUP.md](./STRIPE_SETUP.md)
