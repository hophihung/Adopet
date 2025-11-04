/**
 * Stripe Configuration
 * Publishable keys are safe to expose in the app
 */

export const STRIPE_CONFIG = {
  // Get these from: https://dashboard.stripe.com/apikeys
  publishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
  
  // For testing, use test mode keys
  // For production, use live mode keys
  merchantIdentifier: 'merchant.com.adopet',
  urlScheme: 'adopet',
  
  // API endpoints (Supabase Edge Functions)
  endpoints: {
    createPaymentIntent: `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/create-payment-intent`,
    handleWebhook: `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/stripe-webhook`,
  }
};

// Stripe payment currency (VND - Vietnamese Dong)
export const STRIPE_CURRENCY = 'vnd';

// Minimum amount in VND (Stripe requires minimum 10,000 VND)
export const STRIPE_MIN_AMOUNT = 10000;

