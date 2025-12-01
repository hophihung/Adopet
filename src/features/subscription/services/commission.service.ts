import { supabase } from '@/lib/supabase';

export interface CommissionTier {
  tier_name: string;
  commission_rate: number;
  processing_fee_rate: number;
  min_reputation_points: number;
  max_reputation_points: number | null;
}

export interface SellerCommissionInfo {
  current_tier: CommissionTier;
  next_tier: CommissionTier | null;
  reputation_points: number;
  points_to_next_tier: number | null;
  total_commission_rate: number;
}

export const CommissionService = {
  /**
   * Lấy commission tier hiện tại của seller dựa trên reputation points
   */
  async getCurrentCommissionTier(reputationPoints: number): Promise<CommissionTier | null> {
    const { data, error } = await supabase.rpc('get_commission_tier_by_reputation', {
      reputation_points: reputationPoints,
    });

    if (error) {
      console.error('Error getting commission tier:', error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    const tier = data[0];
    
    // Get full tier info
    const { data: tierData, error: tierError } = await supabase
      .from('commission_tiers')
      .select('*')
      .eq('tier_name', tier.tier_name)
      .eq('is_active', true)
      .single();

    if (tierError || !tierData) {
      return {
        tier_name: tier.tier_name,
        commission_rate: parseFloat(tier.commission_rate),
        processing_fee_rate: parseFloat(tier.processing_fee_rate),
        min_reputation_points: 0,
        max_reputation_points: null,
      };
    }

    return {
      tier_name: tierData.tier_name,
      commission_rate: parseFloat(tierData.commission_rate),
      processing_fee_rate: parseFloat(tierData.processing_fee_rate),
      min_reputation_points: tierData.min_reputation_points,
      max_reputation_points: tierData.max_reputation_points,
    };
  },

  /**
   * Lấy tất cả commission tiers
   */
  async getAllCommissionTiers(): Promise<CommissionTier[]> {
    const { data, error } = await supabase
      .from('commission_tiers')
      .select('*')
      .eq('is_active', true)
      .order('min_reputation_points', { ascending: true });

    if (error) {
      console.error('Error getting commission tiers:', error);
      return [];
    }

    return (data || []).map((tier) => ({
      tier_name: tier.tier_name,
      commission_rate: parseFloat(tier.commission_rate),
      processing_fee_rate: parseFloat(tier.processing_fee_rate),
      min_reputation_points: tier.min_reputation_points,
      max_reputation_points: tier.max_reputation_points,
    }));
  },

  /**
   * Lấy thông tin commission đầy đủ cho seller
   */
  async getSellerCommissionInfo(
    reputationPoints: number
  ): Promise<SellerCommissionInfo | null> {
    const [currentTier, allTiers] = await Promise.all([
      this.getCurrentCommissionTier(reputationPoints),
      this.getAllCommissionTiers(),
    ]);

    if (!currentTier) {
      return null;
    }

    // Find next tier
    const currentTierIndex = allTiers.findIndex(
      (t) => t.tier_name === currentTier.tier_name
    );
    const nextTier =
      currentTierIndex >= 0 && currentTierIndex < allTiers.length - 1
        ? allTiers[currentTierIndex + 1]
        : null;

    // Calculate points to next tier
    let pointsToNextTier: number | null = null;
    if (nextTier) {
      pointsToNextTier = Math.max(0, nextTier.min_reputation_points - reputationPoints);
    }

    return {
      current_tier: currentTier,
      next_tier: nextTier,
      reputation_points: reputationPoints,
      points_to_next_tier: pointsToNextTier,
      total_commission_rate: currentTier.commission_rate + currentTier.processing_fee_rate,
    };
  },
};

