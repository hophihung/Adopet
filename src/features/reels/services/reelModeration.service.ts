import { supabase } from '@/lib/supabase';
import { Reel } from './reel.service';

export interface PendingReel extends Reel {
  profiles?: {
    id: string;
    full_name?: string | null;
    email?: string | null;
    avatar_url?: string | null;
  };
}

export const ReelModerationService = {
  async getPending(limit: number = 50): Promise<PendingReel[]> {
    const { data, error } = await supabase
      .from('reels')
      .select(
        `
        *,
        profiles (
          id,
          full_name,
          email,
          avatar_url
        )
      `
      )
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data as PendingReel[] | [];
  },

  async approve(reelId: string): Promise<void> {
    const { error } = await supabase.rpc('approve_reel', {
      reel_id_param: reelId,
    });

    if (error) throw error;
  },

  async reject(reelId: string, reason?: string): Promise<void> {
    const { error } = await supabase.rpc('reject_reel', {
      reel_id_param: reelId,
      reason_param: reason || null,
    });

    if (error) throw error;
  },
};

