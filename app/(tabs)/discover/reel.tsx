import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
import { Heart, MessageCircle, Share2, Plus, Send, X, Music, Video, Image as ImageIcon } from 'lucide-react-native';
import { Video as ExpoVideo, AVPlaybackStatus } from 'expo-av';
import { useRouter, usePathname } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { ReelService, Reel, ReelComment } from '@/src/features/reels/services/reel.service';
import { colors } from '@/src/theme/colors';
import { Audio } from 'expo-av';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ReelScreen() {
  const router = useRouter();
  const pathname = usePathname();
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
  const videoRefs = useRef<Map<string, ExpoVideo>>(new Map());
  
  // Audio state for music playback
  const [audioSound, setAudioSound] = useState<Audio.Sound | null>(null);
  const [currentPlayingReelId, setCurrentPlayingReelId] = useState<string | null>(null);
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);
  const [videoOrientations, setVideoOrientations] = useState<Map<string, 'landscape' | 'portrait' | 'square' | 'wide'>>(new Map());
  const [activeTab, setActiveTab] = useState<'match' | 'explore'>('explore');
  const [expandedCaptions, setExpandedCaptions] = useState<Set<string>>(new Set()); // Track expanded captions
  
  // Navigate between match and explore screens
  const handleTabChange = (tab: 'match' | 'explore') => {
    setActiveTab(tab);
    if (tab === 'match') {
      router.replace('/(tabs)/discover/match');
    } else {
      router.replace('/(tabs)/discover/reel');
    }
  };

  useEffect(() => {
    loadReels();
    loadLikedReels();
  }, []);

  // Update active tab based on current pathname
  useEffect(() => {
    if (pathname?.includes('/match')) {
      setActiveTab('match');
    } else if (pathname?.includes('/reel') || pathname?.includes('/explore')) {
      setActiveTab('explore');
    }
  }, [pathname]);

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

  // Cleanup video refs and audio on unmount
  useEffect(() => {
    return () => {
      // Pause all videos
      videoRefs.current.forEach((video) => {
        video.pauseAsync().catch(console.error);
      });
      videoRefs.current.clear();
      
      // Stop audio
      if (audioSound) {
        audioSound.unloadAsync().catch(console.error);
      }
    };
  }, [audioSound]);

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

  const handleLike = useCallback(async (reelId: string) => {
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
  }, [user?.id, likedReels]);

  const handleComment = useCallback((reelId: string) => {
    if (!user?.id) {
      Alert.alert('Thông báo', 'Vui lòng đăng nhập để bình luận');
      return;
    }

    setSelectedReelId(reelId);
    setCommentModalVisible(true);
    loadComments(reelId);
  }, [user?.id]);

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

  const handleViewChange = useCallback((viewableItems: any) => {
    if (viewableItems.viewableItems.length > 0) {
      const currentIndex = viewableItems.viewableItems[0].index;
      setCurrentIndex(currentIndex);

      // Increment view count and play video
      const reel = reels[currentIndex];
      if (reel) {
        ReelService.incrementView(reel.id);
        
        // Play video if it's a video reel
        if (reel.media_type === 'video' && reel.video_url) {
          handlePlayVideo(reel.id);
        }
        
        // Play music if reel has music track
        handlePlayMusic(reel);
      } else {
        // Stop video and music when no reel is visible
        handlePauseVideo();
        handleStopMusic();
      }
    } else {
      // No items visible, pause everything
      handlePauseVideo();
      handleStopMusic();
    }
  }, [reels, handlePlayVideo, handlePauseVideo, handlePlayMusic, handleStopMusic]);

  // Play video for current reel
  const handlePlayVideo = useCallback(async (reelId: string) => {
    // Pause previous video
    if (currentVideoId && currentVideoId !== reelId) {
      const prevVideo = videoRefs.current.get(currentVideoId);
      if (prevVideo) {
        try {
          await prevVideo.pauseAsync();
        } catch (error) {
          console.error('Error pausing previous video:', error);
        }
      }
    }

    // Play current video
    const video = videoRefs.current.get(reelId);
    if (video) {
      try {
        await video.playAsync();
        setCurrentVideoId(reelId);
      } catch (error) {
        console.error('Error playing video:', error);
      }
    }
  }, [currentVideoId]);

  // Pause current video
  const handlePauseVideo = useCallback(async () => {
    if (currentVideoId) {
      const video = videoRefs.current.get(currentVideoId);
      if (video) {
        try {
          await video.pauseAsync();
        } catch (error) {
          console.error('Error pausing video:', error);
        }
      }
      setCurrentVideoId(null);
    }
  }, [currentVideoId]);

  // Stop music
  const handleStopMusic = useCallback(async () => {
    if (audioSound) {
      try {
        await audioSound.unloadAsync();
        setAudioSound(null);
      } catch (error) {
        console.error('Error stopping music:', error);
      }
    }
    setCurrentPlayingReelId(null);
  }, [audioSound]);

  // Play music for current reel
  const handlePlayMusic = useCallback(async (reel: Reel) => {
    // Stop previous music
    if (currentPlayingReelId && currentPlayingReelId !== reel.id) {
      handleStopMusic();
    }

    // If reel has music track, play it
    if (reel.music_tracks && reel.music_track_id) {
      setCurrentPlayingReelId(reel.id);
      
      // TODO: Implement audio playback with expo-av
      // try {
      //   // Stop previous sound
      //   if (audioSound) {
      //     await audioSound.unloadAsync();
      //   }
      //   
      //   // Create new sound
      //   const { sound } = await Audio.Sound.createAsync(
      //     { uri: reel.music_tracks.audio_url },
      //     {
      //       shouldPlay: true,
      //       isLooping: true,
      //       volume: reel.music_volume || 0.7,
      //     }
      // );
      //   
      //   // Seek to start time if specified
      //   if (reel.music_start_time) {
      //     await sound.setPositionAsync(reel.music_start_time * 1000);
      //   }
      //   
      //   setAudioSound(sound);
      // } catch (error) {
      //   console.error('Error playing music:', error);
      // }
      
      console.log('Music should play:', reel.music_tracks.title);
    } else {
      handleStopMusic();
    }
  }, [currentPlayingReelId, handleStopMusic]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      handleStopMusic();
    };
  }, []);

  const renderReel = useCallback(({ item, index }: { item: Reel; index: number }) => {
    const isLiked = likedReels.has(item.id);
    const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
    const mediaUrl = item.media_type === 'image' 
      ? (item.image_url || item.thumbnail_url)
      : (item.video_url || item.thumbnail_url);
    const isPlayingMusic = currentPlayingReelId === item.id && item.music_tracks;
    const isCurrentVideo = currentVideoId === item.id;
    const videoOrientation = videoOrientations.get(item.id) || 'portrait';
    const isLandscape = videoOrientation === 'landscape';
    const isWide = videoOrientation === 'wide'; // 16:9 aspect ratio
    const isSquare = videoOrientation === 'square'; // 1:1 aspect ratio

    return (
      <View style={styles.reelContainer}>
        {/* Media - Image or Video */}
        {item.media_type === 'image' ? (
          <Image
            source={{ uri: mediaUrl || '' }}
            style={styles.reelImage}
            resizeMode="cover"
            cache="force-cache"
          />
        ) : (
          item.video_url ? (
            <View style={
              isWide || isSquare 
                ? styles.containVideoContainer 
                : isLandscape 
                ? styles.landscapeVideoContainer 
                : styles.portraitVideoContainer
            }>
              <ExpoVideo
                ref={(ref) => {
                  if (ref) {
                    videoRefs.current.set(item.id, ref);
                  } else {
                    videoRefs.current.delete(item.id);
                  }
                }}
                source={{ uri: item.video_url }}
                style={
                  isWide || isSquare
                    ? styles.containVideo
                    : isLandscape
                    ? styles.landscapeVideo
                    : styles.portraitVideo
                }
                resizeMode={isWide || isSquare || isLandscape ? "contain" : "cover"}
                shouldPlay={isCurrentVideo}
                isLooping
                isMuted={false}
                useNativeControls={false}
                onLoadStart={() => {
                  // Video started loading
                }}
                onLoad={(status) => {
                  // Detect video aspect ratio from dimensions
                  if (status.isLoaded && status.naturalSize) {
                    const { width, height } = status.naturalSize;
                    const aspectRatio = width / height;
                    
                    let orientation: 'landscape' | 'portrait' | 'square' | 'wide';
                    if (Math.abs(aspectRatio - 1) < 0.1) {
                      // 1:1 (square)
                      orientation = 'square';
                    } else if (Math.abs(aspectRatio - 16/9) < 0.1 || Math.abs(aspectRatio - 1.78) < 0.1) {
                      // 16:9 (wide)
                      orientation = 'wide';
                    } else if (width > height) {
                      // Landscape
                      orientation = 'landscape';
                    } else {
                      // Portrait
                      orientation = 'portrait';
                    }
                    
                    setVideoOrientations((prev) => {
                      const newMap = new Map(prev);
                      newMap.set(item.id, orientation);
                      return newMap;
                    });
                  }
                  
                  // Video loaded, auto-play if it's the current video
                  if (isCurrentVideo) {
                    handlePlayVideo(item.id);
                  }
                }}
                onError={(error) => {
                  console.error('Video error:', error);
                }}
              />
            </View>
          ) : (
            // Fallback to thumbnail if video URL is not available
            <Image
              source={{ uri: item.thumbnail_url || '' }}
              style={styles.reelImage}
              resizeMode="cover"
            />
          )
        )}

        {/* Overlay - TikTok style */}
        <View style={styles.overlay}>
          {/* Left side - User Info & Caption */}
          <View style={styles.infoContainer}>
            {/* User Avatar and Name */}
            <View style={styles.userInfo}>
              {profile?.avatar_url && (
                <Image
                  source={{ uri: profile.avatar_url }}
                  style={styles.userAvatar}
                  cache="force-cache"
                />
              )}
              <Text style={styles.username}>
                @{profile?.full_name?.toLowerCase().replace(/\s+/g, '_') || 'user'}
              </Text>
            </View>
            
            {/* Caption - positioned to be visible above tab bar */}
            {item.caption && (() => {
              const isExpanded = expandedCaptions.has(item.id);
              const captionLength = item.caption.length;
              const shouldShowReadMore = captionLength > 100; // Show "Xem thêm" if caption is longer than 100 characters
              
              return (
                <View>
                  <Text 
                    style={styles.caption} 
                    numberOfLines={isExpanded ? undefined : 2}
                  >
                    {item.caption}
                  </Text>
                  {shouldShowReadMore && (
                    <TouchableOpacity
                      onPress={() => {
                        setExpandedCaptions((prev) => {
                          const newSet = new Set(prev);
                          if (isExpanded) {
                            newSet.delete(item.id);
                          } else {
                            newSet.add(item.id);
                          }
                          return newSet;
                        });
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.readMoreText}>
                        {isExpanded ? 'Thu gọn' : 'Xem thêm'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })()}
            
            {/* Music Info - TikTok style with icon and animated text */}
            {item.music_tracks && (
              <TouchableOpacity 
                style={styles.musicContainer}
                activeOpacity={0.8}
              >
                <View style={styles.musicIconContainer}>
                  <Music size={16} color="#fff" />
                </View>
                <View style={styles.musicTextContainer}>
                  <Text style={styles.musicText} numberOfLines={1}>
                    {item.music_tracks.title} · {item.music_tracks.artist}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </View>

          {/* Right side - Actions */}
          <View style={styles.actionsContainer}>
            {/* Avatar Button */}
            {profile?.avatar_url && (
              <TouchableOpacity style={styles.avatarButton}>
                <Image
                  source={{ uri: profile.avatar_url }}
                  style={styles.actionAvatar}
                  cache="force-cache"
                />
                <View style={styles.followButton}>
                  <Plus size={14} color="#fff" />
                </View>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleLike(item.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconContainer, isLiked && styles.actionIconContainerLiked]}>
                <Heart
                  size={28}
                  color={isLiked ? '#fff' : '#fff'}
                  fill={isLiked ? '#FF3040' : 'transparent'}
                  strokeWidth={2.5}
                />
              </View>
              <Text style={styles.actionText}>{item.like_count}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleComment(item.id)}
              activeOpacity={0.7}
            >
              <View style={styles.actionIconContainer}>
                <MessageCircle size={28} color="#fff" strokeWidth={2.5} />
              </View>
              <Text style={styles.actionText}>{item.comment_count}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
              <View style={styles.actionIconContainer}>
                <Share2 size={28} color="#fff" strokeWidth={2.5} />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }, [likedReels, currentPlayingReelId, currentVideoId, videoOrientations, expandedCaptions, handleLike, handleComment, handlePlayVideo]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Transparent header with tabs like TikTok */}
      <View style={styles.header}>
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={styles.tab}
            onPress={() => handleTabChange('match')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'match' && styles.tabTextActive]}>
              Match
            </Text>
            {activeTab === 'match' && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
          <View style={styles.tabDivider} />
          <TouchableOpacity
            style={styles.tab}
            onPress={() => handleTabChange('explore')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'explore' && styles.tabTextActive]}>
              Khám phá
            </Text>
            {activeTab === 'explore' && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/reel/create-reel')}
          >
            <Plus size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={reels}
        renderItem={renderReel}
        keyExtractor={(item) => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={SCREEN_HEIGHT}
        decelerationRate="fast"
        onViewableItemsChanged={handleViewChange}
        viewabilityConfig={{
          itemVisiblePercentThreshold: 50,
          minimumViewTime: 100,
        }}
        onScrollToIndexFailed={(info) => {
          // Handle scroll to index failure
          console.warn('Scroll to index failed:', info);
        }}
        getItemLayout={(data, index) => ({
          length: SCREEN_HEIGHT,
          offset: SCREEN_HEIGHT * index,
          index,
        })}
        removeClippedSubviews={true}
        windowSize={5}
        maxToRenderPerBatch={3}
        updateCellsBatchingPeriod={50}
        initialNumToRender={2}
        maintainVisibleContentPosition={null}
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    flex: 1,
    justifyContent: 'center',
  },
  headerRight: {
    position: 'absolute',
    right: 16,
  },
  tab: {
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    position: 'relative',
  },
  tabDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  tabText: {
    fontSize: 17,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    letterSpacing: 0.2,
  },
  tabTextActive: {
    color: '#fff',
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 5,
  },
  tabIndicator: {
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
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  reelContainer: {
    height: SCREEN_HEIGHT,
    width: SCREEN_WIDTH,
    position: 'relative',
    backgroundColor: '#000',
  },
  reelImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#000',
  },
  portraitVideoContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#000',
  },
  portraitVideo: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#000',
  },
  landscapeVideoContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  landscapeVideo: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.8, // Keep some space, don't force full screen
    backgroundColor: '#000',
  },
  containVideoContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  containVideo: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#000',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 20, // Safe area padding
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 100 : 80, // Space for header tabs
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 100, // Đẩy lên cao để không bị che bởi bottom tab bar (65px height + 16px marginBottom + 20px safe area)
    maxWidth: SCREEN_WIDTH - 100, // Leave space for action buttons
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  username: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  caption: {
    fontSize: 14,
    color: '#fff',
    lineHeight: 20,
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    paddingRight: 8,
  },
  readMoreText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  musicContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    maxWidth: '90%',
    marginTop: 4,
  },
  musicIconContainer: {
    marginRight: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  musicTextContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  musicText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    letterSpacing: 0.3,
  },
  actionsContainer: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 20,
    paddingBottom: 100, // Đẩy lên cao để không bị che bởi bottom tab bar (65px height + 16px marginBottom + 20px safe area)
  },
  avatarButton: {
    marginBottom: 4,
    position: 'relative',
  },
  actionAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#fff',
  },
  followButton: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
  actionButton: {
    alignItems: 'center',
    gap: 4,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  actionIconContainerLiked: {
    backgroundColor: 'rgba(255, 48, 64, 0.2)',
    borderColor: 'rgba(255, 48, 64, 0.4)',
  },
  actionText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    marginTop: 2,
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
