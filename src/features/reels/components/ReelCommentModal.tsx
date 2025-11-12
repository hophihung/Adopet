/**
 * Reel Comment Modal
 * Hiển thị và quản lý comments cho reels với realtime
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { X, Send, Trash2 } from 'lucide-react-native';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { ReelService, ReelComment } from '../services/reel.service';

interface ReelCommentModalProps {
  visible: boolean;
  reelId: string;
  onClose: () => void;
}

export default function ReelCommentModal({
  visible,
  reelId,
  onClose,
}: ReelCommentModalProps) {
  const [comments, setComments] = useState<ReelComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();

  // Load comments
  const loadComments = useCallback(async () => {
    try {
      setLoading(true);
      const data = await ReelService.getComments(reelId);
      setComments(data);
    } catch (error: any) {
      console.error('Error loading comments:', error);
      Alert.alert('Lỗi', 'Không thể tải comments');
    } finally {
      setLoading(false);
    }
  }, [reelId]);

  useEffect(() => {
    if (visible && reelId) {
      loadComments();
    }
  }, [visible, reelId, loadComments]);

  // Realtime comments
  useEffect(() => {
    if (!visible || !reelId) return;

    const channel = supabase
      .channel(`reel:${reelId}:comments`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reel_comments',
          filter: `reel_id=eq.${reelId}`,
        },
        async (payload) => {
          const newComment = payload.new as ReelComment;
          try {
            // Fetch full comment với user data
            const fullComment = await ReelService.getComments(reelId);
            setComments(fullComment);
          } catch (error) {
            console.error('Error loading new comment:', error);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'reel_comments',
          filter: `reel_id=eq.${reelId}`,
        },
        (payload) => {
          const deletedComment = payload.old as { id: string };
          setComments((prev) => prev.filter((c) => c.id !== deletedComment.id));
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [visible, reelId]);

  const handleSubmit = async () => {
    if (!user?.id) {
      Alert.alert('Thông báo', 'Vui lòng đăng nhập để comment');
      return;
    }

    if (!commentText.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập nội dung comment');
      return;
    }

    try {
      setSubmitting(true);
      await ReelService.addComment(reelId, user.id, commentText.trim());
      setCommentText('');
    } catch (error: any) {
      console.error('Error adding comment:', error);
      Alert.alert('Lỗi', 'Không thể thêm comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!user?.id) {
      return;
    }

    Alert.alert(
      'Xác nhận',
      'Bạn có chắc muốn xóa comment này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await ReelService.deleteComment(commentId, user.id);
            } catch (error: any) {
              console.error('Error deleting comment:', error);
              Alert.alert('Lỗi', 'Không thể xóa comment');
            }
          },
        },
      ]
    );
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Comments</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FF6B6B" />
            </View>
          ) : (
            <FlatList
              data={comments}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const canDelete = user?.id === item.user_id;
                return (
                  <View style={styles.commentItem}>
                    {item.user?.avatar_url ? (
                      <Image
                        source={{ uri: item.user.avatar_url }}
                        style={styles.avatar}
                      />
                    ) : (
                      <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarText}>
                          {item.user?.full_name?.[0]?.toUpperCase() || 'U'}
                        </Text>
                      </View>
                    )}
                    <View style={styles.commentContent}>
                      <View style={styles.commentHeader}>
                        <Text style={styles.commentAuthor}>
                          {item.user?.full_name || 'Anonymous'}
                        </Text>
                        {canDelete && (
                          <TouchableOpacity
                            onPress={() => handleDelete(item.id)}
                            style={styles.deleteButton}
                          >
                            <Trash2 size={16} color="#999" />
                          </TouchableOpacity>
                        )}
                      </View>
                      <Text style={styles.commentText}>{item.content}</Text>
                      <Text style={styles.commentTime}>
                        {formatTime(item.created_at)}
                      </Text>
                    </View>
                  </View>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Chưa có comment nào</Text>
                </View>
              }
              contentContainerStyle={
                comments.length === 0 ? styles.emptyList : undefined
              }
            />
          )}

          {user?.id && (
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Viết comment..."
                placeholderTextColor="#999"
                value={commentText}
                onChangeText={setCommentText}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!commentText.trim() || submitting) && styles.sendButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={!commentText.trim() || submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Send size={20} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modal: {
    flex: 1,
    backgroundColor: '#000',
    marginTop: 100,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6B6B',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  deleteButton: {
    padding: 4,
  },
  commentText: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 4,
    lineHeight: 20,
  },
  commentTime: {
    fontSize: 12,
    color: '#999',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
    alignItems: 'flex-end',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#222',
    color: '#fff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#444',
    opacity: 0.5,
  },
});

