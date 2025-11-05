import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const {
      transaction_id,
      amount,
      currency = 'VND',
      pet_name,
      transaction_code,
      return_url,
      cancel_url,
    } = await req.json();

    // Validate input (transaction_code is optional for free transactions)
    if (!transaction_id || amount === undefined || !pet_name) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields: transaction_id, amount, pet_name',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Nếu amount = 0 hoặc miễn phí, không tạo PayOS payment link
    if (!amount || amount <= 0) {
      return new Response(
        JSON.stringify({
          error: 'Cannot create payment link for free transaction (amount = 0)',
          payment_url: null,
          payment_link_id: null,
          qr_code: null,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate amount (minimum 1,000 VND for PayOS)
    const minAmount = 1000;
    if (amount < minAmount) {
      return new Response(
        JSON.stringify({
          error: `Amount must be at least ${minAmount.toLocaleString('vi-VN')} VNĐ`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get PayOS credentials from environment
    const clientId = Deno.env.get('PAYOS_CLIENT_ID');
    const apiKey = Deno.env.get('PAYOS_API_KEY');
    const checksumKey = Deno.env.get('PAYOS_CHECKSUM_KEY');

    if (!clientId || !apiKey || !checksumKey) {
      return new Response(
        JSON.stringify({ error: 'PayOS credentials not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create payment description
    const description = `Thanh toán cho ${pet_name} - Mã giao dịch: ${transaction_code}`;

    // Generate order code (unique identifier for PayOS)
    const orderCode = parseInt(
      Date.now().toString() + Math.floor(Math.random() * 1000).toString()
    );

    // Create payment request body
    const paymentData = {
      orderCode: orderCode,
      amount: Math.round(amount),
      description: description,
      items: [
        {
          name: pet_name,
          quantity: 1,
          price: Math.round(amount),
        },
      ],
      cancelUrl: cancel_url || 'petadoption://payment-cancel',
      returnUrl: return_url || 'petadoption://payment-success',
      expiredAt: Math.floor(Date.now() / 1000) + 15 * 60, // 15 minutes from now
    };

    // Call PayOS API to create payment link
    const payosResponse = await fetch('https://api.payos.vn/v2/payment-requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': clientId,
        'x-api-key': apiKey,
      },
      body: JSON.stringify(paymentData),
    });

    if (!payosResponse.ok) {
      const errorData = await payosResponse.json();
      console.error('PayOS API error:', errorData);
      throw new Error(errorData.message || 'Failed to create payment link');
    }

    const payosData = await payosResponse.json();

    // Return payment link information
    return new Response(
      JSON.stringify({
        payment_url: payosData.data.checkoutUrl,
        payment_link_id: payosData.data.paymentLinkId || orderCode.toString(),
        qr_code: payosData.data.qrCode || '',
        order_code: orderCode,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error creating payment link:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to create payment link',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

