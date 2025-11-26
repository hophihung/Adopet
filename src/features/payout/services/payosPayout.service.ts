import { supabase } from '@/lib/supabase';

/**
 * PayOS Payout Service
 * Tích hợp với PayOS Payout API để chuyển tiền cho seller
 * 
 * Note: PayOS có thể không có Payout API, trong trường hợp đó cần dùng bank transfer API khác
 * hoặc manual transfer
 */
export interface PayOSPayoutRequest {
  seller_bank_account: {
    bank_name: string;
    account_number: string;
    account_holder_name: string;
    branch_name?: string;
  };
  amount: number;
  description: string;
  reference: string; // escrow_account_id or payout_id
}

export interface PayOSPayoutResponse {
  payout_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  transaction_id?: string;
  estimated_completion_time?: string;
}

export class PayOSPayoutService {
  /**
   * Check if PayOS Payout API is available
   */
  static async isAvailable(): Promise<boolean> {
    // Check if PayOS has payout API
    // For now, return false as PayOS may not have this feature
    // TODO: Check PayOS documentation for payout API
    return false;
  }

  /**
   * Create payout via PayOS Payout API
   * Note: This is a placeholder - PayOS may not have payout API
   * If not available, use bank transfer API or manual transfer
   */
  static async createPayout(request: PayOSPayoutRequest): Promise<PayOSPayoutResponse> {
    // TODO: Implement PayOS Payout API integration
    // Reference: https://payos.vn/docs/api/ (check for payout endpoints)
    
    // For now, throw error indicating API not available
    throw new Error('PayOS Payout API không khả dụng. Vui lòng sử dụng bank transfer hoặc manual transfer.');
  }

  /**
   * Alternative: Use bank transfer API
   * Integrate with VNPay, MoMo, or other bank transfer APIs
   */
  static async createBankTransferPayout(
    bankAccount: {
      bank_name: string;
      account_number: string;
      account_holder_name: string;
      branch_name?: string;
    },
    amount: number,
    reference: string
  ): Promise<{ transaction_id: string; status: string }> {
    // TODO: Integrate with bank transfer API
    // Options:
    // 1. VNPay Bank Transfer API
    // 2. MoMo Payout API
    // 3. ZaloPay Payout API
    // 4. Direct bank API integration
    
    // For now, return mock response
    // In production, implement actual API call
    return {
      transaction_id: `BANK_${Date.now()}`,
      status: 'pending',
    };
  }

  /**
   * Get payout status
   */
  static async getPayoutStatus(payoutId: string): Promise<PayOSPayoutResponse> {
    // TODO: Implement status check
    throw new Error('Not implemented');
  }
}

/**
 * Alternative Payout Service
 * Use this if PayOS doesn't have payout API
 */
export class BankTransferPayoutService {
  /**
   * Create bank transfer payout
   * This would integrate with a bank transfer service
   */
  static async createPayout(
    bankAccount: {
      bank_name: string;
      account_number: string;
      account_holder_name: string;
      branch_name?: string;
    },
    amount: number,
    reference: string,
    description?: string
  ): Promise<{ transaction_id: string; status: string }> {
    // TODO: Implement actual bank transfer API
    // For now, this is a placeholder
    
    // Example integration with a bank transfer service:
    // const response = await fetch('https://bank-transfer-api.com/transfer', {
    //   method: 'POST',
    //   headers: { 'Authorization': 'Bearer ...' },
    //   body: JSON.stringify({
    //     to_account: bankAccount.account_number,
    //     to_bank: bankAccount.bank_name,
    //     to_name: bankAccount.account_holder_name,
    //     amount,
    //     reference,
    //     description,
    //   }),
    // });
    
    // For MVP, return mock - admin will process manually
    return {
      transaction_id: `MANUAL_${Date.now()}`,
      status: 'pending_manual',
    };
  }
}

