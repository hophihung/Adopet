import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';

serve(async (req) => {
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return new Response('No signature', { status: 400 });
  }

  try {
    const body = await req.text();
    
    // Verify webhook signature
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret
    );

    console.log('Received webhook event:', event.type);

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
        if (paymentIntent.metadata.type === 'subscription') {
          const { profile_id, plan } = paymentIntent.metadata;

          // Update payment record
          await supabaseClient
            .from('subscription_payments')
            .update({
              status: 'succeeded',
              completed_at: new Date().toISOString(),
            })
            .eq('payment_intent_id', paymentIntent.id);

          // Check if subscription already exists
          const { data: existingSubscription } = await supabaseClient
            .from('subscriptions')
            .select('*')
            .eq('profile_id', profile_id)
            .maybeSingle();

          if (existingSubscription) {
            // Update existing subscription
            await supabaseClient
              .from('subscriptions')
              .update({
                plan,
                status: 'active',
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingSubscription.id);
          } else {
            // Create new subscription
            await supabaseClient
              .from('subscriptions')
              .insert({
                profile_id,
                plan,
                status: 'active',
                start_date: new Date().toISOString(),
              });
          }

          console.log(`Subscription ${plan} activated for profile ${profile_id}`);
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
        if (paymentIntent.metadata.type === 'subscription') {
          // Update payment record
          await supabaseClient
            .from('subscription_payments')
            .update({
              status: 'failed',
              completed_at: new Date().toISOString(),
            })
            .eq('payment_intent_id', paymentIntent.id);

          console.log(`Payment failed for intent ${paymentIntent.id}`);
        }
        break;
      }

      case 'payment_intent.canceled': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
        if (paymentIntent.metadata.type === 'subscription') {
          // Update payment record
          await supabaseClient
            .from('subscription_payments')
            .update({
              status: 'canceled',
              completed_at: new Date().toISOString(),
            })
            .eq('payment_intent_id', paymentIntent.id);

          console.log(`Payment canceled for intent ${paymentIntent.id}`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400 }
    );
  }
});
