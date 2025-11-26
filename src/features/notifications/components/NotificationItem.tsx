import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import {
  Bell,
  CreditCard,
  DollarSign,
  Heart,
  MessageCircle,
  Package,
  Star,
  AlertCircle,
  CheckCircle,
  XCircle,
} from 'lucide-react-native';
import { Notification, NotificationType } from '../services/notification.service';
import { colors } from '@/src/theme/colors';

interface NotificationItemProps {
  notification: Notification;
  onPress?: () => void;
  onLongPress?: () => void;
}

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'escrow_created':
    case 'escrow_released':
      return <DollarSign size={20} color={colors.primary} />;
    case 'payment_success':
      return <CreditCard size={20} color={colors.success} />;
    case 'payout_created':
    case 'payout_completed':
      return <CheckCircle size={20} color={colors.success} />;
    case 'payout_failed':
      return <XCircle size={20} color={colors.error} />;
    case 'pet_liked':
    case 'match':
      return <Heart size={20} color={colors.error} />;
    case 'new_message':
      return <MessageCircle size={20} color={colors.primary} />;
    case 'order_status':
      return <Package size={20} color={colors.primary} />;
    case 'review_request':
      return <Star size={20} color={colors.warning} />;
    case 'dispute_opened':
    case 'dispute_resolved':
      return <AlertCircle size={20} color={colors.error} />;
    default:
      return <Bell size={20} color={colors.primary} />;
  }
};

const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'Vừa xong';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} phút trước`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} giờ trước`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} ngày trước`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks} tuần trước`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  return `${diffInMonths} tháng trước`;
};

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onPress,
  onLongPress,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.container,
        !notification.is_read && styles.unreadContainer,
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        {getNotificationIcon(notification.type)}
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          <Text
            style={[
              styles.title,
              !notification.is_read && styles.unreadTitle,
            ]}
            numberOfLines={1}
          >
            {notification.title}
          </Text>
          {!notification.is_read && <View style={styles.unreadDot} />}
        </View>

        <Text style={styles.body} numberOfLines={2}>
          {notification.body}
        </Text>

        <Text style={styles.time}>
          {formatTimeAgo(notification.created_at)}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  unreadContainer: {
    backgroundColor: colors.primaryLight + '10',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  unreadTitle: {
    fontWeight: '700',
    color: colors.primary,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginLeft: 8,
  },
  body: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 4,
  },
  time: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 2,
  },
});

