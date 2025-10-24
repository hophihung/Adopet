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
        user_id,
        profiles(full_name, avatar_url)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data
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
    await supabase.rpc('increment_comment_count', { post_id: postId })
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
