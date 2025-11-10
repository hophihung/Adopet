/**
 * Music Service
 * Quản lý nhạc nền cho reels (free và premium)
 */

import { supabase } from '@/lib/supabase';

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  audio_url: string;
  cover_image_url?: string;
  duration: number; // seconds
  is_premium: boolean;
  category?: string;
  tags?: string[];
  usage_count: number;
  can_use: boolean; // true nếu user có thể dùng
}

export interface MusicTrackFilters {
  category?: string;
  search?: string;
  is_premium?: boolean;
  can_use?: boolean;
}

export class MusicService {
  /**
   * Lấy danh sách nhạc có thể dùng cho user
   * Bao gồm nhạc free + nhạc premium (nếu user có subscription)
   */
  static async getAvailableTracks(userId: string, filters?: MusicTrackFilters): Promise<MusicTrack[]> {
    try {
      // Gọi function để lấy nhạc có thể dùng
      const { data, error } = await supabase.rpc('get_available_music_tracks', {
        user_id_param: userId,
      });

      if (error) throw error;

      let tracks = (data || []) as MusicTrack[];

      // Apply filters
      if (filters) {
        if (filters.category) {
          tracks = tracks.filter(t => t.category === filters.category);
        }

        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          tracks = tracks.filter(t =>
            t.title.toLowerCase().includes(searchLower) ||
            t.artist.toLowerCase().includes(searchLower) ||
            t.tags?.some(tag => tag.toLowerCase().includes(searchLower))
          );
        }

        if (filters.is_premium !== undefined) {
          tracks = tracks.filter(t => t.is_premium === filters.is_premium);
        }

        if (filters.can_use !== undefined) {
          tracks = tracks.filter(t => t.can_use === filters.can_use);
        }
      }

      return tracks;
    } catch (error) {
      console.error('MusicService.getAvailableTracks error:', error);
      throw error;
    }
  }

  /**
   * Lấy nhạc theo ID
   */
  static async getTrackById(trackId: string): Promise<MusicTrack | null> {
    try {
      const { data, error } = await supabase
        .from('music_tracks')
        .select('*')
        .eq('id', trackId)
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      return data as MusicTrack;
    } catch (error) {
      console.error('MusicService.getTrackById error:', error);
      throw error;
    }
  }

  /**
   * Lấy thể loại nhạc có sẵn
   */
  static async getCategories(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('music_tracks')
        .select('category')
        .eq('is_active', true)
        .not('category', 'is', null);

      if (error) throw error;

      const categories = [...new Set((data || []).map(d => d.category).filter(Boolean))] as string[];
      return categories.sort();
    } catch (error) {
      console.error('MusicService.getCategories error:', error);
      return [];
    }
  }

  /**
   * Upload nhạc mới (admin only - sẽ implement sau)
   */
  static async uploadTrack(
    title: string,
    artist: string,
    audioFile: File | Blob,
    coverImageFile?: File | Blob,
    options?: {
      isPremium?: boolean;
      category?: string;
      tags?: string[];
    }
  ): Promise<MusicTrack> {
    try {
      // Upload audio file
      const audioFileName = `tracks/${Date.now()}-${title.replace(/\s+/g, '-').toLowerCase()}.mp3`;
      const { error: audioError } = await supabase.storage
        .from('music-tracks')
        .upload(audioFileName, audioFile, {
          contentType: 'audio/mpeg',
          upsert: false,
        });

      if (audioError) throw audioError;

      // Get audio URL
      const { data: audioUrlData } = supabase.storage
        .from('music-tracks')
        .getPublicUrl(audioFileName);

      // Upload cover image if provided
      let coverImageUrl: string | undefined;
      if (coverImageFile) {
        const coverFileName = `covers/${Date.now()}-${title.replace(/\s+/g, '-').toLowerCase()}.jpg`;
        const { error: coverError } = await supabase.storage
          .from('music-tracks')
          .upload(coverFileName, coverImageFile, {
            contentType: 'image/jpeg',
            upsert: false,
          });

        if (!coverError) {
          const { data: coverUrlData } = supabase.storage
            .from('music-tracks')
            .getPublicUrl(coverFileName);
          coverImageUrl = coverUrlData.publicUrl;
        }
      }

      // Create track record
      const { data, error } = await supabase
        .from('music_tracks')
        .insert({
          title,
          artist,
          audio_url: audioUrlData.publicUrl,
          cover_image_url: coverImageUrl,
          duration: 30, // TODO: Get actual duration from audio file
          is_premium: options?.isPremium || false,
          category: options?.category,
          tags: options?.tags || [],
        })
        .select()
        .single();

      if (error) throw error;

      return data as MusicTrack;
    } catch (error) {
      console.error('MusicService.uploadTrack error:', error);
      throw error;
    }
  }

  /**
   * Check if user can use premium music
   */
  static async canUsePremiumMusic(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('plan_id, subscription_plans(name)')
        .eq('profile_id', userId)
        .eq('status', 'active')
        .single();

      if (error || !data) return false;

      const plan = data.subscription_plans as { name: string };
      return plan.name !== 'free';
    } catch (error) {
      console.error('MusicService.canUsePremiumMusic error:', error);
      return false;
    }
  }
}







