import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { MessageCircle, Heart } from 'lucide-react-native';
import { ChatService, Conversation } from '../services/chat.service';
import { useAuth } from '../../../../contexts/AuthContext';

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

    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => onConversationSelect(item)}
      >
        <View style={styles.avatarContainer}>
          <Image
            source={{ 
              uri: otherUser?.avatar_url || 'https://via.placeholder.com/50'
            }}
            style={styles.avatar}
          />
          {item.unread_count && item.unread_count > 0 ? (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>
                {item.unread_count > 99 ? '99+' : String(item.unread_count)}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={styles.userName}>
              {otherUser?.full_name || 'Unknown User'}
            </Text>
            <Text style={styles.timeText}>
              {formatTime(item.last_message_at)}
            </Text>
          </View>

          <View style={styles.petInfo}>
            <Heart size={12} color="#FF5A75" />
            <Text style={styles.petName}>
              {`${pet?.name || 'Unknown Pet'} • ${pet?.type || 'Pet'}`}
            </Text>
          </View>

          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.unread_count && item.unread_count > 0 
              ? `${item.unread_count} tin nhắn mới`
              : 'Nhấn để xem cuộc trò chuyện'
            }
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF5A75" />
        <Text style={styles.loadingText}>Đang tải cuộc trò chuyện...</Text>
      </View>
    );
  }

  if (conversations.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MessageCircle size={64} color="#ccc" />
        <Text style={styles.emptyTitle}>Chưa có cuộc trò chuyện nào</Text>
        <Text style={styles.emptySubtitle}>
          Thích một pet để bắt đầu trò chuyện với người bán!
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={conversations}
      keyExtractor={(item) => item.id}
      renderItem={renderConversation}
      style={styles.list}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  conversationItem: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF5A75',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  conversationContent: {
    flex: 1,
    justifyContent: 'center',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  timeText: {
    fontSize: 12,
    color: '#999',
  },
  petInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  petName: {
    fontSize: 12,
    color: '#FF5A75',
    marginLeft: 4,
    fontWeight: '500',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
  },
});
