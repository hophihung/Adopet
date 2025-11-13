import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  VirtualPetService,
  CreateVirtualPetData,
  UpdateVirtualPetData,
  DailyCheckinResult,
} from '../services/virtual-pet.service';
import { VirtualPet } from '@/lib/supabaseClient';
import { getMoodFromValue } from '@/src/config/virtualPet/animations';

export function useVirtualPet() {
  const { user } = useAuth();
  const [virtualPet, setVirtualPet] = useState<VirtualPet | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);
  const [daysSinceLastCheckin, setDaysSinceLastCheckin] = useState(0);

  /**
   * Load virtual pet của user
   */
  const fetchVirtualPet = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const pet = await VirtualPetService.getVirtualPet(user.id);
      setVirtualPet(pet);

      if (pet) {
        // Kiểm tra xem đã điểm danh hôm nay chưa
        const checkedIn = await VirtualPetService.hasCheckedInToday(pet.id);
        setHasCheckedInToday(checkedIn);

        // Tính số ngày không điểm danh
        const days = await VirtualPetService.getDaysSinceLastCheckin(pet.id);
        setDaysSinceLastCheckin(days);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch virtual pet';
      setError(message);
      console.error('Error fetching virtual pet:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Tạo virtual pet mới
   */
  const createVirtualPet = async (petData: CreateVirtualPetData) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      setLoading(true);
      setError(null);

      const newPet = await VirtualPetService.createVirtualPet(
        user.id,
        petData
      );
      setVirtualPet(newPet);
      setHasCheckedInToday(false);
      setDaysSinceLastCheckin(0);

      return newPet;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to create virtual pet';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Cập nhật virtual pet
   */
  const updateVirtualPet = async (
    petId: string,
    updates: UpdateVirtualPetData
  ) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      setLoading(true);
      setError(null);

      const updatedPet = await VirtualPetService.updateVirtualPet(
        petId,
        user.id,
        updates
      );
      setVirtualPet(updatedPet);

      return updatedPet;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to update virtual pet';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Điểm danh hàng ngày
   */
  const dailyCheckin = async (): Promise<DailyCheckinResult | null> => {
    if (!virtualPet || !user) {
      throw new Error('No virtual pet found');
    }

    try {
      setCheckingIn(true);
      setError(null);

      const result = await VirtualPetService.dailyCheckin(virtualPet.id);

      if (result.success && result.pet) {
        setVirtualPet(result.pet);
        setHasCheckedInToday(true);
        setDaysSinceLastCheckin(0);
      } else {
        setError(result.error || 'Failed to check in');
      }

      return result;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to check in';
      setError(message);
      return null;
    } finally {
      setCheckingIn(false);
    }
  };

  /**
   * Xóa virtual pet
   */
  const deleteVirtualPet = async (petId: string) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      setLoading(true);
      setError(null);

      await VirtualPetService.deleteVirtualPet(petId, user.id);
      setVirtualPet(null);
      setHasCheckedInToday(false);
      setDaysSinceLastCheckin(0);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to delete virtual pet';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Tính phần trăm exp hiện tại
   */
  const getExpProgress = (): number => {
    if (!virtualPet) return 0;
    return (virtualPet.exp / virtualPet.exp_to_next_level) * 100;
  };

  /**
   * Lấy mood state từ mood value
   */
  const getCurrentMoodState = (): 'idle' | 'happy' | 'sad' | 'eating' | 'sleeping' | 'playing' | 'levelUp' => {
    if (!virtualPet) return 'idle';
    return getMoodFromValue(virtualPet.mood);
  };

  // Load dữ liệu ban đầu
  useEffect(() => {
    if (user) {
      fetchVirtualPet();
    } else {
      setVirtualPet(null);
      setHasCheckedInToday(false);
      setDaysSinceLastCheckin(0);
    }
  }, [user]);

  /**
   * Feed pet
   */
  const feedPet = async () => {
    if (!virtualPet || !user) {
      throw new Error('No virtual pet found');
    }

    try {
      setLoading(true);
      const result = await VirtualPetService.feedPet(virtualPet.id);
      if (result.success && result.pet) {
        setVirtualPet(result.pet);
      }
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to feed pet';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Play with pet
   */
  const playWithPet = async () => {
    if (!virtualPet || !user) {
      throw new Error('No virtual pet found');
    }

    try {
      setLoading(true);
      const result = await VirtualPetService.playWithPet(virtualPet.id);
      if (result.success && result.pet) {
        setVirtualPet(result.pet);
      }
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to play with pet';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Clean pet
   */
  const cleanPet = async () => {
    if (!virtualPet || !user) {
      throw new Error('No virtual pet found');
    }

    try {
      setLoading(true);
      const result = await VirtualPetService.cleanPet(virtualPet.id);
      if (result.success && result.pet) {
        setVirtualPet(result.pet);
      }
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to clean pet';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Mini game reward
   */
  const miniGameReward = async (expGain: number) => {
    if (!virtualPet || !user) {
      throw new Error('No virtual pet found');
    }

    try {
      setLoading(true);
      const result = await VirtualPetService.miniGameReward(virtualPet.id, expGain);
      if (result.success && result.pet) {
        setVirtualPet(result.pet);
      }
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reward';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    // Data
    virtualPet,
    loading,
    error,
    checkingIn,
    hasCheckedInToday,
    daysSinceLastCheckin,

    // Computed values
    expProgress: getExpProgress(),
    currentMoodState: getCurrentMoodState(),

    // Actions
    createVirtualPet,
    updateVirtualPet,
    dailyCheckin,
    deleteVirtualPet,
    fetchVirtualPet,
    feedPet,
    playWithPet,
    cleanPet,
    miniGameReward,

    // Utilities
    hasVirtualPet: !!virtualPet,
  };
}

