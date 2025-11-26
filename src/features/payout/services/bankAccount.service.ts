import { supabase } from '@/lib/supabase';

export interface SellerBankAccount {
  id: string;
  seller_id: string;
  bank_name: string;
  account_number: string;
  account_holder_name: string;
  branch_name?: string;
  is_verified: boolean;
  verified_at?: string;
  verified_by?: string;
  is_active: boolean;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateBankAccountInput {
  bank_name: string;
  account_number: string;
  account_holder_name: string;
  branch_name?: string;
  is_primary?: boolean;
}

export interface UpdateBankAccountInput extends Partial<CreateBankAccountInput> {
  id: string;
}

export class BankAccountService {
  // Get all bank accounts for seller
  static async getBySeller(sellerId: string): Promise<SellerBankAccount[]> {
    const { data, error } = await supabase
      .from('seller_bank_accounts')
      .select('*')
      .eq('seller_id', sellerId)
      .eq('is_active', true)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Get primary bank account
  static async getPrimary(sellerId: string): Promise<SellerBankAccount | null> {
    const { data, error } = await supabase.rpc('get_seller_primary_bank_account', {
      seller_id_param: sellerId,
    });

    if (error) throw error;
    return data && data.length > 0 ? data[0] : null;
  }

  // Create bank account
  static async create(input: CreateBankAccountInput, sellerId: string): Promise<SellerBankAccount> {
    // If setting as primary, unset other primary accounts
    if (input.is_primary) {
      await supabase
        .from('seller_bank_accounts')
        .update({ is_primary: false })
        .eq('seller_id', sellerId)
        .eq('is_primary', true);
    }

    const { data, error } = await supabase
      .from('seller_bank_accounts')
      .insert({
        ...input,
        seller_id: sellerId,
        is_primary: input.is_primary ?? false,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Update bank account
  static async update(input: UpdateBankAccountInput, sellerId: string): Promise<SellerBankAccount> {
    const { id, ...updateData } = input;

    // If setting as primary, unset other primary accounts
    if (updateData.is_primary) {
      await supabase
        .from('seller_bank_accounts')
        .update({ is_primary: false })
        .eq('seller_id', sellerId)
        .eq('is_primary', true)
        .neq('id', id);
    }

    const { data, error } = await supabase
      .from('seller_bank_accounts')
      .update(updateData)
      .eq('id', id)
      .eq('seller_id', sellerId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Delete bank account (soft delete)
  static async delete(bankAccountId: string, sellerId: string): Promise<void> {
    const { error } = await supabase
      .from('seller_bank_accounts')
      .update({ is_active: false })
      .eq('id', bankAccountId)
      .eq('seller_id', sellerId);

    if (error) throw error;
  }

  // Set as primary
  static async setPrimary(bankAccountId: string, sellerId: string): Promise<void> {
    // Unset all primary accounts
    await supabase
      .from('seller_bank_accounts')
      .update({ is_primary: false })
      .eq('seller_id', sellerId)
      .eq('is_primary', true);

    // Set this as primary
    const { error } = await supabase
      .from('seller_bank_accounts')
      .update({ is_primary: true })
      .eq('id', bankAccountId)
      .eq('seller_id', sellerId);

    if (error) throw error;
  }
}

