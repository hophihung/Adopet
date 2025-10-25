import { supabase } from '@/lib/supabase'

export const PostCommentService = {
  // 🧩 Lấy toàn bộ comment của 1 bài viết
  async getByPostId(postId: string) {
    const { data, error } = await supabase
      .from('post_comments')
      .select(`
      id,
      content,
      created_at,
      user_id
    `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    
    // Fetch profiles separately
    if (data && data.length > 0) {
      const userIds = [...new Set(data.map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      return data.map(c => ({
        ...c,
        profiles: [profileMap.get(c.user_id)].filter(Boolean)
      }));
    }
    return data;
  },
  // ➕ Thêm comment mới
  async create(postId: string, userId: string, content: string) {
    const { data, error } = await supabase
      .from('post_comments')
      .insert({
        post_id: postId,
        user_id: userId,
        content,
      })
      .select()
      .single()

    if (error) throw error

    // Gọi RPC để tăng comment_count
    return data
  },

  // ❌ Xóa comment
  async delete(commentId: string, postId: string) {
    const { error } = await supabase
      .from('post_comments')
      .delete()
      .eq('id', commentId)

    if (error) throw error

    // Giảm comment_count khi xóa
    await supabase.rpc('decrement_comment_count', { post_id: postId })
  },
}
