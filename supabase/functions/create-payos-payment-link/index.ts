import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cache headers - không cache payment API responses (sensitive, dynamic data)
const noCacheHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

/**
 * Create HMAC SHA256 signature for PayOS API request
 * Reference: https://payos.vn/docs/api/
 * 
 * Format: amount=$amount&cancelUrl=$cancelUrl&description=$description&orderCode=$orderCode&returnUrl=$returnUrl
 * Data must be sorted alphabetically
 */
async function createPayOSSignature(
  amount: number,
  cancelUrl: string,
  description: string,
  orderCode: number,
  returnUrl: string,
  checksumKey: string
): Promise<string> {
  // Create data string sorted alphabetically
  const dataString = `amount=${amount}&cancelUrl=${cancelUrl}&description=${description}&orderCode=${orderCode}&returnUrl=${returnUrl}`;
  
  // Create HMAC SHA256 signature
  const encoder = new TextEncoder();
  const keyData = encoder.encode(checksumKey);
  const messageData = encoder.encode(dataString);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  
  // Convert to hex string
  const hashArray = Array.from(new Uint8Array(signature));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

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
          headers: { ...corsHeaders, ...noCacheHeaders, 'Content-Type': 'application/json' },
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
          headers: { ...corsHeaders, ...noCacheHeaders, 'Content-Type': 'application/json' },
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
          headers: { ...corsHeaders, ...noCacheHeaders, 'Content-Type': 'application/json' },
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
          headers: { ...corsHeaders, ...noCacheHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create payment description
    // PayOS API requirement: description tối đa 25 ký tự
    // Reference: https://payos.vn/docs/api/
    // With non-linked bank accounts: max 9 characters
    // General limit: 25 characters
    let description = `Thanh toán ${pet_name}`;
    
    // If too long, truncate to 25 characters
    const maxDescriptionLength = 25; // PayOS API limit
    if (description.length > maxDescriptionLength) {
      description = description.substring(0, maxDescriptionLength);
    }
    
    // Remove any problematic characters (keep only alphanumeric, spaces, and common punctuation)
    description = description.replace(/[^\w\s\-\.,:;()]/g, '');
    
    // Final truncate after character removal (in case removal made it longer)
    if (description.length > maxDescriptionLength) {
      description = description.substring(0, maxDescriptionLength);
    }
    
    console.log('PayOS description (length):', description, `(${description.length} chars)`);

    // Generate order code (unique identifier for PayOS)
    // PayOS requires orderCode to be a positive integer
    // Use timestamp (last 10 digits) + random 3 digits to ensure it's within valid range
    // Max orderCode should be less than Number.MAX_SAFE_INTEGER (9007199254740991)
    const timestamp = Date.now().toString();
    const last10Digits = timestamp.slice(-10); // Last 10 digits of timestamp
    const randomPart = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    let orderCode = parseInt(last10Digits + randomPart);
    
    // Ensure orderCode is within safe integer range (max 15 digits)
    // PayOS typically accepts orderCode up to 15 digits
    if (orderCode > 999999999999999) {
      orderCode = parseInt(orderCode.toString().slice(-15));
    }
    
    // Ensure orderCode is positive and not zero
    if (orderCode <= 0) {
      orderCode = parseInt(Date.now().toString().slice(-10)) + Math.floor(Math.random() * 1000);
    }
    
    console.log('Generated orderCode:', orderCode, 'length:', orderCode.toString().length);

    // Validate and sanitize URLs
    // PayOS requires valid URLs for returnUrl and cancelUrl
    let cancelUrl = cancel_url || 'petadoption://payment-cancel';
    let returnUrl = return_url || 'petadoption://payment-success';
    
    // Ensure URLs are valid format (basic check)
    try {
      // Custom scheme like petadoption:// is OK, just ensure it has ://
      if (cancelUrl && !cancelUrl.includes('://')) {
        cancelUrl = 'petadoption://payment-cancel';
      }
      if (returnUrl && !returnUrl.includes('://')) {
        returnUrl = 'petadoption://payment-success';
      }
    } catch (e) {
      // Use defaults if URL validation fails
      cancelUrl = 'petadoption://payment-cancel';
      returnUrl = 'petadoption://payment-success';
    }

    // Prepare payment data for signature (must be sorted alphabetically)
    const paymentAmount = Math.round(amount);
    
    // Create signature according to PayOS API documentation
    // Reference: https://payos.vn/docs/api/
    // Format: amount=$amount&cancelUrl=$cancelUrl&description=$description&orderCode=$orderCode&returnUrl=$returnUrl
    const signature = await createPayOSSignature(
      paymentAmount,
      cancelUrl,
      description,
      orderCode,
      returnUrl,
      checksumKey
    );
    
    console.log('Generated PayOS signature:', signature.substring(0, 20) + '...');

    // Create payment request body according to PayOS API documentation
    // Reference: https://payos.vn/docs/api/
    const paymentData = {
      orderCode: orderCode,                    // Required: integer
      amount: paymentAmount,                   // Required: integer (VND)
      description: description,                 // Required: string
      items: [                                 // Required: Array of objects
        {
          name: pet_name,                      // Required: string
          quantity: 1,                         // Required: integer
          price: paymentAmount,                 // Required: integer (VND)
        },
      ],
      cancelUrl: cancelUrl,                    // Required: string (URI)
      returnUrl: returnUrl,                    // Required: string (URI)
      signature: signature,                    // Required: string (HMAC SHA256)
      expiredAt: Math.floor(Date.now() / 1000) + 15 * 60, // Optional: Unix timestamp (Int32)
    };

    // Log request data for debugging (without sensitive info)
    console.log('PayOS request data:', {
      orderCode: paymentData.orderCode,
      amount: paymentData.amount,
      description: paymentData.description.substring(0, 50) + '...',
      itemsCount: paymentData.items.length,
      cancelUrl: paymentData.cancelUrl,
      returnUrl: paymentData.returnUrl,
      expiredAt: paymentData.expiredAt,
    });

    // Call PayOS API to create payment link
    // PayOS Official SDK uses: https://api-merchant.payos.vn
    // Reference: https://github.com/payOSHQ/payos-lib-node
    
    // Check if proxy URL is configured (for DNS resolution workaround)
    // See PAYOS_PROXY_SOLUTION.md for setup instructions
    let payosProxyUrl = Deno.env.get('PAYOS_PROXY_URL');
    
    // Log proxy configuration status for debugging
    if (payosProxyUrl) {
      console.log('PAYOS_PROXY_URL found in environment:', payosProxyUrl.substring(0, 50) + '...');
    } else {
      console.log('PAYOS_PROXY_URL not set - will use direct PayOS API calls');
      console.log('To use proxy, set PAYOS_PROXY_URL in Supabase Secrets:');
      console.log('  supabase secrets set PAYOS_PROXY_URL=https://payos.thanvinh1602-4a0.workers.dev');
    }
    
    // Validate and fix proxy URL (add https:// if missing)
    if (payosProxyUrl) {
      payosProxyUrl = payosProxyUrl.trim();
      // Auto-add https:// if protocol is missing
      if (!payosProxyUrl.startsWith('http://') && !payosProxyUrl.startsWith('https://')) {
        payosProxyUrl = `https://${payosProxyUrl}`;
        console.log('Auto-added https:// to proxy URL:', payosProxyUrl);
      }
      // Validate URL format
      try {
        new URL(payosProxyUrl);
        console.log('✅ Using PayOS proxy:', payosProxyUrl);
      } catch (error) {
        console.error('❌ Invalid PAYOS_PROXY_URL format:', payosProxyUrl, error);
        payosProxyUrl = null; // Disable proxy if URL is invalid
      }
    }
    
    let payosBaseUrl = 'https://api-merchant.payos.vn';
    let payosUrl = `${payosBaseUrl}/v2/payment-requests`;
    
    // If proxy is configured, use it instead of direct API call
    if (payosProxyUrl) {
      payosUrl = payosProxyUrl;
    }
    
    // Alternative endpoint if primary fails (fallback)
    const payosUrlFallback = 'https://api.payos.vn/v2/payment-requests';
    
    // Retry logic for DNS/network errors with exponential backoff
    // Based on PayOS SDK best practices: https://github.com/payOSHQ/payos-lib-node
    // SDK default: maxRetries: 2, timeout: 60000ms
    let lastError: any = null;
    const maxRetries = 4; // Tăng từ 2 lên 4 retries (SDK default: 2)
    const timeout = 60000; // 60 seconds (SDK default)
    
    // Try both endpoints: primary (api-merchant.payos.vn) and fallback (api.payos.vn)
    // If using proxy, only try proxy URL (no fallback needed)
    const endpoints = payosProxyUrl ? [payosUrl] : [payosUrl, payosUrlFallback];
    
    for (let endpointIndex = 0; endpointIndex < endpoints.length; endpointIndex++) {
      const currentUrl = endpoints[endpointIndex];
      const isPrimaryEndpoint = endpointIndex === 0;
      
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          // Log attempt (only for debugging)
          if (attempt > 0 || !isPrimaryEndpoint) {
            const endpointName = isPrimaryEndpoint ? 'primary (api-merchant.payos.vn)' : 'fallback (api.payos.vn)';
            console.log(`PayOS API ${endpointName} - attempt ${attempt + 1}/${maxRetries + 1}`);
          }

          // Log request details (first request only)
          if (attempt === 0 && endpointIndex === 0) {
            console.log('Sending request to:', currentUrl);
            console.log('Request headers:', {
              'Content-Type': 'application/json',
              'x-client-id': clientId ? `${clientId.substring(0, 10)}...` : 'missing',
              'x-api-key': apiKey ? `${apiKey.substring(0, 10)}...` : 'missing',
              'User-Agent': 'Supabase-Edge-Function/1.0',
              'Accept': 'application/json',
            });
          }

          const payosResponse = await fetch(currentUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-client-id': clientId,
              'x-api-key': apiKey,
              'User-Agent': 'Supabase-Edge-Function/1.0',
              'Accept': 'application/json',
            },
            body: JSON.stringify(paymentData),
            // Timeout: 60 seconds (SDK default)
            signal: AbortSignal.timeout(timeout),
          });

          // Log response status for debugging
          console.log(`PayOS API response status: ${payosResponse.status}`);
          
          // Get response text first to handle both success and error cases
          const responseText = await payosResponse.text();
          console.log('PayOS API response (first 500 chars):', responseText.substring(0, 500));
          
          if (!payosResponse.ok) {
            let errorData: any = {};
            try {
              errorData = JSON.parse(responseText);
            } catch (e) {
              errorData = { message: responseText || 'Unknown error' };
            }
            console.error('PayOS API error:', errorData);
            throw new Error(errorData.message || errorData.desc || `PayOS API returned status ${payosResponse.status}`);
          }

          // Parse response JSON
          let payosData: any;
          try {
            payosData = JSON.parse(responseText);
          } catch (e) {
            console.error('Failed to parse PayOS response as JSON:', responseText);
            throw new Error('Invalid JSON response from PayOS API');
          }

          // Validate response structure
          if (!payosData) {
            console.error('PayOS response is null or undefined');
            throw new Error('PayOS API returned empty response');
          }

          if (!payosData.data) {
            console.error('PayOS response missing data field:', JSON.stringify(payosData));
            throw new Error(`PayOS API response missing data field. Response: ${JSON.stringify(payosData)}`);
          }

          if (!payosData.data.checkoutUrl) {
            console.error('PayOS response missing checkoutUrl:', JSON.stringify(payosData.data));
            throw new Error(`PayOS API response missing checkoutUrl. Response data: ${JSON.stringify(payosData.data)}`);
          }

          // Success! Return payment link information
          return new Response(
            JSON.stringify({
              payment_url: payosData.data.checkoutUrl,
              payment_link_id: payosData.data.paymentLinkId || orderCode.toString(),
              qr_code: payosData.data.qrCode || '',
              order_code: orderCode,
            }),
            {
              status: 200,
              headers: { 
                ...corsHeaders, 
                ...noCacheHeaders,
                'Content-Type': 'application/json' 
              },
            }
          );
        } catch (fetchError: any) {
        lastError = fetchError;
        
        // Check if it's a DNS/network error
        const isDNSError = fetchError.message?.includes('dns error') || 
                          fetchError.message?.includes('failed to lookup') ||
                          fetchError.message?.includes('No address associated') ||
                          fetchError.message?.includes('Connect') ||
                          fetchError.name === 'TypeError' ||
                          (fetchError.cause && (
                            fetchError.cause.message?.includes('dns') ||
                            fetchError.cause.message?.includes('lookup')
                          ));
        
        // Handle DNS/network errors - retry if it's a DNS error
        if (isDNSError && attempt < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s, 8s (similar to SDK)
          const delayMs = Math.pow(2, attempt) * 1000;
          const endpointName = isPrimaryEndpoint ? 'api-merchant.payos.vn' : 'api.payos.vn';
          console.warn(
            `DNS/Network error on ${endpointName} - attempt ${attempt + 1}/${maxRetries + 1}, retrying in ${delayMs}ms...`,
            fetchError.message || fetchError.cause?.message || 'Unknown error'
          );
          // Wait before retry with exponential backoff
          await new Promise(resolve => setTimeout(resolve, delayMs));
          continue; // Retry same endpoint
        }
        
        // If DNS error and no more retries on this endpoint, try next endpoint
        if (isDNSError && endpointIndex < endpoints.length - 1) {
          console.warn(
            `Primary endpoint failed after ${attempt + 1} attempts, trying fallback endpoint...`,
            fetchError.message || fetchError.cause?.message || 'Unknown error'
          );
          lastError = fetchError;
          break; // Try next endpoint
        }
        
        // If DNS error and no more endpoints/retries, return specific error
        if (isDNSError) {
          console.error(
            'DNS/Network error connecting to PayOS API after all retries and endpoints:',
            fetchError.message || fetchError.cause?.message || 'Unknown error'
          );
          return new Response(
            JSON.stringify({
              error: 'Không thể kết nối đến PayOS API. Vui lòng kiểm tra kết nối mạng hoặc liên hệ hỗ trợ PayOS.',
              details: 'DNS resolution failed for PayOS API endpoints after multiple retries. This may be a temporary network issue or a regional DNS resolution problem. Please try again later or contact support.',
              error_type: 'DNS_RESOLUTION_FAILED',
              attempts: attempt + 1,
              endpoint: currentUrl,
            }),
            {
              status: 503,
              headers: { ...corsHeaders, ...noCacheHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
        
        // Other errors - break and let outer catch handle
        throw fetchError;
      }
    }
  }
    
    // If we get here, all retries and endpoints failed
    throw lastError || new Error('Failed to connect to PayOS API after retries');
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

