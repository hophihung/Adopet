import { supabase } from '@/lib/supabase';
import { PAYOS_CONFIG, PAYOS_CURRENCY, PAYOS_MIN_AMOUNT } from '@/src/config/payos.config';

export interface PayOSPaymentLink {
  payment_url: string;
  payment_link_id: string;
  qr_code: string;
}

/**
 * PayOS Transaction Service
 * Handles PayOS payment for pet transactions
 */
export const PayOSTransactionService = {
  /**
   * Create a PayOS Payment Link for a transaction
   * This will be called from a Supabase Edge Function or your backend
   */
  async createPaymentLink(
    transactionId: string,
    amount: number,
    petName: string,
    transactionCode: string,
    currency: string = PAYOS_CURRENCY
  ): Promise<PayOSPaymentLink> {
    // Validate minimum amount
    if (amount < PAYOS_MIN_AMOUNT) {
      throw new Error(
        `Số tiền tối thiểu là ${PAYOS_MIN_AMOUNT.toLocaleString('vi-VN')} VNĐ`
      );
    }

    // Call Supabase Edge Function to create payment link
    // The Edge Function will handle the PayOS API call securely
    const { data, error } = await supabase.functions.invoke('create-payos-payment-link', {
      body: {
        transaction_id: transactionId,
        amount: Math.round(amount), // PayOS requires integer amounts
        currency: currency,
        pet_name: petName,
        transaction_code: transactionCode,
        return_url: PAYOS_CONFIG.returnUrl,
        cancel_url: PAYOS_CONFIG.cancelUrl,
      },
    });

    if (error) {
      console.error('Error creating payment link:', error);
      throw new Error(error.message || 'Không thể tạo payment link');
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
      console.error('Error getting payment info:', error);
      throw new Error(error.message || 'Không thể lấy thông tin thanh toán');
    }

    return data;
  },

  /**
   * Confirm a transaction after successful PayOS payment
   */
  async confirmTransactionAfterPayment(
    transactionId: string,
    paymentLinkId: string,
    paymentProofUrl?: string
  ) {
    const { error } = await supabase.rpc('confirm_transaction_with_payos', {
      transaction_id_param: transactionId,
      payos_payment_link_id: paymentLinkId,
      payment_proof_url_param: paymentProofUrl || null,
    });

    if (error) {
      console.error('Error confirming transaction after payment:', error);
      throw new Error(error.message || 'Không thể xác nhận giao dịch');
    }

    // Return updated transaction
    const { data: transaction } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    return transaction;
  },

  /**
   * Cancel a payment link
   */
  async cancelPaymentLink(paymentLinkId: string) {
    const { data, error } = await supabase.functions.invoke('cancel-payos-payment-link', {
      body: {
        payment_link_id: paymentLinkId,
      },
    });

    if (error) {
      console.error('Error canceling payment link:', error);
      throw new Error(error.message || 'Không thể hủy payment link');
    }

    return data;
  },
};

