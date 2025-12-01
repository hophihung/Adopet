import React, { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  FlatList,
  Dimensions,
  Platform,
  InteractionManager,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  MoreVertical,
  UserPlus,
  MessageCircle,
  Share2,
  Heart,
  Play,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { ReelService } from '@/src/features/reels/services/reel.service';
import { ProfileService } from '@/src/features/posts/services/Profile.service';
import { LazyImage } from '@/src/components/LazyImage';
import { supabase } from '@/lib/supabase';
import { colors } from '@/src/theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_ITEM_SIZE = (SCREEN_WIDTH - 2) / 3; // 3 columns with 1px gaps

// Video Thumbnail Component - DO NOT load full video for thumbnails (saves bandwidth)
// Instead, show placeholder to prevent loading 50-300MB video files just for thumbnail
const VideoThumbnail = memo(({ videoUrl, style }: { videoUrl: string; style: any }) => {
  // CRITICAL: Never load full video for thumbnails - this causes massive egress usage
  // Each video can be 50-300MB, loading them for thumbnails wastes bandwidth
  // Always use placeholder or require thumbnail_url to be set
  return (
    <View style={[style, styles.thumbnailPlaceholder]}>
      <Play size={32} color="#999" />
    </View>
  );
});

// Helper function to get thumbnail URL from video
const getThumbnailUrl = (reel: any): string | null => {
  // If thumbnail_url exists and is valid, use it
  if (reel.thumbnail_url && reel.thumbnail_url.trim() !== '') {
    const url = reel.thumbnail_url.trim();
    // Check if it's a valid image URL (not video)
    if (url.match(/\.(jpg|jpeg|png|gif|webp|bmp)(\?.*)?$/i) || url.includes('thumbnail')) {
      return url;
    }
  }
  
  // If image_url exists and is valid, use it
  if (reel.image_url && reel.image_url.trim() !== '') {
    const url = reel.image_url.trim();
    // Check if it's a valid image URL (not video)
    if (url.match(/\.(jpg|jpeg|png|gif|webp|bmp)(\?.*)?$/i) || url.includes('image')) {
      return url;
    }
  }
  
  return null;
};

// Check if URL is a video URL
const isVideoUrl = (url: string): boolean => {
  if (!url) return false;
  return url.match(/\.(mp4|mov|avi|mkv|webm|m3u8)(\?.*)?$/i) !== null || 
         url.includes('video') || 
         url.includes('reels');
};

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'user' | 'seller';
  created_at: string;
}

interface ReelStats {
  following: number;
  followers: number;
  likes: number;
}

type TabType = 'videos' | 'liked';
type SortType = 'latest' | 'popular' | 'oldest';

export default function ReelProfileScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [reels, setReels] = useState<any[]>([]);
  const [likedReels, setLikedReels] = useState<any[]>([]);
  const [stats, setStats] = useState<ReelStats>({ following: 0, followers: 0, likes: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('videos');
  const [sortType, setSortType] = useState<SortType>('latest');
  const [isFollowing, setIsFollowing] = useState(false);
  const [loadingLiked, setLoadingLiked] = useState(false);
  const [hasTriedLoad, setHasTriedLoad] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Get id from params - handle both string and array
  const id = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : undefined;

  useEffect(() => {
    if (id) {
      loadProfile();
    } else {
      // If no id, show loading until id is available
      setLoading(true);
    }
  }, [id]);

  useEffect(() => {
    if (activeTab === 'liked' && id && user?.id === id) {
      loadLikedReels();
    }
  }, [activeTab, id, user?.id]);

  // Realtime subscriptions for reels
  useEffect(() => {
    if (!id) return;

    const reelsChannel = supabase
      .channel(`profile-reels-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reels',
          filter: `user_id=eq.${id}`,
        },
        (payload) => {
          const newReel = payload.new as any;
          if (newReel.status === 'approved') {
            setReels((prev) => [newReel, ...prev]);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'reels',
          filter: `user_id=eq.${id}`,
        },
        (payload) => {
          const updatedReel = payload.new as any;
          setReels((prev) =>
            prev.map((r) => (r.id === updatedReel.id ? { ...r, ...updatedReel } : r))
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'reels',
          filter: `user_id=eq.${id}`,
        },
        (payload) => {
          const deletedReelId = payload.old.id as string;
          setReels((prev) => prev.filter((r) => r.id !== deletedReelId));
        }
      )
      .subscribe();

    // Realtime subscription for profile updates (avatar/name)
    const profileChannel = supabase
      .channel(`profile-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${id}`,
        },
        (payload) => {
          const updatedProfile = payload.new as any;
          setProfile((prev) => (prev ? { ...prev, ...updatedProfile } : null));
        }
      )
      .subscribe();

    return () => {
      reelsChannel.unsubscribe();
      profileChannel.unsubscribe();
    };
  }, [id]);

  const loadProfile = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setLoadError(null);
      setHasTriedLoad(true);
      
      // Use InteractionManager to defer heavy operations
      await InteractionManager.runAfterInteractions(async () => {
        const [profileData, reelsData] = await Promise.all([
          ProfileService.getProfile(id),
          ReelService.getByUserId(id),
        ]);

        if (!profileData) {
          setLoadError('Không tìm thấy profile');
          setLoading(false);
          return;
        }

        setProfile(profileData);
        setReels(reelsData || []);

        // Calculate stats (defer heavy calculation)
        requestAnimationFrame(() => {
          const totalLikes = reelsData?.reduce((sum, reel) => sum + (reel.like_count || 0), 0) || 0;
          
          // Get followers/following count (simplified - you may need to create a followers table)
          supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('id', id)
            .then(({ count: followersCount }) => {
              setStats({
                following: 0, // You'll need to implement this
                followers: followersCount || 0,
                likes: totalLikes,
              });
            });

          // Check if current user is following this profile
          if (user?.id && user.id !== id) {
            // Check follow status (simplified - implement with actual follow table)
            setIsFollowing(false);
          }
        });
        
        setLoading(false);
      });
    } catch (error: any) {
      console.error('Error loading profile:', error);
      setLoadError(error?.message || 'Có lỗi xảy ra khi tải profile');
      setLoading(false);
    }
  };

  const loadLikedReels = async () => {
    if (!id || !user?.id || id !== user.id) return;

    try {
      setLoadingLiked(true);
      const liked = await ReelService.getLikedReels(id);
      setLikedReels(liked || []);
    } catch (error) {
      console.error('Error loading liked reels:', error);
    } finally {
      setLoadingLiked(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfile();
    if (activeTab === 'liked' && user?.id === id) {
      await loadLikedReels();
    }
    setRefreshing(false);
  };

  const handleFollow = async () => {
    // Implement follow/unfollow logic
    setIsFollowing(!isFollowing);
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Memoize sorted reels to avoid recalculation on every render
  const sortedReels = useMemo(() => {
    let sorted = [...reels];
    
    switch (sortType) {
      case 'latest':
        sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'oldest':
        sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'popular':
        sorted.sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
        break;
    }
    
    return sorted;
  }, [reels, sortType]);

  // Memoized thumbnail renderer for performance
  const renderReelThumbnail = useCallback(({ item, index }: { item: any; index: number }) => {
    const thumbnailUrl = getThumbnailUrl(item);
    const hasVideoUrl = item.video_url && item.video_url.trim() !== '';
    const isVideo = item.media_type === 'video' || hasVideoUrl;
    const videoUrl = hasVideoUrl ? item.video_url.trim() : null;
    
    return (
      <TouchableOpacity
        style={styles.gridItem}
        onPress={() => router.push(`/(tabs)/discover/reel`)}
        activeOpacity={0.8}
      >
        {thumbnailUrl ? (
          <LazyImage
            source={{ uri: thumbnailUrl }}
            style={styles.thumbnail}
            resizeMode="cover"
            priority="normal"
            cache="force-cache"
            onError={() => {
              // Silently handle error - will show placeholder
            }}
          />
        ) : (
          // Never load full video for thumbnails - saves massive bandwidth
          // Each video can be 50-300MB, loading them for thumbnails wastes egress
          // Always require thumbnail_url to be set when uploading reels
          <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
            <Play size={32} color="#999" />
          </View>
        )}
        <View style={styles.thumbnailOverlay}>
          {isVideo && (
            <View style={styles.playIconContainer}>
              <Play size={16} color="#FFF" fill="#FFF" />
            </View>
          )}
          <Text style={styles.viewCount}>
            {formatNumber(item.view_count || 0)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }, [router, formatNumber]);

  // All hooks must be called before any early returns
  const isOwnProfile = user?.id === id;

  // Memoize computed values (must be before early returns)
  const headerUsername = useMemo(() => {
    return profile?.full_name?.toLowerCase().replace(/\s+/g, '_') || 'user';
  }, [profile?.full_name]);

  const usernameSecondary = useMemo(() => {
    return profile?.full_name?.toLowerCase().replace(/\s+/g, '') || '';
  }, [profile?.full_name]);

  // Show loading if id is not available yet or still loading
  if (!id || loading || !hasTriedLoad) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show error only after loading is complete, has tried to load, and no profile found
  if (!loading && hasTriedLoad && !profile && loadError) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>{loadError}</Text>
          <TouchableOpacity 
            onPress={() => {
              // Retry loading
              setHasTriedLoad(false);
              setLoadError(null);
              loadProfile();
            }} 
            style={styles.retryButton}
          >
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Quay lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // If no error but no profile, still show loading (might be a race condition)
  if (!profile && !loadError) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        scrollEventThrottle={16}
        decelerationRate="fast"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerUsername}>
            @{headerUsername}
          </Text>
          <TouchableOpacity style={styles.moreButton}>
            <MoreVertical size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Profile Section */}
        <View style={styles.profileSection}>
          {/* Profile Picture */}
          <View style={styles.avatarContainer}>
            <Image
              source={{
                uri: profile.avatar_url || 'https://via.placeholder.com/100',
              }}
              style={styles.avatar}
              resizeMode="cover"
              defaultSource={require('@/assets/images/icon.png')}
              cache="force-cache"
            />
          </View>

          {/* Username */}
          <Text style={styles.username}>{profile.full_name || 'User'}</Text>
          {profile.full_name && usernameSecondary && (
            <Text style={styles.usernameSecondary}>
              {usernameSecondary}
            </Text>
          )}

          {/* Action Buttons */}
          {!isOwnProfile && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.followButton, isFollowing && styles.followingButton]}
                onPress={handleFollow}
              >
                <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
                  {isFollowing ? 'Following' : 'Follow'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.messageButton}>
                <MessageCircle size={20} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.addButton}>
                <UserPlus size={20} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.shareButton}>
                <Share2 size={20} color="#FFF" />
              </TouchableOpacity>
              <MoreOptionsMenu
                targetType="user"
                targetId={id || ''}
                targetName={profile?.full_name || 'Người dùng'}
                showReport={!isOwnProfile}
              />
            </View>
          )}

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{formatNumber(stats.following)}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{formatNumber(stats.followers)}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{formatNumber(stats.likes)}</Text>
              <Text style={styles.statLabel}>Likes</Text>
            </View>
          </View>

          {/* Bio */}
          <View style={styles.bioContainer}>
            <Text style={styles.bioText}>
              {profile.full_name || 'No bio available'}
            </Text>
          </View>
        </View>

        {/* Navigation Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'videos' && styles.activeTab]}
            onPress={() => setActiveTab('videos')}
          >
            <Text style={[styles.tabText, activeTab === 'videos' && styles.activeTabText]}>
              Videos
            </Text>
            {activeTab === 'videos' && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
          {isOwnProfile && (
            <TouchableOpacity
              style={[styles.tab, activeTab === 'liked' && styles.activeTab]}
              onPress={() => setActiveTab('liked')}
            >
              <Text style={[styles.tabText, activeTab === 'liked' && styles.activeTabText]}>
                Liked
              </Text>
              {activeTab === 'liked' && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
          )}
        </View>

        {/* Sort Options */}
        {activeTab === 'videos' && sortedReels.length > 0 && (
          <View style={styles.sortContainer}>
            <TouchableOpacity
              style={[styles.sortButton, sortType === 'latest' && styles.activeSortButton]}
              onPress={() => setSortType('latest')}
            >
              <Text style={[styles.sortText, sortType === 'latest' && styles.activeSortText]}>
                Latest
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sortButton, sortType === 'popular' && styles.activeSortButton]}
              onPress={() => setSortType('popular')}
            >
              <Text style={[styles.sortText, sortType === 'popular' && styles.activeSortText]}>
                Popular
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sortButton, sortType === 'oldest' && styles.activeSortButton]}
              onPress={() => setSortType('oldest')}
            >
              <Text style={[styles.sortText, sortType === 'oldest' && styles.activeSortText]}>
                Oldest
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Video Grid */}
        {activeTab === 'videos' && (
          <View style={styles.gridContainer}>
            <FlatList
              data={sortedReels}
              renderItem={renderReelThumbnail}
              numColumns={3}
              scrollEnabled={false}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.gridContent}
              removeClippedSubviews={true}
              windowSize={5}
              maxToRenderPerBatch={6}
              updateCellsBatchingPeriod={50}
              initialNumToRender={6}
              getItemLayout={(data, index) => ({
                length: GRID_ITEM_SIZE * 1.5,
                offset: (GRID_ITEM_SIZE * 1.5) * Math.floor(index / 3),
                index,
              })}
            />
          </View>
        )}

        {/* Liked Tab */}
        {activeTab === 'liked' && (
          <>
            {loadingLiked ? (
              <View style={styles.emptyContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : likedReels.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No liked videos yet</Text>
              </View>
            ) : (
              <View style={styles.gridContainer}>
                <FlatList
                  data={likedReels}
                  renderItem={renderReelThumbnail}
                  numColumns={3}
                  scrollEnabled={false}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.gridContent}
                  removeClippedSubviews={true}
                  windowSize={5}
                  maxToRenderPerBatch={6}
                  updateCellsBatchingPeriod={50}
                  initialNumToRender={6}
                  getItemLayout={(data, index) => ({
                    length: GRID_ITEM_SIZE * 1.5,
                    offset: (GRID_ITEM_SIZE * 1.5) * Math.floor(index / 3),
                    index,
                  })}
                />
              </View>
            )}
          </>
        )}

        {/* Bottom Padding */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
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
  },
  loadingText: {
    color: '#FFF',
    fontSize: 14,
    marginTop: 12,
    opacity: 0.7,
  },
  errorText: {
    color: '#FFF',
    fontSize: 16,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: colors.primary,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#000',
  },
  headerUsername: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  moreButton: {
    padding: 8,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  avatarContainer: {
    marginBottom: 12,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#333',
  },
  username: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  usernameSecondary: {
    color: '#999',
    fontSize: 16,
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
    width: '100%',
    paddingHorizontal: 16,
  },
  followButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  followingButton: {
    backgroundColor: '#333',
  },
  followButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  followingButtonText: {
    color: '#FFF',
  },
  messageButton: {
    width: 40,
    height: 40,
    backgroundColor: '#333',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    backgroundColor: '#333',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareButton: {
    width: 40,
    height: 40,
    backgroundColor: '#333',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreButtonSmall: {
    width: 40,
    height: 40,
    backgroundColor: '#333',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    color: '#999',
    fontSize: 14,
  },
  bioContainer: {
    width: '100%',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  bioText: {
    color: '#FFF',
    fontSize: 14,
    textAlign: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    position: 'relative',
  },
  activeTab: {},
  tabText: {
    color: '#999',
    fontSize: 16,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#FFF',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#FFF',
  },
  sortContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  sortButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#333',
  },
  activeSortButton: {
    backgroundColor: colors.primary,
  },
  sortText: {
    color: '#999',
    fontSize: 14,
    fontWeight: '600',
  },
  activeSortText: {
    color: '#FFF',
  },
  gridContainer: {
    width: '100%',
  },
  gridContent: {
    padding: 0,
  },
  gridItem: {
    width: GRID_ITEM_SIZE,
    height: GRID_ITEM_SIZE * 1.5,
    margin: 0.5,
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: '#333',
  },
  thumbnailOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  playIconContainer: {
    marginRight: 6,
  },
  viewCount: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#999',
    fontSize: 16,
  },
});

