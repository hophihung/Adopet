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
import { useRouter, usePathname } from 'expo-router';
import { ChatScreen, ChatList } from '@/src/components';
import { Conversation, ChatService, type Notification as ChatNotification } from '@/src/features/chat';
import { colors } from '@/src/theme/colors';


export default function ChatTabScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [notifications, setNotifications] = useState<ChatNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'community' | 'chat'>('chat');
  
  // Navigate between community and chat
  const handleTabChange = (tab: 'community' | 'chat') => {
    setActiveTab(tab);
    if (tab === 'community') {
      router.replace('/(tabs)/social/community');
    } else {
      router.replace('/(tabs)/social/chat');
    }
  };

  // Update active tab based on current pathname
  useEffect(() => {
    if (pathname?.includes('/community')) {
      setActiveTab('community');
    } else {
      setActiveTab('chat');
    }
  }, [pathname]);

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
          <View style={styles.headerTabsContainer}>
            <TouchableOpacity
              style={styles.headerTab}
              onPress={() => handleTabChange('community')}
              activeOpacity={0.7}
            >
              <Text style={[styles.headerTabText, activeTab === 'community' && styles.headerTabTextActive]}>
                Cộng đồng
              </Text>
              {activeTab === 'community' && <View style={styles.headerTabIndicator} />}
            </TouchableOpacity>
            <View style={styles.headerTabDivider} />
            <TouchableOpacity
              style={styles.headerTab}
              onPress={() => handleTabChange('chat')}
              activeOpacity={0.7}
            >
              <View style={styles.headerTabContent}>
                <Text style={[styles.headerTabText, activeTab === 'chat' && styles.headerTabTextActive]}>
                  Tin nhắn
                </Text>
                {unreadCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>
                      {unreadCount > 99 ? '99+' : String(unreadCount)}
                    </Text>
                  </View>
                )}
              </View>
              {activeTab === 'chat' && <View style={styles.headerTabIndicator} />}
            </TouchableOpacity>
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
    paddingTop: 50,
    paddingBottom: 12,
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
  headerTabsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    flex: 1,
  },
  headerTab: {
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    position: 'relative',
  },
  headerTabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTabDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  headerTabText: {
    fontSize: 17,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  headerTabTextActive: {
    color: '#fff',
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
  headerTabIndicator: {
    position: 'absolute',
    bottom: 2,
    left: '50%',
    transform: [{ translateX: -15 }],
    width: 30,
    height: 3,
    backgroundColor: '#fff',
    borderRadius: 2,
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
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
    paddingHorizontal: 4,
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
