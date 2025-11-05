import { initPaymentSheet, presentPaymentSheet } from '@stripe/stripe-react-native';
import { supabase } from './supabaseClient';

export interface CreateSubscriptionPaymentParams {
  plan: 'free' | 'premium' | 'pro';
  profileId: string;
}

export interface PaymentSheetResult {
  success: boolean;
  error?: string;
}

// Plan pricing in VND
export const PLAN_PRICES = {
  free: 0,
  premium: 99000,
  pro: 149000,
} as const;

/**
 * Create a subscription payment intent via Supabase Edge Function
 */
export async function createSubscriptionPaymentIntent(
  params: CreateSubscriptionPaymentParams
): Promise<{ clientSecret: string; paymentIntentId: string }> {
  const { plan, profileId } = params;
  
  // Free plan doesn't require payment
  if (plan === 'free') {
    throw new Error('Free plan does not require payment');
  }

  const amount = PLAN_PRICES[plan];

  try {
    const { data, error } = await supabase.functions.invoke(
      'create-subscription-payment-intent',
      {
        body: {
          plan,
          profile_id: profileId,
          amount,
          currency: 'vnd',
        },
      }
    );

    if (error) {
      console.error('Error creating payment intent:', error);
      throw new Error(error.message || 'Failed to create payment intent');
    }

    if (!data?.client_secret || !data?.payment_intent_id) {
      throw new Error('Invalid response from payment service');
    }

    return {
      clientSecret: data.client_secret,
      paymentIntentId: data.payment_intent_id,
    };
  } catch (error) {
    console.error('Payment intent creation failed:', error);
    throw error;
  }
}

/**
 * Initialize and present the Stripe Payment Sheet
 */
export async function presentStripePaymentSheet(
  clientSecret: string,
  merchantDisplayName: string = 'AdoPet'
): Promise<PaymentSheetResult> {
  try {
    // Initialize the payment sheet
    const { error: initError } = await initPaymentSheet({
      merchantDisplayName,
      paymentIntentClientSecret: clientSecret,
      defaultBillingDetails: {
        // You can pre-fill user details if available
      },
      returnURL: 'adopet://stripe-redirect', // Deep link for return
      appearance: {
        colors: {
          primary: '#007AFF',
          background: '#1C1C1E',
          componentBackground: '#2C2C2E',
          componentBorder: '#3A3A3C',
          componentDivider: '#3A3A3C',
          primaryText: '#FFFFFF',
          secondaryText: '#8E8E93',
          componentText: '#FFFFFF',
          placeholderText: '#8E8E93',
        },
      },
    });

    if (initError) {
      console.error('Payment sheet initialization error:', initError);
      return {
        success: false,
        error: initError.message || 'Failed to initialize payment',
      };
    }

    // Present the payment sheet
    const { error: presentError } = await presentPaymentSheet();

    if (presentError) {
      console.error('Payment sheet presentation error:', presentError);
      return {
        success: false,
        error: presentError.message || 'Payment cancelled',
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Unexpected payment error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Payment failed',
    };
  }
}

/**
 * Complete payment flow for subscription
 */
export async function processSubscriptionPayment(
  params: CreateSubscriptionPaymentParams
): Promise<PaymentSheetResult> {
  try {
    // Step 1: Create payment intent
    const { clientSecret } = await createSubscriptionPaymentIntent(params);

    // Step 2: Present payment sheet
    const result = await presentStripePaymentSheet(clientSecret);

    return result;
  } catch (error) {
    console.error('Subscription payment process error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Payment process failed',
    };
  }
}
