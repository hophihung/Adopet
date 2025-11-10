import { supabase } from '@/lib/supabase';

export interface PetCreateData {
  name: string;
  type: 'dog' | 'cat' | 'hamster' | 'bird' | 'rabbit' | 'other';
  age_months?: number;
  gender?: 'male' | 'female' | 'unknown';
  description?: string;
  location?: string;
  price?: number;
  images: string[];
  // Enhanced fields
  breed?: string;
  weight_kg?: number;
  color?: string;
  health_status?: 'healthy' | 'sick' | 'vaccinated' | 'needs_attention';
  vaccination_status?: 'up_to_date' | 'partial' | 'not_vaccinated' | 'unknown';
  vaccination_images?: string[]; // Array of vaccination certificate image URLs
  spayed_neutered?: boolean;
  microchipped?: boolean;
  house_trained?: boolean;
  good_with_kids?: boolean;
  good_with_pets?: boolean;
  energy_level?: 'low' | 'medium' | 'high';
  size?: 'small' | 'medium' | 'large' | 'extra_large';
  special_needs?: string;
  adoption_fee?: number;
  contact_phone?: string;
  contact_email?: string;
  latitude?: number;
  longitude?: number;
}

export interface PetUpdateData extends Partial<PetCreateData> {
  is_available?: boolean;
}

export const PetService = {
  // Lấy giới hạn pet theo subscription plan
  getPetLimit(plan: string): number {
    const limits = {
      'free': 4,
      'premium': 6,
      'pro': 9,
    };
    return limits[plan as keyof typeof limits] || 4;
  },

  // Kiểm tra số lượng pet hiện tại của user
  async getCurrentPetCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('pets')
      .select('*', { count: 'exact', head: true })
      .eq('seller_id', userId);
    
    if (error) throw error;
    return count || 0;
  },

  // Kiểm tra xem user có thể tạo thêm pet không
  async canCreatePet(userId: string, plan: string): Promise<{ canCreate: boolean; currentCount: number; limit: number }> {
    const currentCount = await this.getCurrentPetCount(userId);
    const limit = this.getPetLimit(plan);
    
    return {
      canCreate: currentCount < limit,
      currentCount,
      limit
    };
  },

  // Lấy tất cả pets của user
  async getUserPets(userId: string) {
    const { data, error } = await supabase
      .from('pets')
      .select('*')
      .eq('seller_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  // Lấy tất cả pets có sẵn (cho swipe)
  // Loại trừ các pet đã pass (swipe left) - giống Tinder
  // Chỉ hiển thị pets đã được admin duyệt (verification_status = 'approved')
  async getAvailablePets(userId?: string, userLocation?: { latitude: number; longitude: number }, radiusKm: number = 50) {
    let query = supabase
      .from('pets')
      .select(`
        *,
        profiles!pets_seller_id_fkey(
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('is_available', true)
      .eq('verification_status', 'approved') // Chỉ hiển thị pets đã được duyệt
      .order('created_at', { ascending: false });

    // Nếu có userId, loại trừ pets của chính user đó
    if (userId) {
      query = query.neq('seller_id', userId);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Loại trừ các pet đã pass (swipe left) - filter ở client side
    if (userId && data) {
      const { data: passedPetIds } = await supabase
        .from('pet_passes')
        .select('pet_id')
        .eq('user_id', userId);

      if (passedPetIds && passedPetIds.length > 0) {
        const passedIds = new Set(passedPetIds.map((p: any) => p.pet_id));
        return data.filter((pet: any) => !passedIds.has(pet.id));
      }
    }

    return data || [];
  },

  // Tạo pet mới
  async createPet(userId: string, petData: PetCreateData, plan: string) {
    // Kiểm tra giới hạn trước khi tạo
    const { canCreate, currentCount, limit } = await this.canCreatePet(userId, plan);
    
    if (!canCreate) {
      throw new Error(`Bạn đã đạt giới hạn ${limit} pet objects. Hãy nâng cấp gói để tạo thêm!`);
    }

    // Kiểm tra số lượng ảnh
    const maxImages = 4;
    if (petData.images.length > maxImages) {
      throw new Error(`Mỗi pet chỉ được tối đa ${maxImages} ảnh`);
    }

    const { data, error } = await supabase
      .from('pets')
      .insert({
        ...petData,
        seller_id: userId,
      })
      .select(`
        *,
        profiles!pets_seller_id_fkey(
          id,
          full_name,
          avatar_url
        )
      `)
      .single();

    if (error) throw error;
    return data;
  },

  // Cập nhật pet
  async updatePet(petId: string, userId: string, petData: PetUpdateData) {
    // Kiểm tra quyền sở hữu
    const { data: existingPet, error: fetchError } = await supabase
      .from('pets')
      .select('seller_id')
      .eq('id', petId)
      .single();

    if (fetchError) throw fetchError;
    if (existingPet.seller_id !== userId) {
      throw new Error('Bạn không có quyền chỉnh sửa pet này');
    }

    // Kiểm tra số lượng ảnh nếu có cập nhật
    if (petData.images && petData.images.length > 4) {
      throw new Error('Mỗi pet chỉ được tối đa 4 ảnh');
    }

    const { data, error } = await supabase
      .from('pets')
      .update({
        ...petData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', petId)
      .select(`
        *,
        profiles!pets_seller_id_fkey(
          id,
          full_name,
          avatar_url
        )
      `)
      .single();

    if (error) throw error;
    return data;
  },

  // Xóa pet
  async deletePet(petId: string, userId: string) {
    // Kiểm tra quyền sở hữu
    const { data: existingPet, error: fetchError } = await supabase
      .from('pets')
      .select('seller_id')
      .eq('id', petId)
      .single();

    if (fetchError) throw fetchError;
    if (existingPet.seller_id !== userId) {
      throw new Error('Bạn không có quyền xóa pet này');
    }

    const { error } = await supabase
      .from('pets')
      .delete()
      .eq('id', petId);

    if (error) throw error;
    return true;
  },

  // Lấy pet theo ID
  async getPetById(petId: string) {
    const { data, error } = await supabase
      .from('pets')
      .select(`
        *,
        profiles!pets_seller_id_fkey(
          id,
          full_name,
          avatar_url,
          phone
        )
      `)
      .eq('id', petId)
      .single();

    if (error) throw error;
    return data;
  },

  // Toggle availability của pet
  async togglePetAvailability(petId: string, userId: string) {
    const { data: existingPet, error: fetchError } = await supabase
      .from('pets')
      .select('seller_id, is_available')
      .eq('id', petId)
      .single();

    if (fetchError) throw fetchError;
    if (existingPet.seller_id !== userId) {
      throw new Error('Bạn không có quyền thay đổi trạng thái pet này');
    }

    const { data, error } = await supabase
      .from('pets')
      .update({
        is_available: !existingPet.is_available,
        updated_at: new Date().toISOString(),
      })
      .eq('id', petId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Like/Unlike pet
  async toggleLike(petId: string, userId: string) {
    const { data: existing } = await supabase
      .from('pet_likes')
      .select('*')
      .eq('pet_id', petId)
      .eq('user_id', userId)
      .single();

    if (existing) {
      await supabase.from('pet_likes').delete().eq('id', existing.id);
      return { liked: false };
    } else {
      const { data: likeData, error: likeError } = await supabase
        .from('pet_likes')
        .insert({ pet_id: petId, user_id: userId })
        .select()
        .single();

      if (likeError) throw likeError;

      // The trigger will automatically create conversation and notification
      // when a new like is inserted
      
      return { liked: true };
    }
  },

  // Track pet view
  async trackView(petId: string, userId?: string, ipAddress?: string, userAgent?: string) {
    const { error } = await supabase
      .from('pet_views')
      .insert({
        pet_id: petId,
        user_id: userId,
        ip_address: ipAddress,
        user_agent: userAgent,
      });

    if (error) throw error;
    return true;
  },

  // Pass pet (swipe left) - giống Tinder, một lần pass là vĩnh viễn
  async passPet(petId: string, userId: string) {
    if (!userId) {
      throw new Error('User ID is required to pass a pet');
    }

    // Check if already passed
    const { data: existing } = await supabase
      .from('pet_passes')
      .select('id')
      .eq('pet_id', petId)
      .eq('user_id', userId)
      .single();

    if (existing) {
      // Already passed, no need to insert again
      return { passed: true };
    }

    // Insert pass record
    const { data, error } = await supabase
      .from('pet_passes')
      .insert({
        pet_id: petId,
        user_id: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return { passed: true, data };
  },

  // Get pet likes
  async getPetLikes(petId: string) {
    const { data, error } = await supabase
      .from('pet_likes')
      .select(`
        *,
        profiles!pet_likes_user_id_fkey(
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('pet_id', petId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Check if user liked pet
  async isPetLikedByUser(petId: string, userId: string) {
    const { data, error } = await supabase
      .from('pet_likes')
      .select('id')
      .eq('pet_id', petId)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return !!data;
  },

  // Get featured pets
  async getFeaturedPets(limit: number = 10) {
    const { data, error } = await supabase
      .from('pets')
      .select(`
        *,
        profiles!pets_seller_id_fkey(
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('is_available', true)
      .eq('is_featured', true)
      .gt('featured_until', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  },

  // Get popular pets (by view count)
  async getPopularPets(limit: number = 10) {
    const { data, error } = await supabase
      .from('pets')
      .select(`
        *,
        profiles!pets_seller_id_fkey(
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('is_available', true)
      .order('view_count', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  },

  // Search pets with filters
  async searchPets(filters: {
    type?: string;
    location?: string;
    minPrice?: number;
    maxPrice?: number;
    ageRange?: { min: number; max: number };
    gender?: string;
    size?: string;
    energyLevel?: string;
    limit?: number;
    offset?: number;
  }) {
    let query = supabase
      .from('pets')
      .select(`
        *,
        profiles!pets_seller_id_fkey(
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('is_available', true);

    if (filters.type) {
      query = query.eq('type', filters.type);
    }

    if (filters.location) {
      query = query.ilike('location', `%${filters.location}%`);
    }

    if (filters.minPrice !== undefined) {
      query = query.gte('price', filters.minPrice);
    }

    if (filters.maxPrice !== undefined) {
      query = query.lte('price', filters.maxPrice);
    }

    if (filters.ageRange) {
      query = query
        .gte('age_months', filters.ageRange.min)
        .lte('age_months', filters.ageRange.max);
    }

    if (filters.gender) {
      query = query.eq('gender', filters.gender);
    }

    if (filters.size) {
      query = query.eq('size', filters.size);
    }

    if (filters.energyLevel) {
      query = query.eq('energy_level', filters.energyLevel);
    }

    query = query
      .order('created_at', { ascending: false })
      .range(filters.offset || 0, (filters.offset || 0) + (filters.limit || 20) - 1);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }
};
