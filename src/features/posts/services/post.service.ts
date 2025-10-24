import { supabase } from '@/lib/supabase';

export const PostService = {
    async getAll() {
        const { data, error } = await supabase
            .from('posts')
            .select('*, profiles!posts_user_id_fkey(*)')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    },

    async getById(id: string) {
        const { data, error } = await supabase
            .from('posts')
            .select('*, profiles!posts_user_id_fkey(*)')
            .eq('id', id)
            .single();
        if (error) throw error;
        return data;
    },

    async create(newPost: { content: string; image_url?: string; user_id: string }) {
        const { data, error } = await supabase
            .from('posts')
            .insert(newPost)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async toggleLike(postId: string, userId: string) {
        const { data: existing } = await supabase
            .from('post_likes')
            .select('*')
            .eq('post_id', postId)
            .eq('user_id', userId)
            .single();

        if (existing) {
            await supabase.from('post_likes').delete().eq('id', existing.id);
            return { liked: false };
        } else {
            await supabase.from('post_likes').insert({ post_id: postId, user_id: userId });
            return { liked: true };
        }
    },
};
