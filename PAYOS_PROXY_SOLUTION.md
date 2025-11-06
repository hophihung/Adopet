# 🔧 PayOS DNS Error - Proxy Solution

## Vấn đề hiện tại

Supabase Edge Functions (region `ap-northeast-2`) không thể resolve domain `.vn` của PayOS API:
- `api-merchant.payos.vn` ❌
- `api.payos.vn` ❌

## Giải pháp: Tạo Proxy Service

Vì Supabase Edge Functions không thể resolve `.vn` domains, chúng ta cần tạo một proxy service để forward requests.

### Option 1: Cloudflare Workers (Khuyến nghị - Free & Fast)

Cloudflare Workers có thể resolve `.vn` domains và có thể deploy miễn phí.

#### Bước 1: Tạo Cloudflare Worker

1. Đăng ký tài khoản Cloudflare (free)
2. Vào **Workers & Pages** → **Create Worker**
3. Tạo file `payos-proxy.js`:

```javascript
export default {
  async fetch(request, env, ctx) {
    // Handle CORS
    if (request.method === 'OPTIONS') {
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
      return new Response('Method not allowed', { status: 405 });
    }

    try {                   
      // Forward request to PayOS API
      const payosUrl = 'https://api-merchant.payos.vn/v2/payment-requests';
      
      // Get headers from original request
      const headers = new Headers();
      request.headers.forEach((value, key) => {
        if (key.toLowerCase() === 'x-client-id' || 
            key.toLowerCase() === 'x-api-key' ||
            key.toLowerCase() === 'content-type') {
          headers.set(key, value);
        }
      });

      // Get body from original request
      const body = await request.text();

      // Forward to PayOS API
      const response = await fetch(payosUrl, {
        method: 'POST',
        headers: headers,
        body: body,
      });

      const responseData = await response.text();

      // Return response with CORS headers
      return new Response(responseData, {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, x-client-id, x-api-key',
        },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
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
```

4. Deploy Worker và lấy URL (ví dụ: `https://payos-proxy.your-account.workers.dev`)

#### Bước 2: Cập nhật Supabase Edge Function

Cập nhật `supabase/functions/create-payos-payment-link/index.ts`:

```typescript
// Thay vì gọi trực tiếp PayOS API
const payosUrl = 'https://api-merchant.payos.vn/v2/payment-requests';

// Dùng Cloudflare Worker proxy
const payosProxyUrl = Deno.env.get('PAYOS_PROXY_URL') || 'https://payos-proxy.your-account.workers.dev';
const payosUrl = payosProxyUrl;
```

**Lưu ý:** Set `PAYOS_PROXY_URL` trong Supabase Secrets:
```bash
# ✅ ĐÚNG - Có https://
supabase secrets set PAYOS_PROXY_URL=https://payos.thanvinh1602-4a0.workers.dev

# ✅ Cũng OK - Code sẽ tự động thêm https:// nếu thiếu
supabase secrets set PAYOS_PROXY_URL=payos.thanvinh1602-4a0.workers.dev

# ❌ SAI - Thiếu protocol (sẽ được auto-fix nhưng nên set đúng)
supabase secrets set PAYOS_PROXY_URL=payos.thanvinh1602-4a0.workers.dev
```

**Edge Function đã được cập nhật để tự động:**
- ✅ Thêm `https://` nếu proxy URL thiếu protocol
- ✅ Validate URL format trước khi sử dụng
- ✅ Log rõ ràng khi dùng proxy

### Option 2: VPS/Server với Node.js (Nếu có)

Tạo một simple Express server:

```javascript
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

app.post('/payos-proxy', async (req, res) => {
  try {
    const response = await fetch('https://api-merchant.payos.vn/v2/payment-requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': req.headers['x-client-id'],
        'x-api-key': req.headers['x-api-key'],
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log('PayOS Proxy running on port 3000');
});
```

### Option 3: Contact Supabase Support (Long-term)

**Khuyến nghị:** Contact Supabase support về vấn đề DNS resolution:

1. Vào Supabase Dashboard → **Support**
2. Tạo ticket với nội dung:
   ```
   Subject: DNS Resolution Issue for .vn domains in ap-northeast-2 region
   
   Issue: Edge Functions in ap-northeast-2 region cannot resolve .vn domains
   (api-merchant.payos.vn and api.payos.vn)
   
   Error: "dns error: failed to lookup address information: 
   No address associated with hostname"
   
   Request: Please check DNS configuration for .vn domains 
   or suggest alternative region that can resolve .vn domains.
   ```

## Tạm thời: Workaround với IP Address

⚠️ **Không khuyến nghị** vì IP có thể thay đổi, nhưng có thể dùng tạm:

1. Resolve IP từ máy local:
   ```bash
   nslookup api-merchant.payos.vn
   # hoặc
   dig api-merchant.payos.vn
   ```

2. Dùng IP trực tiếp trong code (tạm thời):
   ```typescript
   const payosUrl = 'https://[IP_ADDRESS]/v2/payment-requests';
   ```

3. **Lưu ý:** Cần set `Host` header:
   ```typescript
   headers: {
     'Host': 'api-merchant.payos.vn',
     // ... other headers
   }
   ```

## Recommendation

**Tốt nhất:** Dùng Cloudflare Workers (Option 1) vì:
- ✅ Free tier đủ dùng
- ✅ Fast (CDN edge locations)
- ✅ Có thể resolve `.vn` domains
- ✅ Dễ deploy và maintain
- ✅ Không cần manage infrastructure

Sau đó contact Supabase support để fix DNS issue ở root level.

