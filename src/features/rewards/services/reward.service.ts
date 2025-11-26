import { supabase } from '@/lib/supabase';

export interface UserReward {
  id: string;
  user_id: string;
  points: number;
  cashback_balance: number;
  total_points_earned: number;
  total_points_spent: number;
  total_cashback_earned: number;
  total_cashback_used: number;
  created_at: string;
  updated_at: string;
}

export interface RewardTransaction {
  id: string;
  user_id: string;
  reward_id: string;
  transaction_type: 'earn' | 'spend' | 'cashback_earn' | 'cashback_use' | 'expire';
  points_amount: number;
  cashback_amount: number;
  source_type: 'order' | 'transaction' | 'referral' | 'promotion' | 'manual' | 'purchase' | 'redemption';
  source_id?: string;
  description?: string;
  metadata?: any;
  created_at: string;
  expires_at?: string;
}

export class RewardService {
  // Get user reward record
  static async getUserReward(userId: string): Promise<UserReward | null> {
    const { data, error } = await supabase
      .from('user_rewards')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  // Get reward transactions
  static async getTransactions(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<RewardTransaction[]> {
    const { data, error } = await supabase
      .from('reward_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data || [];
  }

  // Spend points (for future use - e.g., redeem rewards)
  static async spendPoints(
    userId: string,
    points: number,
    description: string,
    metadata?: any
  ): Promise<RewardTransaction> {
    // Get reward record
    const reward = await this.getUserReward(userId);
    if (!reward) {
      throw new Error('Reward record not found');
    }

    if (reward.points < points) {
      throw new Error('Insufficient points');
    }

    // Update reward record
    const { data: updatedReward, error: updateError } = await supabase
      .from('user_rewards')
      .update({
        points: reward.points - points,
        total_points_spent: reward.total_points_spent + points,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reward.id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Create transaction record
    const { data: transaction, error: transactionError } = await supabase
      .from('reward_transactions')
      .insert({
        user_id: userId,
        reward_id: reward.id,
        transaction_type: 'spend',
        points_amount: points,
        cashback_amount: 0,
        source_type: 'redemption',
        description,
        metadata,
      })
      .select()
      .single();

    if (transactionError) throw transactionError;
    return transaction;
  }

  // Use cashback (for future use - e.g., apply to order)
  static async useCashback(
    userId: string,
    amount: number,
    description: string,
    metadata?: any
  ): Promise<RewardTransaction> {
    // Get reward record
    const reward = await this.getUserReward(userId);
    if (!reward) {
      throw new Error('Reward record not found');
    }

    if (reward.cashback_balance < amount) {
      throw new Error('Insufficient cashback balance');
    }

    // Update reward record
    const { data: updatedReward, error: updateError } = await supabase
      .from('user_rewards')
      .update({
        cashback_balance: reward.cashback_balance - amount,
        total_cashback_used: reward.total_cashback_used + amount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reward.id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Create transaction record
    const { data: transaction, error: transactionError } = await supabase
      .from('reward_transactions')
      .insert({
        user_id: userId,
        reward_id: reward.id,
        transaction_type: 'cashback_use',
        points_amount: 0,
        cashback_amount: amount,
        source_type: 'purchase',
        description,
        metadata,
      })
      .select()
      .single();

    if (transactionError) throw transactionError;
    return transaction;
  }
}

