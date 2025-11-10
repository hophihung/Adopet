import { supabase } from '../../lib/supabaseClient';
import { PAYOS_CONFIG, PAYOS_CURRENCY } from '../config/payos.config';

const PAYOS_MIN_AMOUNT = 1000; // Minimum amount for PayOS (VND)

export interface PayOSSubscriptionPaymentLink {
  payment_url: string;
  payment_link_id: string;
  qr_code: string;
}

/**
 * PayOS Subscription Service
 * Handles PayOS payment for subscription plans
 */
export const PayOSSubscriptionService = {
  /**
   * Create a PayOS Payment Link for a subscription
   */
  async createSubscriptionPaymentLink(
    subscriptionId: string,
    planName: string,
    amount: number,
    billingCycle: 'monthly' | 'yearly',
    currency: string = PAYOS_CURRENCY
  ): Promise<PayOSSubscriptionPaymentLink> {
    // Validate amount: không tạo payment link cho gói miễn phí
    if (!amount || amount <= 0) {
      throw new Error('Cannot create payment link for free subscription (amount = 0)');
    }

    // Validate minimum amount
    if (amount < PAYOS_MIN_AMOUNT) {
      throw new Error(
        `Số tiền tối thiểu là ${PAYOS_MIN_AMOUNT.toLocaleString('vi-VN')} VNĐ`
      );
    }

    // Call Supabase Edge Function to create payment link
    const { data, error } = await supabase.functions.invoke('create-payos-payment-link', {
      body: {
        transaction_id: subscriptionId, // Reuse transaction_id field for subscription_id
        amount: Math.round(amount), // PayOS requires integer amounts
        currency: currency,
        pet_name: `Gói ${planName} - ${billingCycle === 'monthly' ? 'Hàng tháng' : 'Hàng năm'}`,
        transaction_code: `SUB-${subscriptionId.substring(0, 8)}`, // Subscription code
        return_url: PAYOS_CONFIG.returnUrl,
        cancel_url: PAYOS_CONFIG.cancelUrl,
      },
    });

    if (error) {
      console.error('Edge Function error:', error);
      
      let errorMessage = 'Không thể tạo payment link';
      if (error.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      throw new Error(errorMessage);
    }

    // Check if Edge Function returned an error in the response
    if (data?.error) {
      throw new Error(data.error);
    }

    if (!data?.payment_url || !data?.payment_link_id) {
      throw new Error('Invalid response from payment link creation');
    }

    return {
      payment_url: data.payment_url,
      payment_link_id: data.payment_link_id,
      qr_code: data.qr_code || '',
    };
  },

  /**
   * Get payment link information
   */
  async getPaymentLinkInfo(paymentLinkId: string) {
    const { data, error } = await supabase.functions.invoke('get-payos-payment-info', {
      body: {
        payment_link_id: paymentLinkId,
      },
    });

    if (error) {
      throw new Error(error.message || 'Không thể lấy thông tin payment link');
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    return data;
  },
};

