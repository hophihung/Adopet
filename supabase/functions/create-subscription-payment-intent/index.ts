import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Plan pricing in VND
const PLAN_PRICES: Record<string, number> = {
  free: 0,
  premium: 99000,
  pro: 149000,
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { plan, profile_id, amount, currency = 'vnd' } = await req.json();

    // Validate input
    if (!plan || !profile_id || !amount) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: plan, profile_id, and amount' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate plan
    if (!['premium', 'pro'].includes(plan)) {
      return new Response(
        JSON.stringify({ error: 'Invalid plan. Must be "premium" or "pro"' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate amount matches plan
    if (amount !== PLAN_PRICES[plan]) {
      return new Response(
        JSON.stringify({ 
          error: `Invalid amount for ${plan} plan. Expected ${PLAN_PRICES[plan]} VND` 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate amount (minimum 10,000 VND for Stripe)
    const minAmount = 10000;
    if (amount < minAmount) {
      return new Response(
        JSON.stringify({ 
          error: `Amount must be at least ${minAmount.toLocaleString('vi-VN')} VNĐ` 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount), // Stripe requires integer
      currency: currency.toLowerCase(),
      metadata: {
        profile_id: profile_id,
        plan: plan,
        type: 'subscription',
      },
      automatic_payment_methods: {
        enabled: true,
      },
      description: `AdoPet ${plan.charAt(0).toUpperCase() + plan.slice(1)} subscription for ${profile_id}`,
    });

    // Create a pending subscription record in database
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { error: dbError } = await supabaseClient
      .from('subscription_payments')
      .insert({
        profile_id,
        plan,
        amount,
        currency,
        payment_intent_id: paymentIntent.id,
        status: 'pending',
      });

    if (dbError) {
      console.error('Database error:', dbError);
      // Don't fail the payment if DB insert fails - webhook will handle it
    }

    return new Response(
      JSON.stringify({
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
        amount,
        currency,
        plan,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error: any) {
    console.error('Error creating subscription payment intent:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to create payment intent' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
