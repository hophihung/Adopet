import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { MessageCircle, Heart } from 'lucide-react-native';
import { ChatService, Conversation } from '../services/chat.service';
import { useAuth } from '../../../../contexts/AuthContext';
import { colors } from '@/src/theme/colors';

interface ChatListProps {
  onConversationSelect: (conversation: Conversation) => void;
}

export function ChatList({ onConversationSelect }: ChatListProps) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadConversations();
      subscribeToUpdates();
    }
  }, [user?.id]);

  const loadConversations = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const data = await ChatService.getConversations(user.id);
      setConversations(data);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToUpdates = () => {
    if (!user?.id) return;

    const subscription = ChatService.subscribeToConversationList(
      user.id,
      (conversation) => {
        setConversations(prev => {
          const existing = prev.find(c => c.id === conversation.id);
          if (existing) {
            return prev.map(c => c.id === conversation.id ? conversation : c);
          } else {
            return [conversation, ...prev];
          }
        });
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('vi-VN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString('vi-VN', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('vi-VN', { 
        day: '2-digit', 
        month: '2-digit' 
      });
    }
  };

  const renderConversation = ({ item }: { item: Conversation }) => {
    const otherUser = user?.id === item.buyer_id ? item.seller : item.buyer;
    const pet = item.pet;

    const renderRightActions = (_: any, dragX: Animated.AnimatedInterpolation<number>) => {
      return (
        <View style={styles.rightActions}>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={async () => {
              if (!user?.id) return;
              try {
                await ChatService.archiveConversation(item.id, user.id);
                setConversations(prev => prev.filter(c => c.id !== item.id));
              } catch (e) {
                console.error('Error archiving conversation', e);
              }
            }}
          >
            <Text style={styles.deleteText}>Xóa</Text>
          </TouchableOpacity>
        </View>
      );
    };

    return (
      <Swipeable renderRightActions={renderRightActions} overshootRight={false}>
        <TouchableOpacity
          style={styles.conversationItem}
          onPress={() => onConversationSelect(item)}
        >
          <View style={styles.avatarContainer}>
            <Image
              source={{ 
                uri: String(otherUser?.avatar_url || 'https://via.placeholder.com/50')
              }}
              style={styles.avatar}
            />
            {item.unread_count && item.unread_count > 0 ? (
              <View style={styles.onlineDot} />
            ) : null}
          </View>

          <View style={styles.conversationContent}>
            <View style={styles.conversationHeader}>
              <Text style={styles.userName}>
                {String(otherUser?.full_name || 'Unknown User')}
              </Text>
              {item.unread_count && item.unread_count > 0 && (
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>User mới</Text>
                </View>
              )}
            </View>

            <Text style={styles.statusText} numberOfLines={1}>
              Có hoạt động gần đây, tương hợp ngay!
            </Text>
          </View>
        </TouchableOpacity>
      </Swipeable>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Đang tải cuộc trò chuyện...</Text>
      </View>
    );
  }

  if (conversations.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MessageCircle size={64} color={colors.textTertiary} />
        <Text style={styles.emptyTitle}>Chưa có cuộc trò chuyện nào</Text>
        <Text style={styles.emptySubtitle}>
          Thích một pet để bắt đầu trò chuyện với người bán!
        </Text>
      </View>
    );
  }

  const renderHeader = () => {
    // Get recent matches (conversations with pets)
    const recentMatches = conversations
      .filter(c => c.pet)
      .slice(0, 10);

    if (recentMatches.length === 0) return null;

    return (
      <View style={styles.matchesSection}>
        <Text style={styles.sectionTitle}>Người Mua mới</Text>
        <FlatList
          horizontal
          data={recentMatches}
          keyExtractor={(item) => `match-${item.id}`}
          renderItem={({ item }) => {
            const pet = item.pet;
            const petImage = pet?.images && Array.isArray(pet.images) && pet.images.length > 0
              ? String(pet.images[0])
              : 'https://via.placeholder.com/100';

            return (
              <TouchableOpacity
                style={styles.matchItem}
                onPress={() => onConversationSelect(item)}
              >
                <View style={styles.matchImageContainer}>
                  <Image
                    source={{ uri: petImage }}
                    style={styles.matchImage}
                  />
                  {item.unread_count && item.unread_count > 0 && (
                    <View style={styles.matchBadge}>
                      <Text style={styles.matchBadgeText}>
                        {String(item.unread_count)}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.matchName} numberOfLines={1}>
                  {String(pet?.name || 'Pet')}
                </Text>
              </TouchableOpacity>
            );
          }}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.matchesContent}
        />
      </View>
    );
  };

  return (
    <FlatList
      data={conversations}
      keyExtractor={(item) => item.id}
      renderItem={renderConversation}
      ListHeaderComponent={renderHeader}
      style={styles.list}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: '#F0F2F5',
  },
  matchesSection: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderBottomWidth: 8,
    borderBottomColor: '#F0F2F5',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#050505',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  matchesContent: {
    paddingHorizontal: 12,
  },
  matchItem: {
    alignItems: 'center',
    marginHorizontal: 4,
    width: 80,
  },
  matchImageContainer: {
    position: 'relative',
    marginBottom: 6,
  },
  matchImage: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: '#F0F2F5',
    borderWidth: 3,
    borderColor: '#FFD700',
  },
  matchBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  matchBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  matchName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#050505',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  conversationItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F0F2F5',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#31A24C',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  conversationContent: {
    flex: 1,
    justifyContent: 'center',
  },
  conversationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#050505',
  },
  newBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  newBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000000',
  },
  statusText: {
    fontSize: 13,
    color: '#65676B',
    lineHeight: 18,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: 20,
    height: '100%',
  },
  deleteButton: {
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
    borderRadius: 0,
  },
  deleteText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
