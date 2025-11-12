# Pet Components

This directory contains all pet-related UI components for the Adopet application.

## Components

### PetCard (Legacy)
The original pet card component with a traditional card layout.

**Usage:**
```tsx
import { PetCard } from '@/src/features/pets/components';

<PetCard
  pet={petData}
  onPress={(pet) => console.log('Pressed:', pet.name)}
  showOwnerActions={false}
/>
```

### PetCardNew
Modern, full-image pet card with Tinder-style overlay design.

**Usage:**
```tsx
import { PetCardNew } from '@/src/features/pets/components';

<PetCardNew
  pet={petData}
  onPress={(pet) => router.push(`/pet/${pet.id}`)}
  onLike={(petId) => handleLike(petId)}
  onFavorite={(petId) => handleFavorite(petId)}
  onShare={(pet) => handleShare(pet)}
  onBack={() => goBack()}
  onClose={() => close()}
  isLiked={false}
  isFavorited={false}
  showActions={true}
/>
```

**Features:**
- Full-screen image display with 4:5 aspect ratio
- Gradient overlay for text readability
- Status indicators and verification badges
- Action buttons (back, close, favorite, like, share)
- Responsive layout for all screen sizes
- Accessibility support
- Loading and error states
- Smooth animations

### PetLimitBanner
Banner component to display pet listing limits.

## Integration

The new PetCardNew component is integrated into the match screen with a feature flag:

```tsx
// In app/(tabs)/discover/match.tsx
const USE_NEW_CARD_DESIGN = true; // Toggle between old and new design
```

Set `USE_NEW_CARD_DESIGN` to `false` to revert to the legacy card design.

## Backward Compatibility

Both PetCard and PetCardNew components:
- Accept the same Pet type from `@/lib/supabaseClient`
- Support optional profile information
- Work with existing navigation and services
- Handle missing or invalid data gracefully

## Testing

To test the integration:
1. Navigate to the Match screen in the Discover tab
2. Swipe through pet cards
3. Test all action buttons (like, favorite, share, etc.)
4. Verify responsive behavior on different screen sizes
5. Test with screen readers for accessibility

## Migration Guide

To migrate from PetCard to PetCardNew:

1. Update imports:
```tsx
// Old
import { PetCard } from '@/src/features/pets/components';

// New
import { PetCardNew } from '@/src/features/pets/components';
```

2. Update props (PetCardNew has additional props):
```tsx
<PetCardNew
  pet={pet}
  onPress={handlePress}
  onLike={handleLike}        // New
  onFavorite={handleFavorite} // New
  onShare={handleShare}       // New
  onBack={handleBack}         // New
  onClose={handleClose}       // New
  isLiked={isLiked}          // New
  isFavorited={isFavorited}  // New
  showActions={true}         // New
/>
```

3. Implement the new handler functions as needed.
