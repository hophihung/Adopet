# Design Document - Pet Card Redesign with Full Image Overlay

## Overview

This design document outlines the implementation of a modern, Tinder-style pet card component with full-screen images and elegant text overlays. The redesign focuses on visual appeal, user engagement, and seamless integration with the existing Adopet application architecture.

## Architecture

### Component Structure

```
PetCard (Container)
├── ImageBackground (Full Card Image)
│   ├── LinearGradient (Bottom Overlay)
│   │   ├── StatusIndicator (Top of overlay)
│   │   ├── PetInfoSection (Main content)
│   │   │   ├── PetName + Age + VerificationBadge
│   │   │   ├── LocationInfo (Icon + Text + Distance)
│   │   └── ActionButtons (Bottom row)
│   │       ├── BackButton
│   │       ├── CloseButton
│   │       ├── StarButton (Favorite)
│   │       ├── HeartButton (Like)
│   │       └── ShareButton
│   └── LoadingIndicator (Conditional)
```

### Design Principles

1. **Image-First Design**: Pet images are the primary visual element
2. **Readability**: Gradient overlays ensure text is always readable
3. **Touch-Friendly**: All interactive elements meet 44x44px minimum touch targets
4. **Performance**: Optimized image loading and rendering
5. **Consistency**: Maintains Adopet's design language and color scheme

## Components and Interfaces

### 1. PetCard Component

**File**: `src/features/pets/components/PetCard.tsx`

#### Props Interface

```typescript
interface PetCardProps {
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
}
```

#### Layout Specifications

**Card Dimensions**:
- Width: `Dimensions.get('window').width - 32` (16px margin each side)
- Height: `cardWidth * 1.25` (4:5 aspect ratio)
- Border Radius: `20px`
- Shadow: iOS elevation 8, Android elevation 8

**Gradient Overlay**:
- Type: Linear Gradient (vertical)
- Colors: `['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.8)']`
- Locations: `[0, 0.5, 1]`
- Start: `{x: 0, y: 0}`
- End: `{x: 0, y: 1}`

**Text Overlay Section**:
- Position: Absolute bottom
- Padding: `20px horizontal, 24px vertical`
- Height: ~40% of card height

### 2. Status Indicator Component

**Visual Design**:
```
┌─────────────────────────────┐
│ ● Có hoạt động gần đây      │
└─────────────────────────────┘
```

**Specifications**:
- Green Dot: 8px diameter, `#10B981`
- Text: 13px, weight 600, white color
- Container: Flex row, gap 6px
- Position: Top of text overlay section

### 3. Pet Info Section

**Layout**:
```
Husky  10 ✓
🏠 Sống tại TP Qui Nhơn
📍 Cách xa 2 km
```

**Name + Age + Badge**:
- Name: 28px, weight 800, white, letter-spacing 0.5
- Age: 24px, weight 700, white
- Verification Badge: 20px blue checkmark icon
- Layout: Flex row with 8px gap

**Location Info**:
- Home Icon: 16px, white with 0.9 opacity
- Location Text: 15px, weight 600, white
- Distance: 14px, weight 500, white with 0.8 opacity
- Spacing: 8px between lines

### 4. Action Buttons

**Button Specifications**:
- Size: 60px diameter (56px for middle button - close)
- Background: White with 95% opacity
- Border Radius: 30px (perfect circle)
- Shadow: `shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.15, shadowRadius: 8`
- Icon Size: 24px (28px for heart)
- Icon Color: `#1F2937` (dark gray)

**Button Layout**:
```
┌────────────────────────────────────┐
│  ↶    ✕    ☆    ♥    ➤           │
└────────────────────────────────────┘
```

**Spacing**:
- Container: Flex row, justify space-between
- Padding: 20px horizontal
- Gap: Auto-distributed

**Button Actions**:
1. **Back Button** (↶): Navigate to previous screen
2. **Close Button** (✕): Dismiss card/modal
3. **Star Button** (☆): Toggle favorite status
4. **Heart Button** (♥): Toggle like status
5. **Share Button** (➤): Open native share dialog

### 5. Image Loading States

**Loading State**:
- Display: ActivityIndicator centered
- Color: White
- Size: Large
- Background: `#F5F7FA`

**Error State**:
- Display: Placeholder with icon and text
- Background: `#F5F7FA`
- Icon: Camera icon, 48px, `#9CA3AF`
- Text: "Không có ảnh", 16px, `#6B7280`

**Success State**:
- Display: Full image with gradient overlay
- Resize Mode: Cover
- Cache: Enabled

## Data Models

### Pet Type Extension

The component uses the existing `Pet` type from `@/lib/supabaseClient` with optional profile information:

```typescript
type PetCardData = Pet & {
  profiles?: {
    id: string;
    full_name: string;
    avatar_url: string;
    reputation_points?: number;
  };
};
```

### Component State

```typescript
interface PetCardState {
  imageLoading: boolean;
  imageError: boolean;
  isLiked: boolean;
  isFavorited: boolean;
}
```

## Styling Architecture

### Style Organization

```typescript
const styles = StyleSheet.create({
  // Container styles
  container: { ... },
  imageBackground: { ... },
  
  // Gradient overlay
  gradientOverlay: { ... },
  textOverlaySection: { ... },
  
  // Status indicator
  statusContainer: { ... },
  statusDot: { ... },
  statusText: { ... },
  
  // Pet info
  petInfoContainer: { ... },
  nameRow: { ... },
  petName: { ... },
  petAge: { ... },
  verificationBadge: { ... },
  locationRow: { ... },
  locationIcon: { ... },
  locationText: { ... },
  distanceText: { ... },
  
  // Action buttons
  actionsContainer: { ... },
  actionButton: { ... },
  actionButtonIcon: { ... },
  
  // Loading/Error states
  loadingContainer: { ... },
  errorContainer: { ... },
  errorIcon: { ... },
  errorText: { ... },
});
```

### Responsive Design

**Breakpoints**:
- Small: < 375px width
- Medium: 375px - 414px width
- Large: > 414px width

**Adaptive Sizing**:
```typescript
const screenWidth = Dimensions.get('window').width;
const cardWidth = screenWidth - 32;
const cardHeight = cardWidth * 1.25;

// Font scaling for small screens
const scaleFontSize = (size: number) => {
  if (screenWidth < 375) {
    return size * 0.9;
  }
  return size;
};
```

## Error Handling

### Image Loading Errors

1. **Network Error**: Display placeholder with retry option
2. **Invalid URL**: Display placeholder with "No Image" message
3. **Timeout**: Display placeholder after 10 seconds
4. **Missing Image**: Display placeholder immediately

### User Action Errors

1. **Like/Favorite Failed**: Show toast notification, revert UI state
2. **Share Failed**: Show error alert with retry option
3. **Navigation Failed**: Log error, show fallback UI

### Error Recovery

```typescript
const handleImageError = () => {
  setImageError(true);
  setImageLoading(false);
  // Log to analytics
  console.warn('Pet image failed to load:', pet.id);
};

const handleActionError = (action: string, error: Error) => {
  // Show user-friendly message
  Alert.alert(
    'Lỗi',
    `Không thể ${action}. Vui lòng thử lại.`,
    [{ text: 'OK' }]
  );
  // Log to error tracking service
  console.error(`Action ${action} failed:`, error);
};
```

## Testing Strategy

### Unit Tests

**Test File**: `src/features/pets/components/__tests__/PetCard.test.tsx`

**Test Cases**:
1. Renders correctly with valid pet data
2. Displays placeholder when image is missing
3. Shows loading indicator while image loads
4. Handles image load errors gracefully
5. Calls onPress when card is tapped
6. Calls onLike when heart button is tapped
7. Calls onFavorite when star button is tapped
8. Calls onShare when share button is tapped
9. Displays verification badge for verified sellers
10. Formats location and distance correctly
11. Applies correct styles for different screen sizes
12. Handles missing optional props gracefully

### Integration Tests

1. **Navigation Test**: Verify card navigates to pet detail screen
2. **Like/Favorite Test**: Verify state updates and API calls
3. **Share Test**: Verify native share dialog opens
4. **Image Cache Test**: Verify images are cached correctly

### Visual Regression Tests

1. Compare screenshots across different screen sizes
2. Verify gradient overlay renders correctly
3. Verify text readability on various image backgrounds
4. Verify button positioning and spacing

### Accessibility Tests

1. Screen reader announces pet information correctly
2. All buttons have accessible labels
3. Touch targets meet minimum size requirements
4. Color contrast meets WCAG AA standards

## Performance Considerations

### Image Optimization

1. **Lazy Loading**: Load images only when card is visible
2. **Image Caching**: Use React Native's built-in image cache
3. **Resize**: Request appropriately sized images from backend
4. **Format**: Prefer WebP format for smaller file sizes

### Rendering Optimization

1. **Memoization**: Use `React.memo` for PetCard component
2. **Callback Optimization**: Use `useCallback` for event handlers
3. **Avoid Re-renders**: Minimize prop changes
4. **Native Driver**: Use native driver for animations

### Memory Management

1. **Image Cleanup**: Clear image cache when memory is low
2. **Component Unmount**: Cancel pending image loads
3. **List Optimization**: Use `FlatList` with `windowSize` prop

## Accessibility Features

### Screen Reader Support

```typescript
<TouchableOpacity
  accessible={true}
  accessibilityLabel={`Pet card for ${pet.name}, ${pet.age_months} months old, located in ${pet.location}`}
  accessibilityRole="button"
  accessibilityHint="Double tap to view pet details"
>
```

### Action Button Labels

```typescript
<TouchableOpacity
  accessible={true}
  accessibilityLabel="Like this pet"
  accessibilityRole="button"
>
```

### Color Contrast

- Text on gradient: White (#FFFFFF) on dark gradient (rgba(0,0,0,0.8))
- Contrast ratio: > 7:1 (AAA level)
- Button icons: Dark gray (#1F2937) on white background
- Contrast ratio: > 12:1

### Touch Targets

- All buttons: 60x60px (exceeds 44x44px minimum)
- Card tap area: Full card surface
- Spacing between buttons: Minimum 8px

## Animation Specifications

### Card Press Animation

```typescript
const animatedValue = useRef(new Animated.Value(1)).current;

const handlePressIn = () => {
  Animated.spring(animatedValue, {
    toValue: 0.95,
    useNativeDriver: true,
  }).start();
};

const handlePressOut = () => {
  Animated.spring(animatedValue, {
    toValue: 1,
    friction: 3,
    tension: 40,
    useNativeDriver: true,
  }).start();
};
```

### Button Press Animation

```typescript
<TouchableOpacity
  activeOpacity={0.7}
  style={styles.actionButton}
>
```

### Image Fade-In

```typescript
<Animated.Image
  style={{ opacity: fadeAnim }}
  onLoad={() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }}
/>
```

## Integration Points

### Navigation

```typescript
import { useRouter } from 'expo-router';

const router = useRouter();

const handleCardPress = () => {
  router.push(`/pet/${pet.id}`);
};
```

### Like/Favorite Services

```typescript
import { PetService } from '@/src/features/pets/services/pet.service';

const handleLike = async () => {
  try {
    await PetService.toggleLike(pet.id);
    setIsLiked(!isLiked);
  } catch (error) {
    handleActionError('thích', error);
  }
};
```

### Share Functionality

```typescript
import { Share } from 'react-native';

const handleShare = async () => {
  try {
    await Share.share({
      message: `Check out ${pet.name} on Adopet!`,
      url: `petadoption://pet/${pet.id}`,
    });
  } catch (error) {
    handleActionError('chia sẻ', error);
  }
};
```

## Design Tokens

### Spacing Scale

```typescript
const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};
```

### Typography Scale

```typescript
const typography = {
  petName: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  petAge: {
    fontSize: 24,
    fontWeight: '700',
  },
  locationText: {
    fontSize: 15,
    fontWeight: '600',
  },
  distanceText: {
    fontSize: 14,
    fontWeight: '500',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
};
```

### Shadow Presets

```typescript
const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  button: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
};
```

## Migration Strategy

### Backward Compatibility

The new PetCard component will:
1. Maintain the same prop interface (with additions)
2. Support all existing Pet type properties
3. Provide fallbacks for missing data
4. Work with existing navigation and services

### Gradual Rollout

1. **Phase 1**: Implement new component alongside old one
2. **Phase 2**: Update discover/swipe screen to use new component
3. **Phase 3**: Update pet list screens to use new component
4. **Phase 4**: Remove old component after verification

### Feature Flags

```typescript
const USE_NEW_PET_CARD = true; // Toggle for A/B testing

{USE_NEW_PET_CARD ? (
  <PetCardNew {...props} />
) : (
  <PetCardOld {...props} />
)}
```

## Future Enhancements

### Potential Additions

1. **Video Support**: Display video thumbnails with play button
2. **Multiple Images**: Swipeable image carousel within card
3. **Quick Actions**: Long-press menu for additional actions
4. **Animations**: Card flip animation for more details
5. **Haptic Feedback**: Vibration on button press
6. **Sound Effects**: Optional sound on like/favorite
7. **AR Preview**: View pet in AR (future iOS/Android feature)

### Performance Improvements

1. **Image Preloading**: Preload next card's image
2. **Skeleton Loading**: Show skeleton UI while loading
3. **Progressive Enhancement**: Load low-res first, then high-res
4. **WebP Support**: Use WebP format for better compression

## Design Rationale

### Why Full Image Design?

1. **Visual Impact**: Pet images are the most important factor in adoption decisions
2. **Modern UX**: Aligns with popular dating/discovery apps users are familiar with
3. **Engagement**: Large images increase user engagement and time spent
4. **Emotional Connection**: Full-screen images create stronger emotional responses

### Why Gradient Overlay?

1. **Readability**: Ensures text is readable on any image background
2. **Aesthetics**: Creates depth and visual hierarchy
3. **Flexibility**: Works with light and dark images
4. **Consistency**: Maintains consistent text appearance across all cards

### Why Bottom Action Buttons?

1. **Reachability**: Easy to reach with thumb on mobile devices
2. **Familiarity**: Matches user expectations from similar apps
3. **Visual Balance**: Doesn't obscure the pet image
4. **Discoverability**: Clear and visible call-to-action

## Conclusion

This design provides a modern, engaging, and user-friendly pet card component that enhances the Adopet experience while maintaining compatibility with existing features. The full-image design with text overlay creates an emotional connection with users and improves the overall visual appeal of the application.
