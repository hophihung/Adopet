import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Send, ArrowLeft, Heart } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { ChatService, Message, Conversation } from '../services/chat.service';
import { useAuth } from '../../../../contexts/AuthContext';

interface ChatScreenProps {
  conversation: Conversation;
  onBack: () => void;
}

export function ChatScreen({ conversation, onBack }: ChatScreenProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const otherUser = user?.id === conversation.buyer_id ? conversation.seller : conversation.buyer;
  const pet = conversation.pet;

  useEffect(() => {
    loadMessages();
    subscribeToMessages();
    markAsRead();
  }, [conversation.id]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const data = await ChatService.getMessages(conversation.id);
      setMessages(data);
    } catch (error) {
      console.error('Error loading messages:', error);
      Alert.alert('Lỗi', 'Không thể tải tin nhắn');
    } finally {
      setLoading(false);
    }
  };

  const subscribeToMessages = () => {
    const subscription = ChatService.subscribeToConversation(
      conversation.id,
      (message) => {
        setMessages(prev => {
          // Prevent duplicate messages
          const exists = prev.find(m => m.id === message.id);
          if (exists) {
            return prev;
          }
          return [...prev, message];
        });
        // Auto scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  };

  const markAsRead = async () => {
    if (!user?.id) return;

    try {
      await ChatService.markAsRead(conversation.id, user.id);
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user?.id || sending) return;

    try {
      setSending(true);
      const message = await ChatService.sendMessage(
        conversation.id,
        user.id,
        newMessage.trim()
      );
      
      setMessages(prev => {
        // Prevent duplicate messages
        const exists = prev.find(m => m.id === message.id);
        if (exists) {
          return prev;
        }
        return [...prev, message];
      });
      setNewMessage('');
      
      // Auto scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Lỗi', 'Không thể gửi tin nhắn');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('vi-VN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.sender_id === user?.id;
    
    // Special rendering for pet_like with meta
    if (item.message_type === 'pet_like' && item.meta) {
      const meta = item.meta as any;
      return (
        <View style={[styles.messageContainer, isMe ? styles.myMessage : styles.otherMessage]}>
          {!isMe && (
            <Image
              source={{ uri: item.sender?.avatar_url || 'https://via.placeholder.com/30' }}
              style={styles.messageAvatar}
            />
          )}
          <View style={[styles.messageBubble, isMe ? styles.otherMessageBubble : styles.otherMessageBubble]}> 
            <Text style={styles.otherMessageText}>
              {item.sender?.full_name || 'Người dùng'} {item.content}
            </Text>
            <TouchableOpacity
              style={styles.petPreviewCard}
              onPress={() => meta?.pet_id && router.push(`/pet/${meta.pet_id}`)}
              activeOpacity={0.8}
            >
              {meta?.thumb ? (
                <Image source={{ uri: meta.thumb }} style={styles.petThumb} />
              ) : null}
              <View style={{ flex: 1 }}>
                <Text style={styles.petTitle}>{meta?.name || 'Thú cưng'}</Text>
                <Text style={styles.petSubtitle}>
                  {(meta?.type || '').toString()} {meta?.price ? `• ${meta.price}` : ''}
                </Text>
              </View>
            </TouchableOpacity>
            <Text style={styles.otherMessageTime}>{formatTime(item.created_at)}</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={[
        styles.messageContainer,
        isMe ? styles.myMessage : styles.otherMessage
      ]}>
        {!isMe && (
          <Image
            source={{ 
              uri: item.sender?.avatar_url || 'https://via.placeholder.com/30'
            }}
            style={styles.messageAvatar}
          />
        )}
        
        <View style={[
          styles.messageBubble,
          isMe ? styles.myMessageBubble : styles.otherMessageBubble
        ]}>
          <Text style={[
            styles.messageText,
            isMe ? styles.myMessageText : styles.otherMessageText
          ]}>
            {item.content}
          </Text>
          <Text style={[
            styles.messageTime,
            isMe ? styles.myMessageTime : styles.otherMessageTime
          ]}>
            {formatTime(item.created_at)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <ArrowLeft size={24} color="#333" />
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          <Image
            source={{ 
              uri: otherUser?.avatar_url || 'https://via.placeholder.com/40'
            }}
            style={styles.headerAvatar}
          />
          <View style={styles.headerText}>
            <Text style={styles.headerName}>
              {otherUser?.full_name || 'Unknown User'}
            </Text>
            <View style={styles.petInfo}>
              <Heart size={12} color="#FF5A75" />
              <Text style={styles.petName}>
                {pet?.name || 'Unknown Pet'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Nhập tin nhắn..."
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!newMessage.trim() || sending) && styles.sendButtonDisabled
          ]}
          onPress={sendMessage}
          disabled={!newMessage.trim() || sending}
        >
          <Send size={20} color={newMessage.trim() ? "#fff" : "#ccc"} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  petInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  petName: {
    fontSize: 12,
    color: '#FF5A75',
    marginLeft: 4,
    fontWeight: '500',
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: 16,
  },
  messageContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 4,
    alignItems: 'flex-end',
  },
  myMessage: {
    justifyContent: 'flex-end',
  },
  otherMessage: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  myMessageBubble: {
    backgroundColor: '#FF5A75',
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: '#f0f0f0',
    borderBottomLeftRadius: 4,
  },
  petPreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    marginTop: 8,
  },
  petThumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#eee',
    marginRight: 10,
  },
  petTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  petSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#333',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  myMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  otherMessageTime: {
    color: '#999',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#FF5A75',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#f0f0f0',
  },
});
