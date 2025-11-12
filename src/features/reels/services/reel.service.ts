import { supabase } from '@/lib/supabase';

export interface Reel {
  id: string;
  user_id: string;
  media_type: 'image' | 'video';
  video_url?: string;
  image_url?: string;
  thumbnail_url?: string;
  caption?: string;
  like_count: number;
  comment_count: number;
  view_count: number;
  duration?: number;
  status: 'pending' | 'approved' | 'rejected' | 'flagged';
  moderation_reason?: string;
  is_sensitive: boolean;
  is_pet_related: boolean;
  music_track_id?: string;
  music_start_time?: number;
  music_volume?: number;
  created_at: string;
  updated_at: string;
  profiles?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  music_tracks?: {
    id: string;
    title: string;
    artist: string;
    audio_url: string;
    cover_image_url?: string;
    duration: number;
    is_premium: boolean;
  };
}

export interface ReelComment {
  id: string;
  reel_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
}

export interface CreateReelInput {
  media_type: 'image' | 'video';
  video_url?: string;
  image_url?: string;
  thumbnail_url?: string;
  caption?: string;
  duration?: number;
  music_track_id?: string;
  music_start_time?: number;
  music_volume?: number;
}

export const ReelService = {
  // Get all approved reels
  async getAll(limit: number = 20, offset: number = 0): Promise<Reel[]> {
    try {
      console.log('ReelService.getAll: Fetching reels with status = approved');
      const { data, error } = await supabase
        .from('reels')
        .select(`
          *,
          music_tracks (
            id,
            title,
            artist,
            audio_url,
            cover_image_url,
            duration,
            is_premium
          )
        `)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('ReelService.getAll error:', error);
        throw error;
      }
      
      console.log('ReelService.getAll: Raw data from DB:', data?.length || 0, 'reels');
      
      if (!data || data.length === 0) {
        console.warn('ReelService.getAll: No reels found with status = approved');
        return [];
      }
      
      // Filter out reels without video_url or image_url (phải có ít nhất một URL)
      const validReels = data.filter(reel => {
        const hasVideoUrl = reel.video_url && reel.video_url.trim() !== '';
        const hasImageUrl = reel.image_url && reel.image_url.trim() !== '';
        const hasThumbnailUrl = reel.thumbnail_url && reel.thumbnail_url.trim() !== '';
        
        // Video reels phải có video_url
        if (reel.media_type === 'video' && !hasVideoUrl) {
          console.warn(`Reel ${reel.id}: video_url is missing for video reel, filtering out`);
          return false;
        }
        
        // Image reels phải có image_url hoặc thumbnail_url
        if (reel.media_type === 'image' && !hasImageUrl && !hasThumbnailUrl) {
          console.warn(`Reel ${reel.id}: image_url and thumbnail_url are missing for image reel, filtering out`);
          return false;
        }
        
        // Phải có ít nhất một URL hợp lệ
        return hasVideoUrl || hasImageUrl || hasThumbnailUrl;
      });
      
      console.log('ReelService.getAll: Valid reels (with URLs):', validReels.length, 'out of', data.length);
      
      if (validReels.length === 0) {
        console.warn('ReelService.getAll: No reels with valid video_url or image_url');
        return [];
      }
      
      // Batch fetch all profiles at once
      const userIds = [...new Set(validReels.map(reel => reel.user_id))];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);
      
      if (profilesError) {
        console.error('ReelService.getAll: Error fetching profiles:', profilesError);
      }
      
      const profileMap = new Map((profiles || []).map(p => [p.id, p]));
      
      // Map profiles to reels
      const mappedReels = validReels.map(reel => ({
        ...reel,
        profiles: profileMap.get(reel.user_id),
        music_tracks: reel.music_tracks?.[0] || undefined,
      }));
      
      console.log('ReelService.getAll: Mapped reels:', mappedReels.length);
      return mappedReels;
    } catch (error) {
      console.error('ReelService.getAll: Unexpected error:', error);
      throw error;
    }
  },

  // Get reel by ID
  async getById(reelId: string): Promise<Reel | null> {
    const { data, error } = await supabase
      .from('reels')
      .select('*')
      .eq('id', reelId)
      .single();

    if (error) throw error;
    if (!data) return null;
    
    // Fetch profile separately
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .eq('id', data.user_id)
      .single();
    
    return {
      ...data,
      profiles: profile || undefined,
    };
  },

  // Get user's reels
  async getByUserId(userId: string): Promise<Reel[]> {
    const { data, error } = await supabase
      .from('reels')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Fetch profile separately
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .eq('id', userId)
      .single();
    
    return (data || []).map(reel => ({
      ...reel,
      profiles: profile || undefined,
    }));
  },

  // Create new reel
  async create(input: CreateReelInput): Promise<Reel> {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) throw new Error('User not authenticated');

    // Prepare insert data - include both user_id and seller_id for backward compatibility
    const insertData: any = {
      user_id: user.user.id,
      seller_id: user.user.id, // Set seller_id = user_id for backward compatibility
      media_type: input.media_type,
      video_url: input.video_url,
      image_url: input.image_url,
      thumbnail_url: input.thumbnail_url,
      caption: input.caption,
      duration: input.duration,
      music_track_id: input.music_track_id,
      music_start_time: input.music_start_time || 0,
      music_volume: input.music_volume || 0.5,
      status: 'pending', // Will be approved after moderation
    };

    const { data, error } = await supabase
      .from('reels')
      .insert(insertData)
      .select(`
        *,
        music_tracks (
          id,
          title,
          artist,
          audio_url,
          cover_image_url,
          duration,
          is_premium
        )
      `)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to create reel');
    
    // Fetch profile separately
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .eq('id', data.user_id)
      .single();
    
    return {
      ...data,
      profiles: profile || undefined,
      music_tracks: data.music_tracks?.[0] || undefined,
    };
  },

  // Increment view count
  async incrementView(reelId: string): Promise<void> {
    const { error } = await supabase.rpc('increment_reel_view', {
      reel_id_param: reelId,
    });

    if (error) {
      // Fallback: manual update
      const reel = await this.getById(reelId);
      if (reel) {
        await supabase
          .from('reels')
          .update({ view_count: reel.view_count + 1 })
          .eq('id', reelId);
      }
    }
  },

  // Toggle like
  async toggleLike(reelId: string, userId: string): Promise<{ liked: boolean; like_count: number }> {
    // Check if already liked
    const { data: existing } = await supabase
      .from('reel_likes')
      .select('id')
      .eq('reel_id', reelId)
      .eq('user_id', userId)
      .single();

    if (existing) {
      // Unlike
      await supabase
        .from('reel_likes')
        .delete()
        .eq('id', existing.id);

      const reel = await this.getById(reelId);
      return { liked: false, like_count: reel?.like_count || 0 };
    } else {
      // Like
      await supabase
        .from('reel_likes')
        .insert({ reel_id: reelId, user_id: userId });

      const reel = await this.getById(reelId);
      return { liked: true, like_count: reel?.like_count || 0 };
    }
  },

  // Check if user liked a reel
  async isLiked(reelId: string, userId: string): Promise<boolean> {
    const { data } = await supabase
      .from('reel_likes')
      .select('id')
      .eq('reel_id', reelId)
      .eq('user_id', userId)
      .single();

    return !!data;
  },

  // Get comments for a reel
  async getComments(reelId: string): Promise<ReelComment[]> {
    const { data, error } = await supabase
      .from('reel_comments')
      .select('*')
      .eq('reel_id', reelId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    if (!data || data.length === 0) return [];
    
    // Batch fetch all profiles at once
    const userIds = [...new Set(data.map(comment => comment.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', userIds);
    
    const profileMap = new Map((profiles || []).map(p => [p.id, p]));
    
    // Map profiles to comments
    return data.map(comment => ({
      ...comment,
      profiles: profileMap.get(comment.user_id),
    }));
  },

  // Add comment
  async addComment(reelId: string, userId: string, content: string): Promise<ReelComment> {
    const { data, error } = await supabase
      .from('reel_comments')
      .insert({
        reel_id: reelId,
        user_id: userId,
        content,
      })
      .select('*')
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to create comment');
    
    // Fetch profile separately
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .eq('id', userId)
      .single();
    
    return {
      ...data,
      profiles: profile || undefined,
    };
  },

  // Delete comment
  async deleteComment(commentId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('reel_comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', userId); // Only delete own comments

    if (error) throw error;
  },

  // Subscribe to reel updates (realtime)
  subscribeToReels(onUpdate: (reel: Reel) => void) {
    return supabase
      .channel('reels')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reels',
          filter: 'status=eq.approved',
        },
        (payload) => {
          onUpdate(payload.new as Reel);
        }
      )
      .subscribe();
  },

  // Subscribe to reel likes (realtime)
  subscribeToReelLikes(reelId: string, onUpdate: (likeCount: number) => void) {
    return supabase
      .channel(`reel_likes:${reelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reel_likes',
          filter: `reel_id=eq.${reelId}`,
        },
        async () => {
          const reel = await this.getById(reelId);
          if (reel) onUpdate(reel.like_count);
        }
      )
      .subscribe();
  },

  // Subscribe to reel comments (realtime)
  subscribeToReelComments(reelId: string, onUpdate: (comment: ReelComment) => void) {
    return supabase
      .channel(`reel_comments:${reelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reel_comments',
          filter: `reel_id=eq.${reelId}`,
        },
        async (payload) => {
          const comment = payload.new as ReelComment;
          // Fetch profile data
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .eq('id', comment.user_id)
            .single();

          onUpdate({
            ...comment,
            profiles: profile || undefined,
          });
        }
      )
      .subscribe();
  },
};


