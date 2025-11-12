import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  Dimensions,
  ActivityIndicator,
  Animated,
  Alert,
  Share,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pet } from '@/lib/supabaseClient';
import { colors } from '@/src/theme/colors';
import { PetService } from '@/src/features/pets/services/pet.service';
import { supabase } from '@/lib/supabase';

interface PetCardNewProps {
  pet: Pet & {
    profiles?: {
      id: string;
      full_name: string;
      avatar_url: string;
      reputation_points?: number;
    };
  };
  onPress?: (pet: Pet) => void;
  onLike?: (petId: string) => void;
  onFavorite?: (petId: string) => void;
  onShare?: (pet: Pet) => void;
  onBack?: () => void;
  onClose?: () => void;
  isLiked?: boolean;
  isFavorited?: boolean;
  showActions?: boolean;
  nextPetImage?: string; // For preloading next card's image
}

// ============================================================================
// DESIGN TOKENS
// ============================================================================

/**
 * Spacing scale following 4px base unit
 * Used for consistent spacing throughout the component
 */
const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

/**
 * Typography scale with font sizes and weights
 * Responsive sizing applied based on screen width
 */
const typography = {
  petName: {
    fontSize: 28,
    fontWeight: '800' as const,
    letterSpacing: 0.5,
  },
  petAge: {
    fontSize: 24,
    fontWeight: '700' as const,
  },
  locationText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  distanceText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '500' as const,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
} as const;

/**
 * Shadow presets for consistent elevation
 */
const shadows = {
  card: {
    // iOS shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    // Android shadow
    elevation: 8,
  },
  button: {
    // iOS shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    // Android shadow
    elevation: 4,
  },
} as const;

/**
 * Component-specific design tokens
 */
const designTokens = {
  // Card dimensions
  cardMargin: 32, // Total horizontal margin (16px each side)
  cardAspectRatio: 1.45, // Taller aspect ratio (height = width * 1.45)
  cardBorderRadius: 20,
  
  // Gradient overlay
  gradientColors: ['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.8)'] as const,
  gradientLocations: [0, 0.5, 1] as const,
  gradientHeight: '40%', // Bottom 40% of card
  
  // Status indicator
  statusDotSize: 8,
  statusDotColor: '#10B981', // Green
  
  // Verification badge
  verificationBadgeSize: 20,
  verificationBadgeColor: '#3B82F6', // Blue
  
  // Icons
  locationIconSize: 16,
  errorIconSize: 48,
  
  // Action buttons
  buttonSizeRegular: 60,
  buttonSizeClose: 56,
  buttonIconRegular: 24,
  buttonIconHeart: 28,
  buttonBackgroundColor: 'rgba(255, 255, 255, 0.95)',
  buttonIconColor: '#1F2937', // Dark gray
  buttonMinTouchTarget: 44, // Accessibility minimum
  
  // Responsive breakpoints
  smallScreenWidth: 375,
  fontScaleFactor: 0.9, // Scale factor for small screens
  
  // Text shadows for readability on images
  textShadow: {
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  textShadowLight: {
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  
  // Loading/Error states
  placeholderBackground: '#F5F7FA',
  errorTextColor: '#4B5563', // Darker gray for WCAG AA compliance
  errorIconColor: '#9CA3AF',
  
  // Opacity values
  iconOpacity: 0.9,
  distanceTextOpacity: 0.8,
} as const;

// ============================================================================
// RESPONSIVE UTILITIES
// ============================================================================

/**
 * Calculate responsive dimensions based on screen width
 */
const getResponsiveDimensions = () => {
  const screenWidth = Dimensions.get('window').width;
  const cardWidth = screenWidth - designTokens.cardMargin;
  const cardHeight = cardWidth * designTokens.cardAspectRatio;
  
  return {
    screenWidth,
    cardWidth,
    cardHeight,
  };
};

/**
 * Font scaling function for screens smaller than 375px
 * Ensures text remains readable on small devices
 */
const scaleFontSize = (size: number, screenWidth: number): number => {
  if (screenWidth < designTokens.smallScreenWidth) {
    return Math.round(size * designTokens.fontScaleFactor);
  }
  return size;
};

/**
 * Button sizing for small screens
 * Ensures touch targets remain accessible
 */
const getButtonSize = (screenWidth: number) => {
  if (screenWidth < designTokens.smallScreenWidth) {
    return {
      regular: 56,
      close: 52,
      iconRegular: 22,
      iconHeart: 26,
    };
  }
  return {
    regular: designTokens.buttonSizeRegular,
    close: designTokens.buttonSizeClose,
    iconRegular: designTokens.buttonIconRegular,
    iconHeart: designTokens.buttonIconHeart,
  };
};

/**
 * PetCardNew Component - Optimized with React.memo and useCallback
 * 
 * Performance optimizations:
 * - Wrapped with React.memo to prevent unnecessary re-renders
 * - All event handlers use useCallback for stable references
 * - Image preloading for next card in list
 * - Memoized calculations for responsive dimensions
 */
const PetCardNewComponent = ({
  pet,
  onPress,
  onLike,
  onFavorite,
  onShare,
  onBack,
  onClose,
  isLiked = false,
  isFavorited = false,
  showActions = true,
  nextPetImage,
}: PetCardNewProps) => {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [liked, setLiked] = useState(isLiked);
  const [favorited, setFavorited] = useState(isFavorited);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Navigation
  const router = useRouter();

  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Calculate responsive dimensions
  const dimensions = useMemo(() => getResponsiveDimensions(), []);
  const { screenWidth, cardWidth, cardHeight } = dimensions;
  
  // Calculate responsive font sizes
  const responsiveFontSizes = useMemo(() => ({
    petName: scaleFontSize(28, screenWidth),
    petAge: scaleFontSize(24, screenWidth),
    locationText: scaleFontSize(15, screenWidth),
    distanceText: scaleFontSize(14, screenWidth),
    statusText: scaleFontSize(13, screenWidth),
  }), [screenWidth]);
  
  // Calculate responsive button sizes
  const buttonSizes = useMemo(() => getButtonSize(screenWidth), [screenWidth]);

  // Get primary image or use placeholder
  const petImage = useMemo(() => 
    pet.images && pet.images.length > 0 ? pet.images[0] : null,
    [pet.images]
  );

  // Preload next card's image for better performance
  useEffect(() => {
    if (nextPetImage) {
      // Preload the next image in the background
      Image.prefetch(nextPetImage).catch((error) => {
        console.warn('Failed to preload next pet image:', error);
      });
    }
  }, [nextPetImage]);

  // Memoized event handlers using useCallback
  const handleCardPress = useCallback(() => {
    if (onPress) {
      onPress(pet);
    } else {
      // Default navigation to pet detail screen
      router.push(`/pet/${pet.id}`);
    }
  }, [onPress, pet, router]);
  
  const handleBackPress = useCallback(() => {
    if (onBack) {
      onBack();
    } else {
      // Default back navigation
      router.back();
    }
  }, [onBack, router]);
  
  const handleLikePress = useCallback(async () => {
    if (isProcessing) return;
    
    if (onLike) {
      onLike(pet.id);
      return;
    }
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert('Lỗi', 'Vui lòng đăng nhập để thích pet này');
      return;
    }
    
    // Optimistic UI update
    const previousLiked = liked;
    setLiked(!liked);
    setIsProcessing(true);
    
    try {
      await PetService.toggleLike(pet.id, user.id);
      // Success - no need to show alert for successful like/unlike
    } catch (error) {
      // Revert optimistic update on error
      setLiked(previousLiked);
      console.error('Error toggling like:', error);
      Alert.alert('Lỗi', 'Không thể thích pet này. Vui lòng thử lại.');
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, onLike, pet.id, liked]);
  
  const handleFavoritePress = useCallback(async () => {
    if (isProcessing) return;
    
    if (onFavorite) {
      onFavorite(pet.id);
      return;
    }
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert('Lỗi', 'Vui lòng đăng nhập để lưu pet này');
      return;
    }
    
    // Optimistic UI update
    const previousFavorited = favorited;
    setFavorited(!favorited);
    setIsProcessing(true);
    
    try {
      // Note: Since there's no toggleFavorite in PetService, we'll use the same like functionality
      // In a real implementation, you would create a separate favorites table and service method
      // For now, we'll treat favorites the same as likes
      await PetService.toggleLike(pet.id, user.id);
      // Success - no need to show alert for successful favorite/unfavorite
    } catch (error) {
      // Revert optimistic update on error
      setFavorited(previousFavorited);
      console.error('Error toggling favorite:', error);
      Alert.alert('Lỗi', 'Không thể lưu pet này. Vui lòng thử lại.');
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, onFavorite, pet.id, favorited]);
  
  const handleSharePress = useCallback(async () => {
    if (onShare) {
      onShare(pet);
      return;
    }
    
    try {
      const shareMessage = `Check out ${pet.name} on Adopet!`;
      const deepLink = `petadoption://pet/${pet.id}`;
      
      await Share.share({
        message: `${shareMessage}\n${deepLink}`,
        title: `${pet.name} - Adopet`,
      });
      // Success - no need to show alert for successful share
    } catch (error) {
      console.error('Error sharing pet:', error);
      
      // Show retry option
      Alert.alert(
        'Lỗi chia sẻ',
        'Không thể chia sẻ pet này. Bạn có muốn thử lại không?',
        [
          {
            text: 'Hủy',
            style: 'cancel',
          },
          {
            text: 'Thử lại',
            onPress: () => handleSharePress(),
          },
        ]
      );
    }
  }, [onShare, pet]);

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handleImageLoad = useCallback(() => {
    setImageLoading(false);
    setImageError(false);
    // Fade in animation when image loads
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handleImageError = useCallback(() => {
    setImageError(true);
    setImageLoading(false);
    console.warn('Pet image failed to load:', pet.id);
  }, [pet.id]);

  const handleRetry = useCallback(() => {
    setImageError(false);
    setImageLoading(true);
    // Reset fade animation for retry
    fadeAnim.setValue(0);
  }, [fadeAnim]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          width: cardWidth,
          height: cardHeight,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.touchableContainer}
        onPress={handleCardPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        accessible={true}
        accessibilityLabel={`Pet card for ${pet.name}, ${pet.age_months} months old${pet.location ? `, located in ${pet.location}` : ''}`}
        accessibilityRole="button"
        accessibilityHint="Double tap to view pet details"
      >
      {petImage && !imageError ? (
        <Animated.View style={[styles.imageBackground, { opacity: fadeAnim }]}>
          <ImageBackground
            source={{ uri: petImage }}
            style={styles.imageBackground}
            imageStyle={styles.imageStyle}
            resizeMode="cover"
            onLoad={handleImageLoad}
            onError={handleImageError}
          >
          {imageLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.textInverse} />
            </View>
          )}
          {!imageLoading && (
            <LinearGradient
              colors={designTokens.gradientColors}
              locations={designTokens.gradientLocations}
              style={styles.gradientOverlay}
            >
              <View style={styles.textOverlaySection}>
                {/* Status Indicator */}
                <View 
                  style={styles.statusContainer}
                  accessible={true}
                  accessibilityLabel="Pet status: Active recently"
                  accessibilityRole="text"
                >
                  <View style={styles.statusDot} accessible={false} />
                  <Text style={[styles.statusText, { fontSize: responsiveFontSizes.statusText }]}>
                    Có hoạt động gần đây
                  </Text>
                </View>

                {/* Pet Info Section */}
                <View style={styles.petInfoContainer}>
                  {/* Name, Age, and Verification Badge Row */}
                  <View 
                    style={styles.nameRow}
                    accessible={true}
                    accessibilityLabel={`${pet.name}, ${pet.age_months} months old${pet.profiles?.reputation_points && pet.profiles.reputation_points >= 100 ? ', verified seller' : ''}`}
                    accessibilityRole="text"
                  >
                    <Text style={[styles.petName, { fontSize: responsiveFontSizes.petName }]}>
                      {pet.name}
                    </Text>
                    <Text style={[styles.petAge, { fontSize: responsiveFontSizes.petAge }]}>
                      {pet.age_months} tháng
                    </Text>
                    {pet.profiles?.reputation_points && pet.profiles.reputation_points >= 100 && (
                      <MaterialIcons
                        name="verified"
                        size={scaleFontSize(designTokens.verificationBadgeSize, screenWidth)}
                        color={designTokens.verificationBadgeColor}
                        style={styles.verificationBadge}
                        accessible={false}
                      />
                    )}
                  </View>

                  {/* Location Information Section */}
                  {pet.location && (
                    <View style={styles.locationContainer}>
                      <View 
                        style={styles.locationRow}
                        accessible={true}
                        accessibilityLabel={`Lives in ${pet.location}`}
                        accessibilityRole="text"
                      >
                        <MaterialIcons
                          name="home"
                          size={scaleFontSize(designTokens.locationIconSize, screenWidth)}
                          color={colors.textInverse}
                          style={styles.locationIcon}
                          accessible={false}
                        />
                        <Text style={[styles.locationText, { fontSize: responsiveFontSizes.locationText }]} numberOfLines={1}>
                          Sống tại {pet.location}
                        </Text>
                      </View>
                      <View 
                        style={styles.locationRow}
                        accessible={true}
                        accessibilityLabel="Distance: 2 kilometers away"
                        accessibilityRole="text"
                      >
                        <MaterialIcons
                          name="place"
                          size={scaleFontSize(designTokens.locationIconSize, screenWidth)}
                          color={colors.textInverse}
                          style={styles.locationIcon}
                          accessible={false}
                        />
                        <Text style={[styles.distanceText, { fontSize: responsiveFontSizes.distanceText }]}>
                          Cách xa 2 km
                        </Text>
                      </View>
                    </View>
                  )}
                </View>


              </View>
            </LinearGradient>
          )}
          </ImageBackground>
        </Animated.View>
      ) : (
        <View 
          style={styles.errorContainer}
          accessible={true}
          accessibilityLabel={imageError ? "Image failed to load" : "No image available"}
          accessibilityRole="image"
        >
          <MaterialIcons
            name="photo-camera"
            size={designTokens.errorIconSize}
            color={designTokens.errorIconColor}
            style={styles.errorIcon}
            accessible={false}
          />
          <Text style={styles.errorText}>Không có ảnh</Text>
          {imageError && (
            <TouchableOpacity
              style={styles.retryButton}
              onPress={handleRetry}
              activeOpacity={0.7}
              accessible={true}
              accessibilityLabel="Retry loading image"
              accessibilityRole="button"
              accessibilityHint="Attempts to reload the pet image"
            >
              <MaterialIcons name="refresh" size={spacing.xl} color={colors.textInverse} accessible={false} />
              <Text style={styles.retryButtonText}>Thử lại</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  // Container styles
  container: {
    borderRadius: designTokens.cardBorderRadius,
    overflow: 'hidden',
    backgroundColor: colors.backgroundTertiary,
    ...shadows.card,
  },
  touchableContainer: {
    width: '100%',
    height: '100%',
  },
  
  // Image background styles
  imageBackground: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  imageStyle: {
    borderRadius: designTokens.cardBorderRadius,
  },
  
  // Gradient overlay styles
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: designTokens.gradientHeight,
    justifyContent: 'flex-end',
  },
  textOverlaySection: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  
  // Status indicator styles
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm - 2, // 6px
    marginBottom: spacing.md,
  },
  statusDot: {
    width: designTokens.statusDotSize,
    height: designTokens.statusDotSize,
    borderRadius: designTokens.statusDotSize / 2,
    backgroundColor: designTokens.statusDotColor,
  },
  statusText: {
    color: colors.textInverse,
    fontWeight: typography.statusText.fontWeight,
    ...designTokens.textShadowLight,
  },
  
  // Pet info styles
  petInfoContainer: {
    marginTop: spacing.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  petName: {
    color: colors.textInverse,
    fontWeight: typography.petName.fontWeight,
    letterSpacing: typography.petName.letterSpacing,
    ...designTokens.textShadow,
  },
  petAge: {
    color: colors.textInverse,
    fontWeight: typography.petAge.fontWeight,
    ...designTokens.textShadow,
  },
  verificationBadge: {
    ...designTokens.textShadowLight,
  },
  
  // Location styles
  locationContainer: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm - 2, // 6px
  },
  locationIcon: {
    opacity: designTokens.iconOpacity,
    ...designTokens.textShadowLight,
  },
  locationText: {
    color: colors.textInverse,
    fontWeight: typography.locationText.fontWeight,
    flex: 1,
    ...designTokens.textShadowLight,
  },
  distanceText: {
    color: colors.textInverse,
    fontWeight: typography.distanceText.fontWeight,
    opacity: designTokens.distanceTextOpacity,
    ...designTokens.textShadowLight,
  },
  
  // Action buttons styles
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  actionButton: {
    backgroundColor: designTokens.buttonBackgroundColor,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: designTokens.buttonMinTouchTarget,
    minHeight: designTokens.buttonMinTouchTarget,
    ...shadows.button,
  },
  
  // Loading state styles
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: designTokens.placeholderBackground,
  },
  
  // Error state styles
  errorContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: designTokens.placeholderBackground,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: designTokens.cardBorderRadius,
  },
  errorIcon: {
    marginBottom: spacing.md,
  },
  errorText: {
    fontSize: typography.errorText.fontSize,
    color: designTokens.errorTextColor,
    fontWeight: typography.errorText.fontWeight,
    marginBottom: spacing.lg,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: spacing.xl,
    marginTop: spacing.sm,
    minHeight: designTokens.buttonMinTouchTarget,
  },
  retryButtonText: {
    color: colors.textInverse,
    fontSize: typography.retryButtonText.fontSize,
    fontWeight: typography.retryButtonText.fontWeight,
  },
});

// ============================================================================
// MEMOIZATION
// ============================================================================

/**
 * Custom comparison function for React.memo
 * Only re-render if critical props change
 */
const arePropsEqual = (
  prevProps: PetCardNewProps,
  nextProps: PetCardNewProps
): boolean => {
  // Re-render if pet ID changes (different pet)
  if (prevProps.pet.id !== nextProps.pet.id) {
    return false;
  }
  
  // Re-render if like/favorite state changes
  if (prevProps.isLiked !== nextProps.isLiked || prevProps.isFavorited !== nextProps.isFavorited) {
    return false;
  }
  
  // Re-render if showActions changes
  if (prevProps.showActions !== nextProps.showActions) {
    return false;
  }
  
  // Re-render if pet image changes
  const prevImage = prevProps.pet.images?.[0];
  const nextImage = nextProps.pet.images?.[0];
  if (prevImage !== nextImage) {
    return false;
  }
  
  // Re-render if next pet image changes (for preloading)
  if (prevProps.nextPetImage !== nextProps.nextPetImage) {
    return false;
  }
  
  // Don't re-render for callback changes (they should be stable with useCallback)
  return true;
};

/**
 * Memoized PetCardNew component
 * Prevents unnecessary re-renders when props haven't changed
 */
export const PetCardNew = React.memo(PetCardNewComponent, arePropsEqual);
