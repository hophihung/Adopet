// Simplified Cloudflare Worker for PayOS Proxy
// This version should work without deployment errors

export default {
  async fetch(request, env, ctx) {
    // Log request for debugging
    console.log('Request method:', request.method);
    console.log('Request URL:', request.url);
    
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, x-client-id, x-api-key',
        },
      });
    }

    // Only allow POST requests
    if (request.method !== 'POST') {
      return new Response(
        JSON.stringify({ 
          error: 'Method not allowed', 
          method: request.method,
          allowed: ['POST', 'OPTIONS']
        }), 
        { 
          status: 405,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    try {
      // Get headers
      const clientId = request.headers.get('x-client-id');
      const apiKey = request.headers.get('x-api-key');

      if (!clientId || !apiKey) {
        return new Response(
          JSON.stringify({ 
            error: 'Missing required headers: x-client-id or x-api-key',
            code: 'MISSING_HEADERS'
          }), 
          {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }

      // Get request body
      const body = await request.text();
      
      // Prepare headers for PayOS API
      const payosHeaders = {
        'Content-Type': 'application/json',
        'x-client-id': clientId,
        'x-api-key': apiKey,
        'Accept': 'application/json',
      };

      // Forward to PayOS API
      const payosUrl = 'https://api-merchant.payos.vn/v2/payment-requests';
      const response = await fetch(payosUrl, {
        method: 'POST',
        headers: payosHeaders,
        body: body,
      });

      // Get response
      const responseText = await response.text();

      // Return response
      return new Response(responseText, {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    } catch (error) {
      console.error('Error:', error);
      return new Response(
        JSON.stringify({ 
          error: error.message || 'Proxy error',
          code: 'PROXY_ERROR'
        }), 
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }
  },
};

