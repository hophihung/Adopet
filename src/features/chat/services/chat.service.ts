import { supabase } from "@/lib/supabase";

export interface Conversation {
  id: string;
  pet_id: string;
  buyer_id: string;
  seller_id: string;
  created_at: string;
  updated_at: string;
  last_message_at: string;
  is_active: boolean;
  pet?: {
    id: string;
    name: string;
    images: string[];
    type: string;
  };
  buyer?: {
    id: string;
    full_name: string;
    avatar_url: string;
  };
  seller?: {
    id: string;
    full_name: string;
    avatar_url: string;
  };
  unread_count?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'image' | 'system';
  created_at: string;
  is_read: boolean;
  read_at: string | null;
  meta?: any;
  sender?: {
    id: string;
    full_name: string;
    avatar_url: string;
  };
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'pet_liked' | 'new_message' | 'match';
  title: string;
  body: string;
  data: any;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
}

export const ChatService = {
  // Get all conversations for a user
  async getConversations(userId: string): Promise<Conversation[]> {
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        pet:pet_id (
          id,
          name,
          images,
          type
        ),
        buyer:buyer_id (
          id,
          full_name,
          avatar_url
        ),
        seller:seller_id (
          id,
          full_name,
          avatar_url
        )
      `)
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      .eq('is_active', true)
      .order('last_message_at', { ascending: false });

    if (error) throw error;

    // Add unread count for each conversation
    const conversationsWithUnread = await Promise.all(
      data.map(async (conv) => {
        const unreadCount = await this.getUnreadCount(conv.id, userId);
        return { ...conv, unread_count: unreadCount };
      })
    );

    return conversationsWithUnread;
  },

  // Get messages for a conversation
  async getMessages(conversationId: string): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:sender_id (
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
  },

  // Send a message
  async sendMessage(
    conversationId: string,
    senderId: string,
    content: string,
    messageType: 'text' | 'image' | 'system' = 'text'
  ): Promise<Message> {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content,
        message_type: messageType,
      })
      .select(`
        *,
        sender:sender_id (
          id,
          full_name,
          avatar_url
        )
      `)
      .single();

    if (error) throw error;
    return data;
  },

  // Mark messages as read
  async markAsRead(conversationId: string, userId: string): Promise<void> {
    const { error } = await supabase.rpc('mark_messages_as_read', {
      conversation_id_param: conversationId,
      user_id_param: userId,
    });

    if (error) throw error;
  },

  // Get unread count for a conversation
  async getUnreadCount(conversationId: string, userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .eq('is_read', false);

    if (error) throw error;
    return count || 0;
  },

  // Get total unread count for user
  async getTotalUnreadCount(userId: string): Promise<number> {
    const { data: conversations } = await supabase
      .from('conversations')
      .select('id')
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      .eq('is_active', true);

    if (!conversations) return 0;

    const conversationIds = conversations.map(c => c.id);
    
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .in('conversation_id', conversationIds)
      .neq('sender_id', userId)
      .eq('is_read', false);

    if (error) throw error;
    return count || 0;
  },

  // Get notifications
  async getNotifications(userId: string): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data;
  },

  // Archive conversation (soft delete)
  async archiveConversation(conversationId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('conversations')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', conversationId)
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      .select()
      .single();

    if (error) throw error;
  },

  // Mark notification as read
  async markNotificationAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId);

    if (error) throw error;
  },

  // Mark all notifications as read
  async markAllNotificationsAsRead(userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;
  },

  // Create conversation manually (for testing)
  async createConversation(
    petId: string,
    buyerId: string,
    sellerId: string
  ): Promise<Conversation> {
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        pet_id: petId,
        buyer_id: buyerId,
        seller_id: sellerId,
      })
      .select(`
        *,
        pet:pet_id (
          id,
          name,
          images,
          type
        ),
        buyer:buyer_id (
          id,
          full_name,
          avatar_url
        ),
        seller:seller_id (
          id,
          full_name,
          avatar_url
        )
      `)
      .single();

    if (error) throw error;
    return data;
  },

  // Subscribe to conversation updates
  subscribeToConversation(
    conversationId: string,
    onUpdate: (message: Message) => void
  ) {
    return supabase
      .channel(`conversation:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          onUpdate(payload.new as Message);
        }
      )
      .subscribe();
  },

  // Subscribe to notifications
  subscribeToNotifications(
    userId: string,
    onNotification: (notification: Notification) => void
  ) {
    return supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          onNotification(payload.new as Notification);
        }
      )
      .subscribe();
  },

  // Subscribe to conversation list updates
  subscribeToConversationList(
    userId: string,
    onUpdate: (conversation: Conversation) => void
  ) {
    return supabase
      .channel(`conversations:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `or(buyer_id.eq.${userId},seller_id.eq.${userId})`,
        },
        (payload) => {
          onUpdate(payload.new as Conversation);
        }
      )
      .subscribe();
  },
};
