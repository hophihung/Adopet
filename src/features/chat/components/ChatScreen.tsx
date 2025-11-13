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
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Send, ArrowLeft, Heart, CreditCard } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { ChatService, Message, Conversation } from '../services/chat.service';
import { TransactionService, Transaction } from '../services/transaction.service';
import { TransactionCard } from './TransactionCard';
import { ReputationBadge, AvatarFrame, getReputationTier } from './ReputationBadge';
import { useAuth } from '../../../../contexts/AuthContext';

interface ChatScreenProps {
  conversation: Conversation;
  onBack: () => void;
}

export function ChatScreen({ conversation, onBack }: ChatScreenProps) {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [creatingTransaction, setCreatingTransaction] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  
  // Tab bar height (70) + marginBottom (20) + safe area bottom
  const tabBarHeight = 70;
  const tabBarMarginBottom = 20;
  const bottomPadding = tabBarHeight + tabBarMarginBottom + insets.bottom;

  const otherUser = user?.id === conversation.buyer_id ? conversation.seller : conversation.buyer;
  const pet = conversation.pet;
  const isSeller = user?.id === conversation.seller_id;
  const isBuyer = user?.id === conversation.buyer_id;

  useEffect(() => {
    loadMessages();
    loadTransactions();
    subscribeToMessages();
    subscribeToTransactions();
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

  const loadTransactions = async () => {
    try {
      setLoadingTransactions(true);
      const data = await TransactionService.getConversationTransactions(conversation.id);
      setTransactions(data);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const subscribeToTransactions = () => {
    const subscription = TransactionService.subscribeToTransactions(
      conversation.id,
      (transaction) => {
        setTransactions(prev => {
          // Prevent duplicates
          const exists = prev.find(t => t.id === transaction.id);
          if (exists) {
            // Update existing transaction
            return prev.map(t => t.id === transaction.id ? transaction : t);
          }
          // Add new transaction, but check for duplicates
          const hasDuplicate = prev.some(t => t.id === transaction.id);
          if (hasDuplicate) {
            return prev;
          }
          return [...prev, transaction];
        });
        // Remove loadTransactions() to prevent duplicate loading
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  };

  const handleSendTransactionCode = async () => {
    if (!user?.id) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin người dùng');
      return;
    }

    try {
      setCreatingTransaction(true);
      
      // Lấy pet mới nhất từ message "system" có meta.pet_id
      // Tìm message mới nhất có meta.pet_id (pet mới nhất được like)
      // Message type là 'system' khi like pet (từ migration 017)
      const latestPetLikeMessage = messages
        .filter(m => 
          m.message_type === 'system' && 
          m.meta && 
          (m.meta as any).pet_id
        )
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

      let selectedPetId: string | null = null;
      let selectedPetPrice: number = 0;

      if (latestPetLikeMessage && latestPetLikeMessage.meta) {
        const meta = latestPetLikeMessage.meta as any;
        selectedPetId = meta.pet_id;
        selectedPetPrice = meta.price || 0;
      } else if (pet) {
        // Fallback: dùng conversation.pet nếu không có message mới
        selectedPetId = pet.id;
        selectedPetPrice = pet.price || 0;
      }

      if (!selectedPetId) {
        Alert.alert('Lỗi', 'Không tìm thấy thông tin thú cưng');
        return;
      }

      const transaction = await TransactionService.createTransaction({
        conversation_id: conversation.id,
        pet_id: selectedPetId,
        amount: selectedPetPrice,
        payment_method: 'bank_transfer',
      });

      // Send system message about transaction
      // Nếu miễn phí (amount = 0), không gửi message về transaction code
      if (selectedPetPrice > 0 && transaction.transaction_code) {
        await ChatService.sendMessage(
          conversation.id,
          user.id,
          `Đã gửi mã giao dịch: ${transaction.transaction_code}`,
          'transaction',
          transaction.id
        );
      } else {
        // Gửi message khác cho giao dịch miễn phí
        await ChatService.sendMessage(
          conversation.id,
          user.id,
          'Đã tạo giao dịch miễn phí',
          'transaction',
          transaction.id
        );
      }

      // Prevent duplicate transactions
      setTransactions(prev => {
        const exists = prev.find(t => t.id === transaction.id);
        if (exists) {
          return prev;
        }
        return [...prev, transaction];
      });
      if (selectedPetPrice > 0 && transaction.transaction_code) {
        Alert.alert('Thành công', `Đã gửi mã giao dịch: ${transaction.transaction_code}`);
      } else {
        Alert.alert('Thành công', 'Đã tạo giao dịch miễn phí');
      }
    } catch (error: any) {
      console.error('Error creating transaction:', error);
      Alert.alert('Lỗi', error.message || 'Không thể tạo giao dịch');
    } finally {
      setCreatingTransaction(false);
    }
  };

  const handleTransactionUpdate = (updatedTransaction: Transaction) => {
    setTransactions(prev =>
      prev.map(t => t.id === updatedTransaction.id ? updatedTransaction : t)
    );
    loadTransactions();
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
    
    // Special rendering for system messages with meta
    if (item.message_type === 'system' && item.meta) {
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
              {`${item.sender?.full_name || 'Người dùng'} ${item.content}`}
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
                  {`${(meta?.type || '').toString()}${meta?.price ? ` • ${meta.price}` : ''}`}
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
          <AvatarFrame
            reputationPoints={item.sender?.reputation_points || 0}
            avatarFrame={item.sender?.avatar_frame as any}
          >
            <Image
              source={{ 
                uri: item.sender?.avatar_url || 'https://via.placeholder.com/30'
              }}
              style={styles.messageAvatar}
            />
          </AvatarFrame>
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
          <AvatarFrame
            reputationPoints={otherUser?.reputation_points || 0}
            avatarFrame={otherUser?.avatar_frame as any}
          >
            <Image
              source={{ 
                uri: otherUser?.avatar_url || 'https://via.placeholder.com/40'
              }}
              style={styles.headerAvatar}
            />
          </AvatarFrame>
          <View style={styles.headerText}>
            <View style={styles.headerNameRow}>
              <Text style={styles.headerName}>
                {otherUser?.full_name || 'Unknown User'}
              </Text>
              {otherUser?.reputation_points !== undefined && (
                <ReputationBadge
                  reputationPoints={otherUser.reputation_points}
                  avatarFrame={otherUser.avatar_frame as any}
                  size="small"
                  showPoints={false}
                />
              )}
            </View>
            <View style={styles.petInfo}>
              <Heart size={12} color="#FF5A75" />
              <Text style={styles.petName}>
                {pet?.name || 'Unknown Pet'}
              </Text>
            </View>
          </View>
        </View>
        {isSeller && pet && (
          <TouchableOpacity
            style={styles.transactionButton}
            onPress={handleSendTransactionCode}
            disabled={creatingTransaction}
          >
            {creatingTransaction ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <CreditCard size={16} color="#fff" />
                <Text style={styles.transactionButtonText}>Gửi mã</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={[
          ...transactions
            .filter((t, index, self) => 
              // Remove duplicate transactions by id
              index === self.findIndex(tr => tr.id === t.id)
            )
            .map(t => ({ type: 'transaction', id: t.id, data: t })),
          ...messages.map(m => ({ type: 'message', id: m.id, data: m })),
        ].sort((a, b) => {
          const aTime = a.type === 'transaction' 
            ? new Date(a.data.created_at).getTime()
            : new Date(a.data.created_at).getTime();
          const bTime = b.type === 'transaction'
            ? new Date(b.data.created_at).getTime()
            : new Date(b.data.created_at).getTime();
          return aTime - bTime;
        })}
        keyExtractor={(item, index) => {
          // Ensure unique keys - combine type, id, and index as fallback
          return `${item.type}-${item.id}-${index}`;
        }}
        renderItem={({ item }) => {
          if (item.type === 'transaction') {
            const transaction = item.data as Transaction;
            return (
              <TransactionCard
                transaction={transaction}
                isSeller={isSeller}
                isBuyer={isBuyer}
                onUpdate={handleTransactionUpdate}
              />
            );
          }
          return renderMessage({ item: item.data as Message });
        }}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Input */}
      <View style={[styles.inputContainer, { paddingBottom: bottomPadding }]}>
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
  headerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  transactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF5A75',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  transactionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
