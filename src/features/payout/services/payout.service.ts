import { supabase } from '@/lib/supabase';

export interface PayoutRecord {
  id: string;
  escrow_account_id: string;
  seller_id: string;
  payout_amount: number;
  platform_fee: number;
  payout_method: 'payos_payout' | 'bank_transfer' | 'manual' | 'other';
  bank_account_id?: string;
  bank_name?: string;
  account_number?: string;
  account_holder_name?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  external_transaction_id?: string;
  external_reference?: string;
  processed_at?: string;
  processed_by?: string;
  completed_at?: string;
  failed_at?: string;
  failure_reason?: string;
  admin_note?: string;
  created_at: string;
  updated_at: string;
}

export class PayoutService {
  // Get payout records by seller
  static async getBySeller(sellerId: string): Promise<PayoutRecord[]> {
    const { data, error } = await supabase
      .from('payout_records')
      .select('*')
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Get payout records by status (for admin)
  static async getByStatus(status: PayoutRecord['status']): Promise<PayoutRecord[]> {
    const { data, error } = await supabase
      .from('payout_records')
      .select(`
        *,
        escrow_account:escrow_accounts(
          order_id,
          transaction_id,
          amount
        )
      `)
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Get all pending payouts (for admin)
  static async getPending(): Promise<PayoutRecord[]> {
    return this.getByStatus('pending');
  }

  // Create payout record (called after escrow released)
  static async create(escrowAccountId: string, payoutMethod: PayoutRecord['payout_method'] = 'bank_transfer'): Promise<string> {
    const { data, error } = await supabase.rpc('create_payout_record', {
      escrow_account_id_param: escrowAccountId,
      payout_method_param: payoutMethod,
    });

    if (error) throw error;
    return data;
  }

  // Update payout status (admin only)
  static async updateStatus(
    payoutId: string,
    status: PayoutRecord['status'],
    externalTransactionId?: string,
    failureReason?: string,
    adminNote?: string
  ): Promise<void> {
    const { error } = await supabase.rpc('update_payout_status', {
      payout_id_param: payoutId,
      status_param: status,
      external_transaction_id_param: externalTransactionId || null,
      failure_reason_param: failureReason || null,
      admin_note_param: adminNote || null,
    });

    if (error) throw error;
  }

  // Process payout (call payout function)
  static async processPayout(escrowAccountId: string, payoutMethod: PayoutRecord['payout_method'] = 'bank_transfer'): Promise<any> {
    const { data, error } = await supabase.functions.invoke('payout-to-seller', {
      body: {
        escrow_account_id: escrowAccountId,
        payout_method: payoutMethod,
      },
    });

    if (error) throw error;
    return data;
  }
}

