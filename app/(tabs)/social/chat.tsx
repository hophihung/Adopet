import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MessageCircle, Bell } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { ChatScreen, ChatList } from '@/src/components';
import { Conversation, ChatService, type Notification as ChatNotification } from '@/src/features/chat';
import { colors } from '@/src/theme/colors';


export default function ChatTabScreen() {
  const { user } = useAuth();
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [notifications, setNotifications] = useState<ChatNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadNotifications();
      subscribeToNotifications();
      loadUnreadCount();
    }
  }, [user?.id]);

  const loadNotifications = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const data = await ChatService.getNotifications(user.id);
      setNotifications(data);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToNotifications = () => {
    if (!user?.id) return;

    const subscription = ChatService.subscribeToNotifications(
      user.id,
      (notification) => {
        setNotifications((prev) => [notification, ...prev]);
        loadUnreadCount(); // Refresh unread count
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  };

  const loadUnreadCount = async () => {
    if (!user?.id) return;

    try {
      const count = await ChatService.getTotalUnreadCount(user.id);
      setUnreadCount(count);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  const handleConversationSelect = (conversation: Conversation) => {
    setSelectedConversation(conversation);
  };

  const handleBack = () => {
    setSelectedConversation(null);
    loadUnreadCount(); // Refresh unread count when going back
  };

  const handleNotificationPress = async (notification: ChatNotification) => {
    // Mark notification as read
    try {
      await ChatService.markNotificationAsRead(notification.id);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id ? { ...n, is_read: true } : n
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }

    // Navigate to conversation if it's a message notification
    if (
      notification.type === 'new_message' &&
      notification.data?.conversation_id
    ) {
      // You would need to load the conversation here
      // For now, just show a placeholder
      console.log(
        'Navigate to conversation:',
        notification.data.conversation_id
      );
    }
  };

  if (selectedConversation) {
    return (
      <ChatScreen conversation={selectedConversation} onBack={handleBack} />
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header with Gradient */}
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        style={styles.headerGradient}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <MessageCircle size={28} color="#fff" />
            <Text style={styles.headerTitle}>Tin nhắn</Text>
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => {
              // Show notifications modal or navigate to notifications screen
              console.log('Show notifications');
            }}
          >
            <Bell size={22} color="#fff" />
            {notifications.some((n) => !n.is_read) && (
              <View style={styles.notificationDot} />
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Chat List */}
      <ChatList onConversationSelect={handleConversationSelect} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerGradient: {
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  unreadBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  unreadText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  notificationButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
});
