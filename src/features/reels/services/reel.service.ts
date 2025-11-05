import { supabase } from '@/lib/supabase';

export interface Reel {
  id: string;
  user_id: string;
  video_url: string;
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
  created_at: string;
  updated_at: string;
  profiles?: {
    id: string;
    full_name: string;
    avatar_url?: string;
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
  video_url: string;
  thumbnail_url?: string;
  caption?: string;
  duration?: number;
}

export const ReelService = {
  // Get all approved reels
  async getAll(limit: number = 20, offset: number = 0): Promise<Reel[]> {
    const { data, error } = await supabase
      .from('reels')
      .select('*')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    if (!data || data.length === 0) return [];
    
    // Batch fetch all profiles at once
    const userIds = [...new Set(data.map(reel => reel.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', userIds);
    
    const profileMap = new Map((profiles || []).map(p => [p.id, p]));
    
    // Map profiles to reels
    return data.map(reel => ({
      ...reel,
      profiles: profileMap.get(reel.user_id),
    }));
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

    const { data, error } = await supabase
      .from('reels')
      .insert({
        user_id: user.user.id,
        video_url: input.video_url,
        thumbnail_url: input.thumbnail_url,
        caption: input.caption,
        duration: input.duration,
        status: 'pending', // Will be approved after moderation
      })
      .select('*')
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


