import { useState, useEffect } from 'react';
import { PetService, PetCreateData, PetUpdateData } from '../services/pet.service';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';

export interface PetLimitInfo {
  currentCount: number;
  limit: number;
  canCreate: boolean;
  plan: string;
}

export function usePetManagement() {
  const { user } = useAuth();
  const { subscription } = useSubscription();
  const [userPets, setUserPets] = useState<any[]>([]);
  const [availablePets, setAvailablePets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [petLimitInfo, setPetLimitInfo] = useState<PetLimitInfo | null>(null);

  // Lấy thông tin giới hạn pet
  const fetchPetLimitInfo = async () => {
    if (!user || !subscription) return;

    try {
      const { canCreate, currentCount, limit } = await PetService.canCreatePet(
        user.id, 
        subscription.plan
      );
      
      setPetLimitInfo({
        currentCount,
        limit,
        canCreate,
        plan: subscription.plan
      });
    } catch (err) {
      console.error('Error fetching pet limit info:', err);
    }
  };

  // Lấy pets của user
  const fetchUserPets = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      const pets = await PetService.getUserPets(user.id);
      setUserPets(pets);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch user pets';
      setError(message);
      console.error('Error fetching user pets:', err);
    } finally {
      setLoading(false);
    }
  };

  // Lấy pets có sẵn (cho swipe)
  const fetchAvailablePets = async () => {
    try {
      setLoading(true);
      setError(null);
      const pets = await PetService.getAvailablePets(user?.id);
      setAvailablePets(pets);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch available pets';
      setError(message);
      console.error('Error fetching available pets:', err);
    } finally {
      setLoading(false);
    }
  };

  // Tạo pet mới
  const createPet = async (petData: PetCreateData) => {
    if (!user || !subscription) {
      throw new Error('User not authenticated or no subscription');
    }

    try {
      setLoading(true);
      setError(null);
      
      const newPet = await PetService.createPet(user.id, petData, subscription.plan);
      setUserPets(prev => [newPet, ...prev]);
      
      // Cập nhật thông tin giới hạn
      await fetchPetLimitInfo();
      
      return newPet;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create pet';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Cập nhật pet
  const updatePet = async (petId: string, petData: PetUpdateData) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      setLoading(true);
      setError(null);
      
      const updatedPet = await PetService.updatePet(petId, user.id, petData);
      setUserPets(prev => 
        prev.map(pet => pet.id === petId ? updatedPet : pet)
      );
      
      return updatedPet;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update pet';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Xóa pet
  const deletePet = async (petId: string) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      setLoading(true);
      setError(null);
      
      await PetService.deletePet(petId, user.id);
      setUserPets(prev => prev.filter(pet => pet.id !== petId));
      
      // Cập nhật thông tin giới hạn
      await fetchPetLimitInfo();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete pet';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Toggle availability
  const togglePetAvailability = async (petId: string) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      setLoading(true);
      setError(null);
      
      const updatedPet = await PetService.togglePetAvailability(petId, user.id);
      setUserPets(prev => 
        prev.map(pet => pet.id === petId ? updatedPet : pet)
      );
      
      return updatedPet;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to toggle pet availability';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Lấy pet theo ID
  const getPetById = async (petId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const pet = await PetService.getPetById(petId);
      return pet;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch pet';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Load dữ liệu ban đầu
  useEffect(() => {
    if (user && subscription) {
      fetchUserPets();
      fetchPetLimitInfo();
    }
  }, [user, subscription]);

  return {
    // Data
    userPets,
    availablePets,
    petLimitInfo,
    loading,
    error,
    
    // Actions
    createPet,
    updatePet,
    deletePet,
    togglePetAvailability,
    getPetById,
    fetchUserPets,
    fetchAvailablePets,
    fetchPetLimitInfo,
    
    // Utilities
    canCreatePet: petLimitInfo?.canCreate || false,
    currentPetCount: petLimitInfo?.currentCount || 0,
    petLimit: petLimitInfo?.limit || 4,
  };
}
