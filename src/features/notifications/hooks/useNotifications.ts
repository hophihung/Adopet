import { useState, useEffect, useCallback } from 'react';
import { NotificationService, Notification, NotificationType } from '../services/notification.service';
import { useAuth } from '@/contexts/AuthContext';

export type NotificationCategory = 'all' | 'orders' | 'payments' | 'chat' | 'disputes' | 'reviews' | 'system';

const getCategoryFromType = (type: NotificationType): NotificationCategory => {
  if (type.includes('order') || type === 'order_status') return 'orders';
  if (type.includes('payment') || type.includes('escrow') || type.includes('payout')) return 'payments';
  if (type === 'new_message') return 'chat';
  if (type.includes('dispute')) return 'disputes';
  if (type === 'review_request') return 'reviews';
  return 'system';
};

export function useNotifications(category?: NotificationCategory) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<NotificationCategory>(category || 'all');

  const loadNotifications = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const data = await NotificationService.getNotifications(user.id);
      
      let filteredData = data;
      if (selectedCategory !== 'all') {
        filteredData = data.filter((n) => getCategoryFromType(n.type) === selectedCategory);
      }
      
      setNotifications(filteredData);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, selectedCategory]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const refresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const markAsRead = async (id: string) => {
    if (!user) return;
    
    try {
      await NotificationService.markAsRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    
    try {
      await NotificationService.markAllAsRead(user.id);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await NotificationService.delete(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const deleteAllRead = async () => {
    if (!user) return;
    
    try {
      await NotificationService.deleteAllRead(user.id);
      setNotifications((prev) => prev.filter((n) => !n.is_read));
    } catch (error) {
      console.error('Error deleting all read notifications:', error);
    }
  };

  // Calculate stats
  const stats = {
    total: notifications.length,
    unread: notifications.filter((n) => !n.is_read).length,
    read: notifications.filter((n) => n.is_read).length,
  };

  // Group notifications by date
  const groupedNotifications = notifications.reduce((acc, notification) => {
    const date = new Date(notification.created_at);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    let groupKey = '';
    if (date.toDateString() === today.toDateString()) {
      groupKey = 'Hôm nay';
    } else if (date.toDateString() === yesterday.toDateString()) {
      groupKey = 'Hôm qua';
    } else {
      groupKey = date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' });
    }
    
    if (!acc[groupKey]) {
      acc[groupKey] = [];
    }
    acc[groupKey].push(notification);
    return acc;
  }, {} as Record<string, Notification[]>);

  return {
    notifications,
    groupedNotifications,
    stats,
    loading,
    refreshing,
    selectedCategory,
    setSelectedCategory,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead,
    refresh,
  };
}
