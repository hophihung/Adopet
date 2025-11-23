import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cache headers - không cache payment API responses
const noCacheHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { payment_link_id } = await req.json();

    if (!payment_link_id) {
      return new Response(
        JSON.stringify({ error: 'Missing payment_link_id' }),
        {
          status: 400,
          headers: { ...corsHeaders, ...noCacheHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const clientId = Deno.env.get('PAYOS_CLIENT_ID');
    const apiKey = Deno.env.get('PAYOS_API_KEY');

    if (!clientId || !apiKey) {
      return new Response(
        JSON.stringify({ error: 'PayOS credentials not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, ...noCacheHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Call PayOS API to get payment info
    const payosResponse = await fetch(
      `https://api.payos.vn/v2/payment-requests/${payment_link_id}`,
      {
        method: 'GET',
        headers: {
          'x-client-id': clientId,
          'x-api-key': apiKey,
        },
      }
    );

    if (!payosResponse.ok) {
      const errorData = await payosResponse.json();
      throw new Error(errorData.message || 'Failed to get payment info');
    }

    const payosData = await payosResponse.json();

    return new Response(JSON.stringify(payosData.data), {
      status: 200,
      headers: { ...corsHeaders, ...noCacheHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error getting payment info:', error);
      return new Response(
        JSON.stringify({
          error: error.message || 'Failed to get payment info',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, ...noCacheHeaders, 'Content-Type': 'application/json' },
        }
      );
  }
});

