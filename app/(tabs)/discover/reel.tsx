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
  Animated,
  Easing,
  RefreshControl,
} from 'react-native';
import { Heart, MessageCircle, Share2, Plus, Send, X, Music, Video, Image as ImageIcon, User } from 'lucide-react-native';
import { Video as ExpoVideo, AVPlaybackStatus } from 'expo-av';
import { useRouter, usePathname } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { ReelService, Reel, ReelComment } from '@/src/features/reels/services/reel.service';
import { colors } from '@/src/theme/colors';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { ProductService, ReelProduct } from '@/src/features/products/services/product.service';
import { ProductTag } from '@/src/features/products/components/ProductTag';
import { supabase } from '@/lib/supabase';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ReelScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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
  const [reelProducts, setReelProducts] = useState<Map<string, ReelProduct[]>>(new Map()); // Map reel_id -> products
  const [videoCurrentTime, setVideoCurrentTime] = useState<Map<string, number>>(new Map()); // Track video time
  const [isVideoPaused, setIsVideoPaused] = useState<Map<string, boolean>>(new Map()); // Track paused state
  
  // Animation for music disc rotation
  const musicDiscRotation = useRef(new Animated.Value(0)).current;
  
  // Animation for like button
  const likeScale = useRef(new Animated.Value(1)).current;
  
  // Animation for action buttons entrance
  const actionButtonsOpacity = useRef(new Animated.Value(0)).current;
  const actionButtonsTranslateY = useRef(new Animated.Value(50)).current;
  
  // Navigate between match and explore screens
  const handleTabChange = (tab: 'match' | 'explore') => {
    setActiveTab(tab);
    if (tab === 'match') {
      router.replace('/(tabs)/discover/match');
    } else {
      router.replace('/(tabs)/discover/reel');
    }
  };

  // Start music disc rotation animation
  useEffect(() => {
    const rotateAnimation = Animated.loop(
      Animated.timing(musicDiscRotation, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
        easing: Easing.linear,
      })
    );
    
    if (currentPlayingReelId) {
      rotateAnimation.start();
    } else {
      rotateAnimation.stop();
      musicDiscRotation.setValue(0);
    }
    
    return () => {
      rotateAnimation.stop();
    };
  }, [currentPlayingReelId]);

  // Animate action buttons entrance
  useEffect(() => {
    Animated.parallel([
      Animated.timing(actionButtonsOpacity, {
        toValue: 1,
        duration: 600,
        delay: 300,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.spring(actionButtonsTranslateY, {
        toValue: 0,
        delay: 300,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }),
    ]).start();
  }, []);

  const spin = musicDiscRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Animate like button
  const animateLike = useCallback(() => {
    Animated.sequence([
      Animated.spring(likeScale, {
        toValue: 1.3,
        useNativeDriver: true,
        tension: 100,
        friction: 3,
      }),
      Animated.spring(likeScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 3,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    loadReels('initial');
    loadLikedReels();
  }, [loadReels]);

  // Load products for reels
  useEffect(() => {
    const loadProducts = async () => {
      const productsMap = new Map<string, ReelProduct[]>();
      for (const reel of reels) {
        try {
          const products = await ProductService.getByReel(reel.id);
          if (products.length > 0) {
            productsMap.set(reel.id, products);
          }
        } catch (error) {
          console.error('Error loading products for reel:', reel.id, error);
        }
      }
      setReelProducts(productsMap);
    };

    if (reels.length > 0) {
      loadProducts();
    }
  }, [reels]);

  // Update active tab based on current pathname
  useEffect(() => {
    if (pathname?.includes('/match')) {
      setActiveTab('match');
    } else if (pathname?.includes('/reel') || pathname?.includes('/explore')) {
      setActiveTab('explore');
    }
  }, [pathname]);

  useEffect(() => {
    // Subscribe to realtime updates for reels
    const reelSubscription = ReelService.subscribeToReels(
      // INSERT - new reel added
      (newReel) => {
        setReels((prev) => [newReel, ...prev]);
      },
      // UPDATE - reel updated
      (updatedReel) => {
        setReels((prev) =>
          prev.map((r) => (r.id === updatedReel.id ? { ...r, ...updatedReel } : r))
        );
      },
      // DELETE - reel deleted
      (deletedReelId) => {
        setReels((prev) => prev.filter((r) => r.id !== deletedReelId));
      }
    );

    // Subscribe to realtime updates for profiles (avatar/name changes)
    const profilesChannel = supabase
      .channel('profiles-realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
        },
        (payload) => {
          const updatedProfile = payload.new as { id: string; full_name: string | null; avatar_url: string | null };
          // Update profiles in reels
          setReels((prev) =>
            prev.map((reel) => {
              if (reel.user_id === updatedProfile.id) {
                return {
                  ...reel,
                  profiles: {
                    id: updatedProfile.id,
                    full_name: updatedProfile.full_name || '',
                    avatar_url: updatedProfile.avatar_url || undefined,
                  },
                };
              }
              return reel;
            })
          );
        }
      )
      .subscribe();

    // Subscribe to realtime updates for reel likes
    const likesInsertChannel = supabase
      .channel('reel-likes-insert')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reel_likes',
        },
        (payload) => {
          const reelId = payload.new?.reel_id;
          if (reelId) {
            setReels((prev) =>
              prev.map((reel) => {
                if (reel.id === reelId) {
                  return { ...reel, like_count: (reel.like_count || 0) + 1 };
                }
                return reel;
              })
            );
            // Update liked reels set
            if (user?.id && payload.new?.user_id === user.id) {
              setLikedReels((prev) => new Set([...prev, reelId]));
            }
          }
        }
      )
      .subscribe();

    const likesDeleteChannel = supabase
      .channel('reel-likes-delete')
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'reel_likes',
        },
        (payload) => {
          const reelId = payload.old?.reel_id;
          if (reelId) {
            setReels((prev) =>
              prev.map((reel) => {
                if (reel.id === reelId) {
                  return { ...reel, like_count: Math.max(0, (reel.like_count || 0) - 1) };
                }
                return reel;
              })
            );
            // Update liked reels set
            if (user?.id && payload.old?.user_id === user.id) {
              setLikedReels((prev) => {
                const newSet = new Set(prev);
                newSet.delete(reelId);
                return newSet;
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      reelSubscription.unsubscribe();
      profilesChannel.unsubscribe();
      likesInsertChannel.unsubscribe();
      likesDeleteChannel.unsubscribe();
    };
  }, [user?.id]);

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

  const loadReels = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      try {
        if (mode === 'initial') {
          setLoading(true);
        } else {
          setRefreshing(true);
        }
        const data = await ReelService.getAll(50);
        setReels(data);
      } catch (error: any) {
        // Silently handle error - user will see empty state
      } finally {
        if (mode === 'initial') {
          setLoading(false);
        } else {
          setRefreshing(false);
        }
      }
    },
    []
  );

  const handleRefresh = () => {
    loadReels('refresh');
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

    // Animate like button
    animateLike();

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
  }, [user?.id, likedReels, animateLike]);

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
        ReelService.incrementView(reel.id).catch(console.error);
        
        // Play video if it's a video reel
        if (reel.media_type === 'video' && reel.video_url) {
          handlePlayVideoInternal(reel.id);
        }
        
        // Play music if reel has music track
        handlePlayMusicInternal(reel);
      } else {
        // Stop video and music when no reel is visible
        handlePauseVideoInternal();
        handleStopMusicInternal();
      }
    } else {
      // No items visible, pause everything
      handlePauseVideoInternal();
      handleStopMusicInternal();
    }
  }, [reels]);

  // Play video for current reel
  const handlePlayVideoInternal = async (reelId: string) => {
    // Pause previous video
    if (currentVideoId && currentVideoId !== reelId) {
      const prevVideo = videoRefs.current.get(currentVideoId);
      if (prevVideo) {
        try {
          await prevVideo.pauseAsync();
          // Reset previous video position to reduce memory usage
          await prevVideo.setPositionAsync(0);
        } catch (error) {
          // Silently handle errors
        }
      }
    }

    // Play current video
    const video = videoRefs.current.get(reelId);
    if (video) {
      try {
        // Reset to start before playing for smooth loop
        await video.setPositionAsync(0);
        await video.playAsync();
        setCurrentVideoId(reelId);
        setIsVideoPaused(prev => {
          const newMap = new Map(prev);
          newMap.set(reelId, false);
          return newMap;
        });
      } catch (error) {
        console.error('Error playing video:', error);
      }
    }
  };

  const handlePlayVideo = handlePlayVideoInternal;

  // Pause current video
  const handlePauseVideoInternal = async () => {
    if (currentVideoId) {
      const video = videoRefs.current.get(currentVideoId);
      if (video) {
        try {
          await video.pauseAsync();
          setIsVideoPaused(prev => {
            const newMap = new Map(prev);
            newMap.set(currentVideoId, true);
            return newMap;
          });
        } catch (error) {
          console.error('Error pausing video:', error);
        }
      }
      setCurrentVideoId(null);
    }
  };

  // Toggle play/pause for current video
  const handleToggleVideoPlayPause = useCallback(async () => {
    if (!currentVideoId) return;
    
    const video = videoRefs.current.get(currentVideoId);
    if (!video) return;

    try {
      const isPaused = isVideoPaused.get(currentVideoId) || false;
      if (isPaused) {
        await video.playAsync();
        setIsVideoPaused(prev => {
          const newMap = new Map(prev);
          newMap.set(currentVideoId, false);
          return newMap;
        });
      } else {
        await video.pauseAsync();
        setIsVideoPaused(prev => {
          const newMap = new Map(prev);
          newMap.set(currentVideoId, true);
          return newMap;
        });
      }
    } catch (error) {
      console.error('Error toggling video play/pause:', error);
    }
  }, [currentVideoId, isVideoPaused]);

  const handlePauseVideo = handlePauseVideoInternal;

  // Stop music
  const handleStopMusicInternal = async () => {
    if (audioSound) {
      try {
        await audioSound.unloadAsync();
        setAudioSound(null);
      } catch (error) {
        console.error('Error stopping music:', error);
      }
    }
    setCurrentPlayingReelId(null);
  };

  const handleStopMusic = handleStopMusicInternal;

  // Play music for current reel
  const handlePlayMusicInternal = async (reel: Reel) => {
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
      
      // Music should play (currently disabled)
    } else {
      handleStopMusic();
    }
  };

  const handlePlayMusic = handlePlayMusicInternal;

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
    const isWide = videoOrientation === 'wide';
    const isSquare = videoOrientation === 'square';
    
    // Only render video if it's the current or adjacent item (performance optimization)
    const shouldRenderVideo = Math.abs(index - currentIndex) <= 1;

    return (
      <TouchableOpacity 
        style={styles.reelContainer}
        activeOpacity={1}
        onPress={handleToggleVideoPlayPause}
      >
        {/* Media - Image or Video */}
        {item.media_type === 'image' ? (
          <Image
            source={{ uri: mediaUrl || '' }}
            style={styles.reelImage}
            resizeMode="cover"
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
              {/* Thumbnail placeholder while video loads */}
              {item.thumbnail_url && (
                <Image
                  source={{ uri: item.thumbnail_url }}
                  style={[
                    StyleSheet.absoluteFill,
                    { opacity: isCurrentVideo ? 0 : 1 },
                    isWide || isSquare
                      ? styles.containVideo
                      : isLandscape
                      ? styles.landscapeVideo
                      : styles.portraitVideo
                  ]}
                  resizeMode={(isWide || isSquare || isLandscape ? 'contain' : 'cover') as any}
                />
              )}
              {/* Loading indicator */}
              {!isCurrentVideo && (
                <View style={[StyleSheet.absoluteFill, styles.videoLoadingContainer]}>
                  <ActivityIndicator size="large" color="rgba(255, 255, 255, 0.5)" />
                </View>
              )}
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
                resizeMode={(isWide || isSquare || isLandscape ? 'contain' : 'cover') as any}
                shouldPlay={isCurrentVideo}
                isLooping={false}
                isMuted={false}
                useNativeControls={false}
                progressUpdateIntervalMillis={250}
                onLoadStart={() => {
                  // Video started loading
                }}
                onLoad={(status) => {
                  // Detect video aspect ratio from dimensions
                  if (status.isLoaded) {
                    // Try to get dimensions from status (may not be available on all platforms)
                    const width = (status as any).naturalSize?.width || 1080;
                    const height = (status as any).naturalSize?.height || 1920;
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
                onReadyForDisplay={() => {
                  // Video is ready, hide thumbnail
                }}
                onPlaybackStatusUpdate={(status) => {
                  // Track current time for product tags
                  if (status.isLoaded && status.positionMillis !== undefined) {
                    setVideoCurrentTime(prev => {
                      const newMap = new Map(prev);
                      newMap.set(item.id, status.positionMillis! / 1000); // Convert to seconds
                      return newMap;
                    });
                  }

                  // Optimized loop handling - seek to start instead of using isLooping
                  // This reduces lag compared to native isLooping
                  if (status.isLoaded && status.didJustFinish && isCurrentVideo) {
                    const video = videoRefs.current.get(item.id);
                    if (video) {
                      // Use requestAnimationFrame for smoother seek
                      requestAnimationFrame(() => {
                        video.setPositionAsync(0).catch(() => {
                          // Silently handle errors to prevent console spam
                        });
                      });
                    }
                  }
                }}
                onError={(error) => {
                  // Silently handle video errors to prevent UI blocking
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
            {/* Product Tags - Above user name */}
            {reelProducts.get(item.id)?.map((reelProduct) => (
              <ProductTag
                key={reelProduct.id}
                reelProduct={reelProduct}
                onPress={(rp) => {
                  // Navigate to product detail
                  if (rp.product?.id) {
                    router.push({
                      pathname: '/products/[id]',
                      params: { id: rp.product.id },
                    } as any);
                  }
                }}
                videoDuration={item.duration || 60}
                currentTime={videoCurrentTime.get(item.id) || 0}
              />
            ))}
            
            {/* User Avatar and Name */}
            <TouchableOpacity 
              style={styles.userInfo}
              onPress={() => {
                if (item.user_id) {
                  router.push({
                    pathname: '/profile/[id]',
                    params: { id: item.user_id },
                  } as any);
                }
              }}
              activeOpacity={0.8}
            >
              {profile?.avatar_url && profile.avatar_url.trim() !== '' ? (
                <Image
                  source={{ uri: profile.avatar_url }}
                  style={styles.userAvatar}
                  onError={(e) => {
                    console.error('Error loading avatar:', profile.avatar_url, e.nativeEvent.error);
                  }}
                />
              ) : (
                <View style={[styles.userAvatar, styles.userAvatarPlaceholder]}>
                  <User size={16} color="#fff" />
                </View>
              )}
              <Text style={styles.username}>
                @{profile?.full_name?.toLowerCase().replace(/\s+/g, '_') || 'user'}
              </Text>
            </TouchableOpacity>
            
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
            
            {/* Music Info - TikTok style with rotating disc */}
            {item.music_tracks && (
              <TouchableOpacity 
                style={styles.musicContainer}
                activeOpacity={0.8}
              >
                <View style={styles.musicIconContainer}>
                  <Music size={14} color="#fff" />
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
            {/* Avatar Button - Click to view profile */}
            {profile?.avatar_url && profile.avatar_url.trim() !== '' ? (
              <TouchableOpacity 
                style={styles.avatarButton}
                onPress={() => {
                  // Navigate to user profile
                  if (item.user_id) {
                    router.push({
                      pathname: '/profile/[id]',
                      params: { id: item.user_id },
                    } as any);
                  }
                }}
                activeOpacity={0.8}
              >
                <Image
                  source={{ uri: profile.avatar_url }}
                  style={styles.actionAvatar}
                />
                <View style={styles.followButton}>
                  <Plus size={14} color="#fff" />
                </View>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={styles.avatarButton}
                onPress={() => {
                  if (item.user_id) {
                    router.push({
                      pathname: '/profile/[id]',
                      params: { id: item.user_id },
                    } as any);
                  }
                }}
                activeOpacity={0.8}
              >
                <View style={styles.actionAvatarPlaceholder}>
                  <User size={24} color="#fff" />
                </View>
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
                  color={isLiked ? '#FF8C42' : '#fff'}
                  fill={isLiked ? '#FF8C42' : 'transparent'}
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

            <TouchableOpacity 
              style={styles.actionButton} 
              activeOpacity={0.7}
              onPress={() => {
                Alert.alert('Chia sẻ', 'Tính năng chia sẻ đang được phát triển');
              }}
            >
              <View style={styles.actionIconContainer}>
                <Share2 size={28} color="#fff" strokeWidth={2.5} />
              </View>
            </TouchableOpacity>

            {/* Music Disc - Rotating animation like TikTok */}
            {item.music_tracks && (
              <TouchableOpacity 
                style={styles.musicDiscButton}
                activeOpacity={0.8}
              >
                <Animated.View 
                  style={[
                    styles.musicDiscContainer,
                    { transform: [{ rotate: isPlayingMusic ? spin : '0deg' }] }
                  ]}
                >
                  <LinearGradient
                    colors={['#FF8C42', '#FFB366', '#FF8C42']}
                    style={styles.musicDisc}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View style={styles.musicDiscInner}>
                      <Music size={16} color="#fff" />
                    </View>
                  </LinearGradient>
                </Animated.View>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [likedReels, currentPlayingReelId, currentVideoId, videoOrientations, expandedCaptions, handleLike, handleComment, handlePlayVideo, reelProducts, videoCurrentTime, handleToggleVideoPlayPause, router]);

  // Skeleton loader component
  const renderSkeletonReel = useCallback(() => (
    <View style={styles.reelContainer}>
      <View style={styles.skeletonMedia}>
        <ActivityIndicator size="large" color="rgba(255, 255, 255, 0.3)" />
      </View>
      <View style={styles.overlay}>
        <View style={styles.infoContainer}>
          <View style={styles.skeletonUserInfo}>
            <View style={styles.skeletonAvatar} />
            <View style={styles.skeletonUsername} />
          </View>
          <View style={styles.skeletonCaption} />
          <View style={[styles.skeletonCaption, { width: '60%', marginTop: 8 }]} />
        </View>
        <View style={styles.actionsContainer}>
          <View style={styles.skeletonActionButton} />
          <View style={styles.skeletonActionButton} />
          <View style={styles.skeletonActionButton} />
        </View>
      </View>
    </View>
  ), []);

  if (loading) {
    return (
      <View style={styles.container}>
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
          data={[1, 2, 3]} // Show 3 skeleton items
          renderItem={renderSkeletonReel}
          keyExtractor={(_, index) => `skeleton-${index}`}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={SCREEN_HEIGHT}
          decelerationRate="fast"
          onViewableItemsChanged={() => {}} // Empty handler to prevent nullability error
          viewabilityConfig={{
            itemVisiblePercentThreshold: 50,
            minimumViewTime: 100,
          }}
          getItemLayout={(data, index) => ({
            length: SCREEN_HEIGHT,
            offset: SCREEN_HEIGHT * index,
            index,
          })}
        />
      </View>
    );
  }

  if (reels.length === 0) {
    return (
      <View style={styles.container}>
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
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Video size={64} color="rgba(255, 255, 255, 0.3)" />
          </View>
          <Text style={styles.emptyTitle}>Chưa có reels</Text>
          <Text style={styles.emptySubtitle}>
            Chưa có reels nào được duyệt.{'\n'}Hãy tạo reel đầu tiên của bạn!
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => router.push('/reel/create-reel')}
            activeOpacity={0.8}
          >
            <View style={{ marginRight: 8 }}>
              <Plus size={20} color="#fff" />
            </View>
            <Text style={styles.emptyButtonText}>Tạo Reel</Text>
          </TouchableOpacity>
        </View>
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
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
        removeClippedSubviews={Platform.OS === 'android'}
        windowSize={2}
        maxToRenderPerBatch={1}
        updateCellsBatchingPeriod={50}
        initialNumToRender={1}
        maintainVisibleContentPosition={null}
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          // Could preload more reels here if needed
        }}
        // Performance optimizations
        disableIntervalMomentum={true}
        scrollEventThrottle={16}
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
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    paddingHorizontal: 20,
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
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.75)',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    letterSpacing: 0.3,
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 17,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
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
    paddingBottom: Platform.OS === 'ios' ? 130 : 110, // Đẩy lên cao để không bị che bởi bottom tab bar
    maxWidth: SCREEN_WIDTH - 100, // Leave space for action buttons
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  userAvatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  username: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    letterSpacing: 0.3,
  },
  caption: {
    fontSize: 15,
    color: '#fff',
    lineHeight: 22,
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    paddingRight: 8,
    fontWeight: '500',
  },
  readMoreText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    opacity: 0.9,
  },
  musicContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    maxWidth: '85%',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  musicIconContainer: {
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
    width: 20,
    height: 20,
  },
  musicTextContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  musicText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    letterSpacing: 0.2,
  },
  musicDiscButton: {
    marginTop: 8,
  },
  musicDiscContainer: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  musicDisc: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 5,
  },
  musicDiscInner: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionsContainer: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 20,
    paddingBottom: Platform.OS === 'ios' ? 130 : 110, // Đẩy lên cao để không bị che bởi bottom tab bar
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
    backgroundColor: '#000',
  },
  actionAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  followButton: {
    position: 'absolute',
    bottom: -6,
    left: '50%',
    marginLeft: -10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
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
    backgroundColor: 'rgba(255, 140, 66, 0.2)', // #FF8C42 với opacity
    borderColor: 'rgba(255, 140, 66, 0.4)',
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
  skeletonMedia: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  skeletonUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  skeletonAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  skeletonUsername: {
    width: 120,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  skeletonCaption: {
    width: '80%',
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 8,
  },
  skeletonActionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 20,
  },
  videoLoadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: Platform.OS === 'ios' ? 100 : 80,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 14,
    backgroundColor: colors.primary,
    borderRadius: 24,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
