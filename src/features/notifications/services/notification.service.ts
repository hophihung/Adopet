import { supabase } from '@/lib/supabase';

export type NotificationType =
  | 'escrow_created'
  | 'payment_success'
  | 'escrow_released'
  | 'payout_created'
  | 'payout_completed'
  | 'payout_failed'
  | 'pet_liked'
  | 'new_message'
  | 'match'
  | 'order_status'
  | 'review_request'
  | 'dispute_opened'
  | 'dispute_resolved';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, any> | null;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
}

export interface NotificationStats {
  total: number;
  unread: number;
}

export const NotificationService = {
  /**
   * Lấy danh sách notifications của user
   */
  async getNotifications(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      unreadOnly?: boolean;
    }
  ): Promise<Notification[]> {
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (options?.unreadOnly) {
      query = query.eq('is_read', false);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(
        options.offset,
        options.offset + (options.limit || 50) - 1
      );
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  /**
   * Lấy số lượng notifications chưa đọc
   */
  async getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;
    return count || 0;
  },

  /**
   * Lấy thống kê notifications
   */
  async getStats(userId: string): Promise<NotificationStats> {
    const [totalResult, unreadResult] = await Promise.all([
      supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId),
      supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false),
    ]);

    if (totalResult.error) throw totalResult.error;
    if (unreadResult.error) throw unreadResult.error;

    return {
      total: totalResult.count || 0,
      unread: unreadResult.count || 0,
    };
  },

  /**
   * Đánh dấu notification là đã đọc
   */
  async markAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', notificationId);

    if (error) throw error;
  },

  /**
   * Đánh dấu tất cả notifications là đã đọc
   */
  async markAllAsRead(userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;
  },

  /**
   * Xóa notification
   */
  async delete(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) throw error;
  },

  /**
   * Xóa tất cả notifications đã đọc
   */
  async deleteAllRead(userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId)
      .eq('is_read', true);

    if (error) throw error;
  },

  /**
   * Subscribe to realtime notifications
   */
  subscribeToNotifications(
    userId: string,
    callback: (notification: Notification) => void
  ) {
    const channel = supabase
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
          callback(payload.new as Notification);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};

