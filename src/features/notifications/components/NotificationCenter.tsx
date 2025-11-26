import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, Check, Trash2, X } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import {
  NotificationService,
  Notification,
} from '../services/notification.service';
import { NotificationItem } from './NotificationItem';
import { colors } from '@/src/theme/colors';

export const NotificationCenter: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = useCallback(async () => {
    if (!user) return;

    try {
      const [notifs, count] = await Promise.all([
        NotificationService.getNotifications(user.id, { limit: 100 }),
        NotificationService.getUnreadCount(user.id),
      ]);

      setNotifications(notifs);
      setUnreadCount(count);
    } catch (error) {
      console.error('Error loading notifications:', error);
      Alert.alert('Lỗi', 'Không thể tải thông báo');
    } finally {
      setLoading(false);
      setRefreshing(false);
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
        setUnreadCount((prev) => prev + 1);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const handleNotificationPress = async (notification: Notification) => {
    // Mark as read if not read
    if (!notification.is_read) {
      try {
        await NotificationService.markAsRead(notification.id);
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id
              ? { ...n, is_read: true, read_at: new Date().toISOString() }
              : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    // Navigate based on notification type and data
    if (notification.data) {
      if (notification.data.order_id) {
        router.push(`/orders/${notification.data.order_id}`);
      } else if (notification.data.pet_id) {
        router.push(`/pet/${notification.data.pet_id}`);
      } else if (notification.data.conversation_id) {
        // Navigate to chat
        router.push('/(tabs)/social/chat');
      } else if (notification.data.payout_id) {
        // Navigate to bank accounts or payout history
        router.push('/(tabs)/me/bank-accounts');
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user || unreadCount === 0) return;

    try {
      await NotificationService.markAllAsRead(user.id);
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          is_read: true,
          read_at: new Date().toISOString(),
        }))
      );
      setUnreadCount(0);
      Alert.alert('Thành công', 'Đã đánh dấu tất cả là đã đọc');
    } catch (error) {
      console.error('Error marking all as read:', error);
      Alert.alert('Lỗi', 'Không thể đánh dấu tất cả là đã đọc');
    }
  };

  const handleDeleteAllRead = async () => {
    if (!user) return;

    const readCount = notifications.filter((n) => n.is_read).length;
    if (readCount === 0) {
      Alert.alert('Thông báo', 'Không có thông báo đã đọc để xóa');
      return;
    }

    Alert.alert(
      'Xác nhận',
      `Bạn có chắc muốn xóa ${readCount} thông báo đã đọc?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await NotificationService.deleteAllRead(user.id);
              setNotifications((prev) => prev.filter((n) => !n.is_read));
              Alert.alert('Thành công', 'Đã xóa tất cả thông báo đã đọc');
            } catch (error) {
              console.error('Error deleting read notifications:', error);
              Alert.alert('Lỗi', 'Không thể xóa thông báo');
            }
          },
        },
      ]
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Bell size={24} color={colors.primary} />
        <Text style={styles.headerTitle}>Thông báo</Text>
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount}</Text>
          </View>
        )}
      </View>

      <View style={styles.headerActions}>
        {unreadCount > 0 && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleMarkAllAsRead}
          >
            <Check size={20} color={colors.primary} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleDeleteAllRead}
        >
          <Trash2 size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Bell size={64} color={colors.textTertiary} />
      <Text style={styles.emptyText}>Chưa có thông báo</Text>
      <Text style={styles.emptySubtext}>
        Các thông báo mới sẽ xuất hiện ở đây
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {renderHeader()}
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NotificationItem
            notification={item}
            onPress={() => handleNotificationPress(item)}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={
          notifications.length === 0 ? styles.emptyList : undefined
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.background,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginLeft: 12,
  },
  badge: {
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
});

