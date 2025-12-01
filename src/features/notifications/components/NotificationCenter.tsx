import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import { useNotifications, NotificationCategory } from '../hooks/useNotifications';
import { NotificationItem } from './NotificationItem';
import { Notification } from '../services/notification.service';
import { Filter, Check, Trash2, CheckCheck } from 'lucide-react-native';
import { colors } from '@/src/theme/colors';

const CATEGORIES: { key: NotificationCategory; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'orders', label: 'Đơn hàng' },
  { key: 'payments', label: 'Thanh toán' },
  { key: 'chat', label: 'Tin nhắn' },
  { key: 'disputes', label: 'Tranh chấp' },
  { key: 'reviews', label: 'Đánh giá' },
  { key: 'system', label: 'Hệ thống' },
];

export function NotificationCenter() {
  const {
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
  } = useNotifications();

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [longPressId, setLongPressId] = useState<string | null>(null);

  const handleLongPress = (notification: Notification) => {
    setLongPressId(notification.id);
    Alert.alert(
      notification.title,
      notification.body,
      [
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () => deleteNotification(notification.id),
        },
        {
          text: notification.is_read ? 'Đánh dấu chưa đọc' : 'Đánh dấu đã đọc',
          onPress: () => {
            if (!notification.is_read) {
              markAsRead(notification.id);
            }
          },
        },
        { text: 'Hủy', style: 'cancel' },
      ]
    );
  };

  const handleMarkAllAsRead = () => {
    Alert.alert('Đánh dấu tất cả đã đọc', 'Bạn có chắc muốn đánh dấu tất cả thông báo là đã đọc?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xác nhận',
        onPress: markAllAsRead,
      },
    ]);
  };

  const handleDeleteAllRead = () => {
    Alert.alert('Xóa tất cả đã đọc', 'Bạn có chắc muốn xóa tất cả thông báo đã đọc?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: deleteAllRead,
      },
    ]);
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Đang tải thông báo...</Text>
      </View>
    );
  }

  const renderNotificationGroup = (groupKey: string, groupNotifications: Notification[]) => (
    <View key={groupKey} style={styles.groupContainer}>
      <Text style={styles.groupHeader}>{groupKey}</Text>
      {groupNotifications.map((item) => (
        <NotificationItem
          key={item.id}
          notification={item}
          onPress={() => !item.is_read && markAsRead(item.id)}
          onLongPress={() => handleLongPress(item)}
        />
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header with filters and actions */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Thông báo</Text>
          <View style={styles.headerActions}>
            {stats.unread > 0 && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleMarkAllAsRead}
                activeOpacity={0.7}
              >
                <CheckCheck size={18} color={colors.primary} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowCategoryModal(true)}
              activeOpacity={0.7}
            >
              <Filter size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Category filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.key}
              style={[
                styles.categoryChip,
                selectedCategory === cat.key && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(cat.key)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === cat.key && styles.categoryChipTextActive,
                ]}
              >
                {cat.label}
                {cat.key !== 'all' && (
                  <Text style={styles.categoryCount}>
                    {' '}
                    ({notifications.filter((n) => {
                      const type = n.type as any;
                      if (cat.key === 'orders') return type.includes('order');
                      if (cat.key === 'payments')
                        return type.includes('payment') || type.includes('escrow') || type.includes('payout');
                      if (cat.key === 'chat') return type === 'new_message';
                      if (cat.key === 'disputes') return type.includes('dispute');
                      if (cat.key === 'reviews') return type === 'review_request';
                      return false;
                    }).length})
                  </Text>
                )}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>
            {stats.unread > 0 ? `${stats.unread} chưa đọc` : 'Tất cả đã đọc'}
          </Text>
          {stats.read > 0 && (
            <TouchableOpacity onPress={handleDeleteAllRead} style={styles.deleteReadButton}>
              <Trash2 size={14} color={colors.textSecondary} />
              <Text style={styles.deleteReadText}>Xóa đã đọc</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Notifications list */}
      {notifications.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>Chưa có thông báo nào</Text>
        </View>
      ) : (
        <FlatList
          data={Object.entries(groupedNotifications)}
          keyExtractor={([key]) => key}
          renderItem={({ item: [groupKey, groupNotifications] }) =>
            renderNotificationGroup(groupKey, groupNotifications)
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Category Modal */}
      <Modal
        visible={showCategoryModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCategoryModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Chọn danh mục</Text>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.key}
                style={styles.modalItem}
                onPress={() => {
                  setSelectedCategory(cat.key);
                  setShowCategoryModal(false);
                }}
              >
                <Text style={styles.modalItemText}>{cat.label}</Text>
                {selectedCategory === cat.key && <Check size={20} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textTertiary,
  },
  header: {
    backgroundColor: colors.background,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryScroll: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.primaryLight + '15',
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  categoryCount: {
    fontSize: 12,
    opacity: 0.7,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  statsText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  deleteReadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deleteReadText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  listContent: {
    paddingBottom: 16,
  },
  groupContainer: {
    marginTop: 16,
  },
  groupHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 20,
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  modalItemText: {
    fontSize: 16,
    color: colors.text,
  },
});
