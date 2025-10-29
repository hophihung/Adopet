import { supabase } from '../../../../lib/supabaseClient';
import { Profile, UpdateProfileInput, ProfileStats } from '../../profile/types/profile.types';

export class ProfileService {
  /**
   * Get profile by user ID
   */
  static async getProfile(userId: string): Promise<Profile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('ProfileService.getProfile error:', error);
      throw error;
    }
  }

  /**
   * Update profile
   */
  static async updateProfile(
    userId: string,
    updates: UpdateProfileInput
  ): Promise<Profile> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating profile:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('ProfileService.updateProfile error:', error);
      throw error;
    }
  }

  /**
   * Get profile stats (matches, posts, favorites)
   */
  static async getProfileStats(userId: string): Promise<ProfileStats> {
    try {
      // Get matches count
      const { count: matchesCount, error: matchesError } = await supabase
        .from('matches')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('liked', true);

      if (matchesError) throw matchesError;

      // Get posts count (from community posts)
      const { count: postsCount, error: postsError } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (postsError) throw postsError;

      // Get favorites count (liked posts)
      const { count: favoritesCount, error: favoritesError } = await supabase
        .from('post_likes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (favoritesError) throw favoritesError;

      return {
        matches: matchesCount || 0,
        posts: postsCount || 0,
        favorites: favoritesCount || 0,
      };
    } catch (error) {
      console.error('ProfileService.getProfileStats error:', error);
      return {
        matches: 0,
        posts: 0,
        favorites: 0,
      };
    }
  }

  /**
   * Upload avatar image
   */
  static async uploadAvatar(
    userId: string,
    file: { uri: string; type: string; name: string }
  ): Promise<string> {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Convert file to blob
      const response = await fetch(file.uri);
      const blob = await response.blob();

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('profile')
        .upload(filePath, blob, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage
        .from('profile')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('ProfileService.uploadAvatar error:', error);
      throw error;
    }
  }
}
