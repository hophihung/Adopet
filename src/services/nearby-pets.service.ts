import { supabase } from '@/lib/supabase';

export interface NearbyPet {
  id: string;
  seller_id: string;
  name: string;
  type: string;
  age_months: number | null;
  breed: string | null;
  gender: string | null;
  description: string | null;
  location: string | null;
  price: number | null;
  images: string[];
  is_available: boolean;
  distance_km: number;
  seller_name: string | null;
  seller_avatar_url: string | null;
  created_at: string;
}

class NearbyPetsService {
  /**
   * Tìm pets gần nhau dựa trên location và search radius
   */
  async findNearbyPets(
    userId: string,
    radiusKm?: number,
    limit: number = 50
  ): Promise<NearbyPet[]> {
    try {
      const { data, error } = await supabase.rpc('find_nearby_pets', {
        user_id_param: userId,
        radius_km: radiusKm || null,
        limit_count: limit,
      });

      if (error) {
        console.error('Error finding nearby pets:', error);
        throw error;
      }

      return (data || []) as NearbyPet[];
    } catch (error) {
      console.error('NearbyPetsService.findNearbyPets error:', error);
      throw error;
    }
  }

  /**
   * Cập nhật search radius của user
   */
  async updateSearchRadius(userId: string, radiusKm: number): Promise<boolean> {
    try {
      // Validate radius (1-500km)
      if (radiusKm < 1 || radiusKm > 500) {
        throw new Error('Search radius must be between 1 and 500 km');
      }

      const { error } = await supabase
        .from('profiles')
        .update({ search_radius_km: radiusKm })
        .eq('id', userId);

      if (error) {
        console.error('Error updating search radius:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('NearbyPetsService.updateSearchRadius error:', error);
      throw error;
    }
  }

  /**
   * Lấy search radius hiện tại của user
   */
  async getSearchRadius(userId: string): Promise<number | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('search_radius_km')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error getting search radius:', error);
        throw error;
      }

      return data?.search_radius_km || null;
    } catch (error) {
      console.error('NearbyPetsService.getSearchRadius error:', error);
      throw error;
    }
  }
}

export const nearbyPetsService = new NearbyPetsService();

