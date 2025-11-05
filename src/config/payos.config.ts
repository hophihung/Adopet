/**
 * PayOS Configuration
 * PayOS là payment gateway của Việt Nam
 * Documentation: https://payos.vn/docs/
 */

export const PAYOS_CONFIG = {
  // NOTE: PayOS credentials (Client ID, API Key, Checksum Key) 
  // được lưu trong Supabase Secrets và chỉ dùng trong Edge Functions
  // Client app KHÔNG cần biết PayOS credentials vì gọi qua Edge Function
  
  // PayOS API endpoints (for Edge Functions)
  endpoints: {
    createPayment: 'https://api.payos.vn/v2/payment-requests',
    getPaymentInfo: 'https://api.payos.vn/v2/payment-requests',
    cancelPayment: 'https://api.payos.vn/v2/payment-requests',
    // Webhook URL sẽ được set trong PayOS dashboard
    webhookUrl: `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/payos-webhook`,
  },

  // Return URL sau khi thanh toán thành công
  // Format: {scheme}://{path}
  // Scheme lấy từ app.json (hiện tại là "petadoption")
  // PayOS sẽ redirect về URL này sau khi thanh toán
  returnUrl: process.env.EXPO_PUBLIC_PAYOS_RETURN_URL || 'petadoption://payment-success',
  cancelUrl: process.env.EXPO_PUBLIC_PAYOS_CANCEL_URL || 'petadoption://payment-cancel',
};

// PayOS payment currency (VND - Vietnamese Dong)
export const PAYOS_CURRENCY = 'VND';

// Minimum amount in VND (PayOS minimum is usually 1,000 VND)
export const PAYOS_MIN_AMOUNT = 1000;

// PayOS description template
export const PAYOS_DESCRIPTION = (petName: string, transactionCode: string) => 
  `Thanh toán cho ${petName} - Mã giao dịch: ${transactionCode}`;

