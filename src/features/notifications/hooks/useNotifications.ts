import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  NotificationService,
  Notification,
  NotificationStats,
} from '../services/notification.service';

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats>({
    total: 0,
    unread: 0,
  });
  const [loading, setLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    if (!user) return;

    try {
      const [notifs, notificationStats] = await Promise.all([
        NotificationService.getNotifications(user.id, { limit: 50 }),
        NotificationService.getStats(user.id),
      ]);

      setNotifications(notifs);
      setStats(notificationStats);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const refreshNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    await loadNotifications();
  }, [user, loadNotifications]);

  const markAsRead = useCallback(
    async (notificationId: string) => {
      try {
        await NotificationService.markAsRead(notificationId);
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId
              ? { ...n, is_read: true, read_at: new Date().toISOString() }
              : n
          )
        );
        setStats((prev) => ({
          ...prev,
          unread: Math.max(0, prev.unread - 1),
        }));
      } catch (error) {
        console.error('Error marking notification as read:', error);
        throw error;
      }
    },
    []
  );

  const markAllAsRead = useCallback(async () => {
    if (!user) return;

    try {
      await NotificationService.markAllAsRead(user.id);
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          is_read: true,
          read_at: new Date().toISOString(),
        }))
      );
      setStats((prev) => ({ ...prev, unread: 0 }));
    } catch (error) {
      console.error('Error marking all as read:', error);
      throw error;
    }
  }, [user]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user) return;

    const unsubscribe = NotificationService.subscribeToNotifications(
      user.id,
      (newNotification) => {
        setNotifications((prev) => [newNotification, ...prev]);
        setStats((prev) => ({
          total: prev.total + 1,
          unread: prev.unread + 1,
        }));
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user]);

  return {
    notifications,
    stats,
    loading,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
  };
};

