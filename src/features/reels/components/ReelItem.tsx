import React, { memo } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Heart, MessageCircle, Share2, Music, Plus, User } from 'lucide-react-native';
import { Video as ExpoVideo } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { Reel } from '../services/reel.service';
import { colors } from '@/src/theme/colors';

interface ReelItemProps {
  item: Reel;
  index: number;
  isLiked: boolean;
  isCurrentVideo: boolean;
  isPlayingMusic: boolean;
  currentIndex: number;
  videoOrientation: 'landscape' | 'portrait' | 'square' | 'wide';
  expandedCaptions: Set<string>;
  spin: Animated.AnimatedInterpolation<string | number>;
  onLike: (reelId: string) => void;
  onComment: (reelId: string) => void;
  onUserPress: (userId: string) => void;
  onToggleCaption: (reelId: string) => void;
  videoRef: (ref: ExpoVideo | null, id: string) => void;
  SCREEN_WIDTH: number;
  SCREEN_HEIGHT: number;
}

/**
 * Memoized Reel Item Component
 * Only re-renders when props actually change
 */
export const ReelItem = memo<ReelItemProps>(
  ({
    item,
    index,
    isLiked,
    isCurrentVideo,
    isPlayingMusic,
    currentIndex,
    videoOrientation,
    expandedCaptions,
    spin,
    onLike,
    onComment,
    onUserPress,
    onToggleCaption,
    videoRef,
    SCREEN_WIDTH,
    SCREEN_HEIGHT,
  }) => {
    const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
    const shouldRenderVideo = Math.abs(index - currentIndex) <= 1;
    const isExpanded = expandedCaptions.has(item.id);
    const shouldShowReadMore = (item.caption?.length || 0) > 100;

    return (
      <View style={[styles.reelContainer, { width: SCREEN_WIDTH, height: SCREEN_HEIGHT }]}>
        {/* Media */}
        {item.media_type === 'image' ? (
          <Image
            source={{ uri: item.image_url || item.thumbnail_url || '' }}
            style={styles.reelImage}
            resizeMode="cover"
          />
        ) : shouldRenderVideo && item.video_url ? (
          <ExpoVideo
            ref={(ref) => videoRef(ref, item.id)}
            source={{ uri: item.video_url }}
            style={styles.video}
            resizeMode={'cover' as any}
            shouldPlay={isCurrentVideo}
            isLooping={false}
            isMuted={false}
            useNativeControls={false}
          />
        ) : (
          <Image
            source={{ uri: item.thumbnail_url || '' }}
            style={styles.reelImage}
            resizeMode="cover"
          />
        )}

        {/* Overlay */}
        <View style={styles.overlay}>
          {/* User Info */}
          <View style={styles.infoContainer}>
            <TouchableOpacity
              style={styles.userInfo}
              onPress={() => onUserPress(item.user_id)}
              activeOpacity={0.8}
            >
              {profile?.avatar_url && (
                <Image source={{ uri: profile.avatar_url }} style={styles.userAvatar} />
              )}
              <Text style={styles.username}>
                @{profile?.full_name?.toLowerCase().replace(/\s+/g, '_') || 'user'}
              </Text>
            </TouchableOpacity>

            {/* Caption */}
            {item.caption && (
              <View>
                <Text style={styles.caption} numberOfLines={isExpanded ? undefined : 2}>
                  {item.caption}
                </Text>
                {shouldShowReadMore && (
                  <TouchableOpacity onPress={() => onToggleCaption(item.id)} activeOpacity={0.7}>
                    <Text style={styles.readMoreText}>{isExpanded ? 'Thu gọn' : 'Xem thêm'}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Music */}
            {item.music_tracks && (
              <View style={styles.musicContainer}>
                <Music size={14} color="#fff" />
                <Text style={styles.musicText} numberOfLines={1}>
                  {item.music_tracks.title} · {item.music_tracks.artist}
                </Text>
              </View>
            )}
          </View>

          {/* Actions */}
          <View style={styles.actionsContainer}>
            {/* Avatar */}
            {profile?.avatar_url ? (
              <TouchableOpacity onPress={() => onUserPress(item.user_id)} activeOpacity={0.8}>
                <Image source={{ uri: profile.avatar_url }} style={styles.actionAvatar} />
                <View style={styles.followButton}>
                  <Plus size={14} color="#fff" />
                </View>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => onUserPress(item.user_id)} activeOpacity={0.8}>
                <View style={styles.actionAvatarPlaceholder}>
                  <User size={24} color="#fff" />
                </View>
                <View style={styles.followButton}>
                  <Plus size={14} color="#fff" />
                </View>
              </TouchableOpacity>
            )}

            {/* Like */}
            <TouchableOpacity style={styles.actionButton} onPress={() => onLike(item.id)} activeOpacity={0.7}>
              <View style={[styles.actionIconContainer, isLiked && styles.actionIconContainerLiked]}>
                <Heart
                  size={28}
                  color={isLiked ? colors.primary : '#fff'}
                  fill={isLiked ? colors.primary : 'transparent'}
                  strokeWidth={2.5}
                />
              </View>
              <Text style={styles.actionText}>{item.like_count}</Text>
            </TouchableOpacity>

            {/* Comment */}
            <TouchableOpacity style={styles.actionButton} onPress={() => onComment(item.id)} activeOpacity={0.7}>
              <View style={styles.actionIconContainer}>
                <MessageCircle size={28} color="#fff" strokeWidth={2.5} />
              </View>
              <Text style={styles.actionText}>{item.comment_count}</Text>
            </TouchableOpacity>

            {/* Share */}
            <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
              <View style={styles.actionIconContainer}>
                <Share2 size={28} color="#fff" strokeWidth={2.5} />
              </View>
            </TouchableOpacity>

            {/* Music Disc */}
            {item.music_tracks && (
              <Animated.View style={[styles.musicDiscContainer, { transform: [{ rotate: isPlayingMusic ? spin : '0deg' }] }]}>
                <LinearGradient colors={['#FF6B6B', '#FF8A8A', '#FF6B6B']} style={styles.musicDisc}>
                  <View style={styles.musicDiscInner}>
                    <Music size={16} color="#fff" />
                  </View>
                </LinearGradient>
              </Animated.View>
            )}
          </View>
        </View>
      </View>
    );
  },
  // Custom comparison function for better performance
  (prevProps, nextProps) => {
    return (
      prevProps.item.id === nextProps.item.id &&
      prevProps.isLiked === nextProps.isLiked &&
      prevProps.isCurrentVideo === nextProps.isCurrentVideo &&
      prevProps.isPlayingMusic === nextProps.isPlayingMusic &&
      prevProps.currentIndex === nextProps.currentIndex &&
      prevProps.expandedCaptions === nextProps.expandedCaptions
    );
  }
);

ReelItem.displayName = 'ReelItem';

const styles = StyleSheet.create({
  reelContainer: {
    position: 'relative',
    backgroundColor: '#000',
  },
  reelImage: {
    width: '100%',
    height: '100%',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 130,
    paddingHorizontal: 16,
    paddingTop: 100,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    maxWidth: '75%',
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
  },
  username: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  caption: {
    fontSize: 15,
    color: '#fff',
    lineHeight: 22,
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  readMoreText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '700',
    marginTop: 4,
  },
  musicContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    maxWidth: '85%',
    marginTop: 8,
    gap: 8,
  },
  musicText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
    flex: 1,
  },
  actionsContainer: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 20,
  },
  actionAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#fff',
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
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    borderColor: 'rgba(255, 107, 107, 0.4)',
  },
  actionText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  musicDiscContainer: {
    width: 48,
    height: 48,
    marginTop: 8,
  },
  musicDisc: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  musicDiscInner: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
