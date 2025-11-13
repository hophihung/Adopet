import { supabase } from '@/lib/supabase';
import { VirtualPet } from '@/lib/supabaseClient';

export interface CreateVirtualPetData {
  pet_type: 'cat' | 'dog' | 'bird';
  name: string;
}

export interface UpdateVirtualPetData {
  name?: string;
  skin_id?: string;
  background_id?: string;
}

export interface DailyCheckinResult {
  success: boolean;
  exp_gain?: number;
  mood_gain?: number;
  level_up?: boolean;
  pet?: VirtualPet;
  error?: string;
}

export const VirtualPetService = {
  /**
   * Lấy virtual pet của user
   */
  async getVirtualPet(userId: string): Promise<VirtualPet | null> {
    const { data, error } = await supabase
      .from('virtual_pets')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data;
  },

  /**
   * Tạo virtual pet mới
   */
  async createVirtualPet(
    userId: string,
    petData: CreateVirtualPetData
  ): Promise<VirtualPet> {
    // Kiểm tra xem user đã có virtual pet chưa
    const existing = await this.getVirtualPet(userId);
    if (existing) {
      throw new Error('Bạn đã có virtual pet rồi!');
    }

    // Tính exp cần cho level 1
    const expToNextLevel = 100; // Level 1 cần 100 exp

    const { data, error } = await supabase
      .from('virtual_pets')
      .insert({
        user_id: userId,
        pet_type: petData.pet_type,
        name: petData.name,
        level: 1,
        exp: 0,
        exp_to_next_level: expToNextLevel,
        mood: 100,
        streak_days: 0,
        skin_id: 'default',
        background_id: 'default',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Cập nhật thông tin virtual pet
   */
  async updateVirtualPet(
    petId: string,
    userId: string,
    updates: UpdateVirtualPetData
  ): Promise<VirtualPet> {
    // Kiểm tra quyền sở hữu
    const { data: existingPet, error: fetchError } = await supabase
      .from('virtual_pets')
      .select('user_id')
      .eq('id', petId)
      .single();

    if (fetchError) throw fetchError;
    if (existingPet.user_id !== userId) {
      throw new Error('Bạn không có quyền chỉnh sửa virtual pet này');
    }

    const { data, error } = await supabase
      .from('virtual_pets')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', petId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Điểm danh hàng ngày (daily check-in)
   */
  async dailyCheckin(petId: string): Promise<DailyCheckinResult> {
    const { data, error } = await supabase.rpc('daily_checkin_virtual_pet', {
      pet_id: petId,
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    // Parse result từ database function
    const result = data as any;
    return {
      success: result.success || false,
      exp_gain: result.exp_gain,
      mood_gain: result.mood_gain,
      level_up: result.level_up || false,
      pet: result.pet as VirtualPet,
      error: result.error,
    };
  },

  /**
   * Xóa virtual pet
   */
  async deleteVirtualPet(petId: string, userId: string): Promise<boolean> {
    // Kiểm tra quyền sở hữu
    const { data: existingPet, error: fetchError } = await supabase
      .from('virtual_pets')
      .select('user_id')
      .eq('id', petId)
      .single();

    if (fetchError) throw fetchError;
    if (existingPet.user_id !== userId) {
      throw new Error('Bạn không có quyền xóa virtual pet này');
    }

    const { error } = await supabase
      .from('virtual_pets')
      .delete()
      .eq('id', petId);

    if (error) throw error;
    return true;
  },

  /**
   * Kiểm tra xem đã điểm danh hôm nay chưa
   */
  async hasCheckedInToday(petId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('virtual_pets')
      .select('last_checkin_date')
      .eq('id', petId)
      .single();

    if (error) throw error;

    if (!data.last_checkin_date) return false;

    const today = new Date().toISOString().split('T')[0];
    const lastCheckin = new Date(data.last_checkin_date)
      .toISOString()
      .split('T')[0];

    return today === lastCheckin;
  },

  /**
   * Tính số ngày không điểm danh
   */
  async getDaysSinceLastCheckin(petId: string): Promise<number> {
    const { data, error } = await supabase
      .from('virtual_pets')
      .select('last_checkin_date')
      .eq('id', petId)
      .single();

    if (error) throw error;

    if (!data.last_checkin_date) return 999; // Chưa từng điểm danh

    const today = new Date();
    const lastCheckin = new Date(data.last_checkin_date);
    const diffTime = today.getTime() - lastCheckin.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  },

  /**
   * Feed pet - Tăng mood và exp (chỉ 1 lần/ngày)
   */
  async feedPet(petId: string): Promise<{ success: boolean; exp_gain: number; mood_gain: number; pet?: VirtualPet; error?: string }> {
    const { data: pet, error: fetchError } = await supabase
      .from('virtual_pets')
      .select('*')
      .eq('id', petId)
      .single();

    if (fetchError) {
      return { success: false, exp_gain: 0, mood_gain: 0, error: fetchError.message };
    }

    // Check if already fed today
    if (pet.last_feed_date) {
      const today = new Date().toISOString().split('T')[0];
      const lastFeed = new Date(pet.last_feed_date).toISOString().split('T')[0];
      if (today === lastFeed) {
        return { success: false, exp_gain: 0, mood_gain: 0, error: 'Đã cho ăn hôm nay rồi! Hãy đợi đến ngày mai.' };
      }
    }

    const expGain = 15;
    const moodGain = 5;
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('virtual_pets')
      .update({
        exp: pet.exp + expGain,
        mood: Math.min(100, pet.mood + moodGain),
        last_feed_date: today,
        updated_at: new Date().toISOString(),
      })
      .eq('id', petId)
      .select()
      .single();

    if (error) {
      return { success: false, exp_gain: 0, mood_gain: 0, error: error.message };
    }

    return { success: true, exp_gain: expGain, mood_gain: moodGain, pet: data };
  },

  /**
   * Play with pet - Tăng mood và exp nhiều hơn (cooldown 5 phút)
   */
  async playWithPet(petId: string): Promise<{ success: boolean; exp_gain: number; mood_gain: number; pet?: VirtualPet; error?: string }> {
    const { data: pet, error: fetchError } = await supabase
      .from('virtual_pets')
      .select('*')
      .eq('id', petId)
      .single();

    if (fetchError) {
      return { success: false, exp_gain: 0, mood_gain: 0, error: fetchError.message };
    }

    // Check cooldown (5 minutes)
    if (pet.last_play_time) {
      const now = new Date().getTime();
      const lastPlay = new Date(pet.last_play_time).getTime();
      const cooldown = 5 * 60 * 1000; // 5 minutes
      if (now - lastPlay < cooldown) {
        const remaining = cooldown - (now - lastPlay);
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        return { 
          success: false, 
          exp_gain: 0, 
          mood_gain: 0, 
          error: `Còn ${minutes}:${seconds.toString().padStart(2, '0')} để chơi lại` 
        };
      }
    }

    const expGain = 25;
    const moodGain = 10;

    const { data, error } = await supabase
      .from('virtual_pets')
      .update({
        exp: pet.exp + expGain,
        mood: Math.min(100, pet.mood + moodGain),
        last_play_time: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', petId)
      .select()
      .single();

    if (error) {
      return { success: false, exp_gain: 0, mood_gain: 0, error: error.message };
    }

    return { success: true, exp_gain: expGain, mood_gain: moodGain, pet: data };
  },

  /**
   * Clean pet - Tăng mood (chỉ 1 lần/ngày)
   */
  async cleanPet(petId: string): Promise<{ success: boolean; mood_gain: number; pet?: VirtualPet; error?: string }> {
    const { data: pet, error: fetchError } = await supabase
      .from('virtual_pets')
      .select('*')
      .eq('id', petId)
      .single();

    if (fetchError) {
      return { success: false, mood_gain: 0, error: fetchError.message };
    }

    // Check if already cleaned today
    if (pet.last_clean_date) {
      const today = new Date().toISOString().split('T')[0];
      const lastClean = new Date(pet.last_clean_date).toISOString().split('T')[0];
      if (today === lastClean) {
        return { success: false, mood_gain: 0, error: 'Đã tắm hôm nay rồi! Hãy đợi đến ngày mai.' };
      }
    }

    const moodGain = 8;
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('virtual_pets')
      .update({
        mood: Math.min(100, pet.mood + moodGain),
        last_clean_date: today,
        updated_at: new Date().toISOString(),
      })
      .eq('id', petId)
      .select()
      .single();

    if (error) {
      return { success: false, mood_gain: 0, error: error.message };
    }

    return { success: true, mood_gain: moodGain, pet: data };
  },

  /**
   * Mini game reward - Thưởng EXP từ mini game (chỉ 1 lần/ngày)
   */
  async miniGameReward(petId: string, expGain: number): Promise<{ success: boolean; pet?: VirtualPet; error?: string }> {
    const { data: pet, error: fetchError } = await supabase
      .from('virtual_pets')
      .select('*')
      .eq('id', petId)
      .single();

    if (fetchError) {
      return { success: false, error: fetchError.message };
    }

    // Check if already played mini game today
    if (pet.last_minigame_date) {
      const today = new Date().toISOString().split('T')[0];
      const lastMinigame = new Date(pet.last_minigame_date).toISOString().split('T')[0];
      if (today === lastMinigame) {
        return { success: false, error: 'Đã chơi mini game hôm nay rồi! Hãy đợi đến ngày mai.' };
      }
    }

    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('virtual_pets')
      .update({
        exp: pet.exp + expGain,
        last_minigame_date: today,
        updated_at: new Date().toISOString(),
      })
      .eq('id', petId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, pet: data };
  },
};

