export default {
    async fetch(request, env, ctx) {
      // Log request method and URL for debugging
      console.log('Proxy received request:', {
        method: request.method,
        url: request.url,
        headers: Object.fromEntries(request.headers.entries()),
      });

      // Handle CORS
      if (request.method === 'OPTIONS') {
        console.log('Handling OPTIONS preflight request');
        return new Response(null, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, x-client-id, x-api-key',
          },
        });
      }
  
      // Only allow POST requests
      if (request.method !== 'POST') {
        console.error('Invalid request method:', request.method);
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

      console.log('Processing POST request');
  
      try {
        const payosUrl = 'https://api-merchant.payos.vn/v2/payment-requests';
        
        // Get required headers from original request
        const headers = new Headers();
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

        // Forward headers to PayOS API
        headers.set('Content-Type', 'application/json');
        headers.set('x-client-id', clientId);
        headers.set('x-api-key', apiKey);
        headers.set('Accept', 'application/json');

        // Get request body
        const body = await request.text();
        
        // Log request for debugging (first 500 chars)
        console.log('Request body (first 500 chars):', body.substring(0, 500));
        
        // Forward request to PayOS API
        const response = await fetch(payosUrl, {
          method: 'POST',
          headers: headers,
          body: body,
        });

        // Get response text
        const responseText = await response.text();

        // Log response for debugging (first 500 chars)
        console.log(`PayOS API response status: ${response.status}`);
        console.log(`PayOS API response (first 500 chars): ${responseText.substring(0, 500)}`);

        // Return response with CORS headers
        return new Response(responseText, {
          status: response.status,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, x-client-id, x-api-key',
          },
        });
      } catch (error) {
        console.error('Proxy error:', error);
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
  