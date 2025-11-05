import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Heart, MessageCircle, Share2, Plus, Send, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { ReelService, Reel, ReelComment } from '@/src/features/reels/services/reel.service';
import { colors } from '@/src/theme/colors';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ReelScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedReels, setLikedReels] = useState<Set<string>>(new Set());
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [selectedReelId, setSelectedReelId] = useState<string | null>(null);
  const [comments, setComments] = useState<ReelComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadReels();
    loadLikedReels();
  }, []);

  useEffect(() => {
    // Subscribe to realtime updates
    const reelSubscription = ReelService.subscribeToReels((updatedReel) => {
      setReels((prev) =>
        prev.map((r) => (r.id === updatedReel.id ? updatedReel : r))
      );
    });

    return () => {
      reelSubscription.unsubscribe();
    };
  }, []);

  const loadReels = async () => {
    try {
      setLoading(true);
      const data = await ReelService.getAll(50);
      setReels(data);
    } catch (error) {
      console.error('Error loading reels:', error);
      Alert.alert('Lỗi', 'Không thể tải reels');
    } finally {
      setLoading(false);
    }
  };

  const loadLikedReels = async () => {
    if (!user?.id) return;

    try {
      const likedSet = new Set<string>();
      for (const reel of reels) {
        const isLiked = await ReelService.isLiked(reel.id, user.id);
        if (isLiked) {
          likedSet.add(reel.id);
        }
      }
      setLikedReels(likedSet);
    } catch (error) {
      console.error('Error loading liked reels:', error);
    }
  };

  const handleLike = async (reelId: string) => {
    if (!user?.id) {
      Alert.alert('Thông báo', 'Vui lòng đăng nhập để thích reel');
      return;
    }

    try {
      const result = await ReelService.toggleLike(reelId, user.id);
      setLikedReels((prev) => {
        const newSet = new Set(prev);
        if (result.liked) {
          newSet.add(reelId);
        } else {
          newSet.delete(reelId);
        }
        return newSet;
      });

      // Update reel in state
      setReels((prev) =>
        prev.map((r) =>
          r.id === reelId ? { ...r, like_count: result.like_count } : r
        )
      );
    } catch (error) {
      console.error('Error toggling like:', error);
      Alert.alert('Lỗi', 'Không thể thích reel');
    }
  };

  const handleComment = (reelId: string) => {
    if (!user?.id) {
      Alert.alert('Thông báo', 'Vui lòng đăng nhập để bình luận');
      return;
    }

    setSelectedReelId(reelId);
    setCommentModalVisible(true);
    loadComments(reelId);
  };

  const loadComments = async (reelId: string) => {
    try {
      setLoadingComments(true);
      const data = await ReelService.getComments(reelId);
      setComments(data);

      // Subscribe to realtime comments
      const subscription = ReelService.subscribeToReelComments(
        reelId,
        (newComment) => {
          setComments((prev) => {
            // Prevent duplicates
            if (prev.find((c) => c.id === newComment.id)) {
              return prev;
            }
            return [...prev, newComment];
          });
        }
      );

      return () => subscription.unsubscribe();
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const sendComment = async () => {
    if (!selectedReelId || !user?.id || !commentText.trim()) return;

    try {
      setSendingComment(true);
      const newComment = await ReelService.addComment(
        selectedReelId,
        user.id,
        commentText.trim()
      );

      setComments((prev) => [...prev, newComment]);
      setCommentText('');

      // Update comment count
      setReels((prev) =>
        prev.map((r) =>
          r.id === selectedReelId
            ? { ...r, comment_count: r.comment_count + 1 }
            : r
        )
      );
    } catch (error) {
      console.error('Error sending comment:', error);
      Alert.alert('Lỗi', 'Không thể gửi bình luận');
    } finally {
      setSendingComment(false);
    }
  };

  const handleViewChange = (viewableItems: any) => {
    if (viewableItems.viewableItems.length > 0) {
      const currentIndex = viewableItems.viewableItems[0].index;
      setCurrentIndex(currentIndex);

      // Increment view count
      const reel = reels[currentIndex];
      if (reel) {
        ReelService.incrementView(reel.id);
      }
    }
  };

  const renderReel = ({ item, index }: { item: Reel; index: number }) => {
    const isLiked = likedReels.has(item.id);
    const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;

    return (
      <View style={styles.reelContainer}>
        {/* Video/Thumbnail */}
        <Image
          source={{
            uri: item.thumbnail_url || item.video_url,
          }}
          style={styles.reelImage}
          resizeMode="cover"
        />

        {/* Overlay */}
        <View style={styles.overlay}>
          {/* Left side - Info */}
          <View style={styles.infoContainer}>
            <Text style={styles.username}>
              @{profile?.full_name?.toLowerCase().replace(/\s+/g, '_') || 'user'}
            </Text>
            <Text style={styles.caption}>{item.caption || ''}</Text>
          </View>

          {/* Right side - Actions */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleLike(item.id)}
            >
              <Heart
                size={32}
                color="#fff"
                fill={isLiked ? '#FF6B6B' : 'transparent'}
              />
              <Text style={styles.actionText}>{item.like_count}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleComment(item.id)}
            >
              <MessageCircle size={32} color="#fff" />
              <Text style={styles.actionText}>{item.comment_count}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              <Share2 size={32} color="#fff" />
              <Text style={styles.actionText}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reel 🎬</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/reel/create-reel')}
        >
          <Plus size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={reels}
        renderItem={renderReel}
        keyExtractor={(item) => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={SCREEN_HEIGHT - 120}
        decelerationRate="fast"
        onViewableItemsChanged={handleViewChange}
        viewabilityConfig={{
          itemVisiblePercentThreshold: 50,
        }}
      />

      {/* Comment Modal */}
      <Modal
        visible={commentModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setCommentModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Bình luận</Text>
            <TouchableOpacity
              onPress={() => setCommentModalVisible(false)}
              style={styles.closeButton}
            >
              <X size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {loadingComments ? (
            <View style={styles.loadingComments}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={comments}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const profile = Array.isArray(item.profiles)
                  ? item.profiles[0]
                  : item.profiles;
                return (
                  <View style={styles.commentItem}>
                    <Image
                      source={{
                        uri: profile?.avatar_url || 'https://via.placeholder.com/40',
                      }}
                      style={styles.commentAvatar}
                    />
                    <View style={styles.commentContent}>
                      <Text style={styles.commentAuthor}>
                        {profile?.full_name || 'User'}
                      </Text>
                      <Text style={styles.commentText}>{item.content}</Text>
                    </View>
                  </View>
                );
              }}
              style={styles.commentsList}
            />
          )}

          <View style={styles.commentInputContainer}>
            <TextInput
              style={styles.commentInput}
              placeholder="Viết bình luận..."
              value={commentText}
              onChangeText={setCommentText}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!commentText.trim() || sendingComment) && styles.sendButtonDisabled,
              ]}
              onPress={sendComment}
              disabled={!commentText.trim() || sendingComment}
            >
              {sendingComment ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Send size={20} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  header: {
    paddingTop: 30,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: '#000',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reelContainer: {
    height: SCREEN_HEIGHT - 120,
    width: SCREEN_WIDTH,
    position: 'relative',
  },
  reelImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#111',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 32,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  username: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  caption: {
    fontSize: 14,
    color: '#fff',
    lineHeight: 20,
  },
  actionsContainer: {
    alignItems: 'center',
    gap: 20,
  },
  actionButton: {
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E4E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  loadingComments: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentsList: {
    flex: 1,
    padding: 20,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  commentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  commentContent: {
    flex: 1,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  commentText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  commentInputContainer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E4E7EB',
    gap: 12,
    alignItems: 'flex-end',
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E4E7EB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxHeight: 100,
    fontSize: 15,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#D4D6DC',
  },
});
