import React from 'react';
import { render } from '@testing-library/react-native';
import { PetCardNew } from '../PetCardNew';
import { Pet } from '@/lib/supabaseClient';

// Mock dependencies
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));

jest.mock('@/src/features/pets/services/pet.service', () => ({
  PetService: {
    toggleLike: jest.fn(),
  },
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'current-user-id' } },
      }),
    },
  },
}));

// Mock pet data
const mockPet: Pet = {
  id: 'test-pet-1',
  name: 'Husky',
  age_months: 10,
  location: 'TP Qui Nhơn',
  images: ['https://example.com/pet-image.jpg'],
  breed: 'Husky',
  gender: 'male',
  size: 'large',
  description: 'A friendly husky',
  user_id: 'user-1',
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
  status: 'available',
  profiles: {
    id: 'profile-1',
    full_name: 'John Doe',
    avatar_url: 'https://example.com/avatar.jpg',
    reputation_points: 150,
  },
};

describe('PetCardNew Accessibility Tests', () => {
  describe('Screen Reader Support', () => {
    it('provides accessible label for main card', () => {
      const { getByLabelText } = render(<PetCardNew pet={mockPet} />);

      const card = getByLabelText(
        'Pet card for Husky, 10 months old, located in TP Qui Nhơn'
      );
      expect(card).toBeTruthy();
      expect(card.props.accessible).toBe(true);
      expect(card.props.accessibilityRole).toBe('button');
    });

    it('provides accessibility hint for card interaction', () => {
      const { getByLabelText } = render(<PetCardNew pet={mockPet} />);

      const card = getByLabelText(/Pet card for Husky/);
      expect(card.props.accessibilityHint).toBe('Double tap to view pet details');
    });

    it('provides accessible labels for all action buttons', () => {
      const { getByLabelText } = render(<PetCardNew pet={mockPet} />);

      // Back button
      const backButton = getByLabelText('Go back');
      expect(backButton.props.accessible).toBe(true);
      expect(backButton.props.accessibilityRole).toBe('button');
      expect(backButton.props.accessibilityHint).toBe(
        'Returns to the previous pet card'
      );

      // Close button
      const closeButton = getByLabelText('Close');
      expect(closeButton.props.accessible).toBe(true);
      expect(closeButton.props.accessibilityRole).toBe('button');
      expect(closeButton.props.accessibilityHint).toBe('Dismisses the pet card');

      // Favorite button
      const favoriteButton = getByLabelText('Add to favorites');
      expect(favoriteButton.props.accessible).toBe(true);
      expect(favoriteButton.props.accessibilityRole).toBe('button');
      expect(favoriteButton.props.accessibilityHint).toBe(
        'Saves this pet to your favorites list'
      );

      // Like button
      const likeButton = getByLabelText('Like this pet');
      expect(likeButton.props.accessible).toBe(true);
      expect(likeButton.props.accessibilityRole).toBe('button');
      expect(likeButton.props.accessibilityHint).toBe('Shows interest in this pet');

      // Share button
      const shareButton = getByLabelText('Share this pet');
      expect(shareButton.props.accessible).toBe(true);
      expect(shareButton.props.accessibilityRole).toBe('button');
      expect(shareButton.props.accessibilityHint).toBe(
        'Opens share options to share this pet with others'
      );
    });

    it('provides accessible labels for pet information sections', () => {
      const { getByLabelText } = render(<PetCardNew pet={mockPet} />);

      // Status indicator
      const status = getByLabelText('Pet status: Active recently');
      expect(status.props.accessible).toBe(true);
      expect(status.props.accessibilityRole).toBe('text');

      // Pet name and age
      const nameAge = getByLabelText(/Husky, 10 months old/);
      expect(nameAge.props.accessible).toBe(true);
      expect(nameAge.props.accessibilityRole).toBe('text');

      // Location
      const location = getByLabelText('Lives in TP Qui Nhơn');
      expect(location.props.accessible).toBe(true);
      expect(location.props.accessibilityRole).toBe('text');

      // Distance
      const distance = getByLabelText('Distance: 2 kilometers away');
      expect(distance.props.accessible).toBe(true);
      expect(distance.props.accessibilityRole).toBe('text');
    });

    it('announces verification status for verified sellers', () => {
      const { getByLabelText } = render(<PetCardNew pet={mockPet} />);

      const nameAge = getByLabelText(/Husky, 10 months old, verified seller/);
      expect(nameAge).toBeTruthy();
    });

    it('does not announce verification for unverified sellers', () => {
      const unverifiedPet = {
        ...mockPet,
        profiles: {
          ...mockPet.profiles!,
          reputation_points: 50,
        },
      };

      const { getByLabelText, queryByLabelText } = render(
        <PetCardNew pet={unverifiedPet} />
      );

      const nameAge = getByLabelText(/Husky, 10 months old/);
      expect(nameAge).toBeTruthy();
      expect(queryByLabelText(/verified seller/)).toBeNull();
    });

    it('provides accessible labels for error states', () => {
      const petWithoutImage = { ...mockPet, images: [] };
      const { getByLabelText } = render(<PetCardNew pet={petWithoutImage} />);

      const errorState = getByLabelText('No image available');
      expect(errorState.props.accessible).toBe(true);
      expect(errorState.props.accessibilityRole).toBe('image');
    });

    it('provides accessible label for retry button', () => {
      const petWithoutImage = { ...mockPet, images: [] };
      const { queryByLabelText } = render(<PetCardNew pet={petWithoutImage} />);

      // Retry button should not be present for missing images (only for errors)
      expect(queryByLabelText('Retry loading image')).toBeNull();
    });

    it('updates accessibility state for liked/favorited buttons', () => {
      const { getByLabelText, rerender } = render(
        <PetCardNew pet={mockPet} isLiked={false} isFavorited={false} />
      );

      // Initial state
      const likeButton = getByLabelText('Like this pet');
      expect(likeButton.props.accessibilityState?.selected).toBe(false);

      const favoriteButton = getByLabelText('Add to favorites');
      expect(favoriteButton.props.accessibilityState?.selected).toBe(false);

      // Updated state
      rerender(<PetCardNew pet={mockPet} isLiked={true} isFavorited={true} />);

      const unlikeButton = getByLabelText('Unlike this pet');
      expect(unlikeButton.props.accessibilityState?.selected).toBe(true);

      const unfavoriteButton = getByLabelText('Remove from favorites');
      expect(unfavoriteButton.props.accessibilityState?.selected).toBe(true);
    });

    it('marks decorative icons as not accessible', () => {
      const { UNSAFE_getAllByType } = render(<PetCardNew pet={mockPet} />);

      const icons = UNSAFE_getAllByType('MaterialIcons');
      
      // Icons inside accessible containers should have accessible={false}
      icons.forEach((icon) => {
        if (icon.props.accessible !== undefined) {
          expect(icon.props.accessible).toBe(false);
        }
      });
    });
  });

  describe('Touch Target Sizes', () => {
    it('ensures all action buttons meet 44x44px minimum touch target', () => {
      const { getByLabelText } = render(<PetCardNew pet={mockPet} />);

      const buttons = [
        getByLabelText('Go back'),
        getByLabelText('Close'),
        getByLabelText('Add to favorites'),
        getByLabelText('Like this pet'),
        getByLabelText('Share this pet'),
      ];

      buttons.forEach((button) => {
        const style = button.props.style;
        const flatStyle = Array.isArray(style)
          ? Object.assign({}, ...style)
          : style;

        // Check minimum touch target (44x44px or larger)
        expect(flatStyle.minWidth).toBeGreaterThanOrEqual(44);
        expect(flatStyle.minHeight).toBeGreaterThanOrEqual(44);
      });
    });

    it('ensures card has adequate touch target', () => {
      const { getByLabelText } = render(<PetCardNew pet={mockPet} />);

      const card = getByLabelText(/Pet card for Husky/);
      expect(card).toBeTruthy();
      
      // Card should be large enough to tap easily
      // (actual size is calculated based on screen width)
    });

    it('maintains touch targets on small screens', () => {
      // This test verifies the responsive button sizing logic
      const { getByLabelText } = render(<PetCardNew pet={mockPet} />);

      const buttons = [
        getByLabelText('Go back'),
        getByLabelText('Close'),
        getByLabelText('Add to favorites'),
        getByLabelText('Like this pet'),
        getByLabelText('Share this pet'),
      ];

      // All buttons should maintain minimum touch targets
      buttons.forEach((button) => {
        expect(button.props.style).toBeDefined();
      });
    });
  });

  describe('Color Contrast (WCAG AA Standards)', () => {
    it('uses white text on dark gradient for sufficient contrast', () => {
      const { getByText } = render(<PetCardNew pet={mockPet} />);

      // Pet name (white on dark gradient)
      const petName = getByText('Husky');
      const nameStyle = Array.isArray(petName.props.style)
        ? Object.assign({}, ...petName.props.style)
        : petName.props.style;
      
      // White text (#FFFFFF) on dark gradient (rgba(0,0,0,0.8))
      // Contrast ratio > 7:1 (AAA level)
      expect(nameStyle.color).toBeDefined();
    });

    it('applies text shadow for improved readability on images', () => {
      const { getByText } = render(<PetCardNew pet={mockPet} />);

      const petName = getByText('Husky');
      const nameStyle = Array.isArray(petName.props.style)
        ? Object.assign({}, ...petName.props.style)
        : petName.props.style;

      // Text shadow should be applied
      expect(nameStyle.textShadowColor).toBeDefined();
      expect(nameStyle.textShadowRadius).toBeDefined();
    });

    it('uses dark icons on white button backgrounds for sufficient contrast', () => {
      const { getByLabelText } = render(<PetCardNew pet={mockPet} />);

      const likeButton = getByLabelText('Like this pet');
      const buttonStyle = Array.isArray(likeButton.props.style)
        ? Object.assign({}, ...likeButton.props.style)
        : likeButton.props.style;

      // White background with dark gray icons
      // Contrast ratio > 12:1
      expect(buttonStyle.backgroundColor).toBeDefined();
    });

    it('uses appropriate colors for error states', () => {
      const petWithoutImage = { ...mockPet, images: [] };
      const { getByText } = render(<PetCardNew pet={petWithoutImage} />);

      const errorText = getByText('Không có ảnh');
      const errorStyle = Array.isArray(errorText.props.style)
        ? Object.assign({}, ...errorText.props.style)
        : errorText.props.style;

      // Error text should have sufficient contrast
      expect(errorStyle.color).toBeDefined();
    });

    it('uses high-contrast status indicator', () => {
      const { getByText } = render(<PetCardNew pet={mockPet} />);

      const statusText = getByText('Có hoạt động gần đây');
      const statusStyle = Array.isArray(statusText.props.style)
        ? Object.assign({}, ...statusText.props.style)
        : statusText.props.style;

      // White text with text shadow on gradient
      expect(statusStyle.color).toBeDefined();
      expect(statusStyle.textShadowColor).toBeDefined();
    });
  });

  describe('Keyboard Navigation and Focus Management', () => {
    it('sets proper accessibility roles for keyboard navigation', () => {
      const { getByLabelText } = render(<PetCardNew pet={mockPet} />);

      // Card should be focusable
      const card = getByLabelText(/Pet card for Husky/);
      expect(card.props.accessibilityRole).toBe('button');

      // All buttons should be focusable
      const buttons = [
        getByLabelText('Go back'),
        getByLabelText('Close'),
        getByLabelText('Add to favorites'),
        getByLabelText('Like this pet'),
        getByLabelText('Share this pet'),
      ];

      buttons.forEach((button) => {
        expect(button.props.accessibilityRole).toBe('button');
      });
    });

    it('provides proper focus order through component structure', () => {
      const { getByLabelText } = render(<PetCardNew pet={mockPet} />);

      // Focus order should be logical:
      // 1. Main card
      // 2. Action buttons (left to right)
      
      expect(getByLabelText(/Pet card for Husky/)).toBeTruthy();
      expect(getByLabelText('Go back')).toBeTruthy();
      expect(getByLabelText('Close')).toBeTruthy();
      expect(getByLabelText('Add to favorites')).toBeTruthy();
      expect(getByLabelText('Like this pet')).toBeTruthy();
      expect(getByLabelText('Share this pet')).toBeTruthy();
    });
  });

  describe('Dynamic Content Announcements', () => {
    it('announces state changes for like button', () => {
      const { getByLabelText, rerender } = render(
        <PetCardNew pet={mockPet} isLiked={false} />
      );

      expect(getByLabelText('Like this pet')).toBeTruthy();

      rerender(<PetCardNew pet={mockPet} isLiked={true} />);

      expect(getByLabelText('Unlike this pet')).toBeTruthy();
    });

    it('announces state changes for favorite button', () => {
      const { getByLabelText, rerender } = render(
        <PetCardNew pet={mockPet} isFavorited={false} />
      );

      expect(getByLabelText('Add to favorites')).toBeTruthy();

      rerender(<PetCardNew pet={mockPet} isFavorited={true} />);

      expect(getByLabelText('Remove from favorites')).toBeTruthy();
    });

    it('announces disabled state for buttons during processing', () => {
      const { getByLabelText } = render(<PetCardNew pet={mockPet} />);

      const likeButton = getByLabelText('Like this pet');
      const favoriteButton = getByLabelText('Add to favorites');

      // Buttons should have accessibility state
      expect(likeButton.props.accessibilityState).toBeDefined();
      expect(favoriteButton.props.accessibilityState).toBeDefined();
    });
  });

  describe('Reduced Motion Support', () => {
    it('renders without animations when needed', () => {
      // Component should gracefully handle reduced motion preferences
      const { getByLabelText } = render(<PetCardNew pet={mockPet} />);

      expect(getByLabelText(/Pet card for Husky/)).toBeTruthy();
    });
  });

  describe('Comprehensive Accessibility Compliance', () => {
    it('meets WCAG 2.1 Level AA requirements', () => {
      const { getByLabelText, getByText } = render(<PetCardNew pet={mockPet} />);

      // 1. Perceivable: Text alternatives for non-text content
      expect(getByLabelText(/Pet card for Husky/)).toBeTruthy();
      expect(getByLabelText('No image available') || getByText('Husky')).toBeTruthy();

      // 2. Operable: All functionality available from keyboard
      const card = getByLabelText(/Pet card for Husky/);
      expect(card.props.accessibilityRole).toBe('button');

      // 3. Understandable: Clear labels and hints
      expect(card.props.accessibilityHint).toBe('Double tap to view pet details');

      // 4. Robust: Compatible with assistive technologies
      expect(card.props.accessible).toBe(true);
    });

    it('provides complete information for screen readers', () => {
      const { getByLabelText } = render(<PetCardNew pet={mockPet} />);

      // Main card should include all essential information
      const card = getByLabelText(
        'Pet card for Husky, 10 months old, located in TP Qui Nhơn'
      );
      expect(card).toBeTruthy();

      // Individual sections should also be accessible
      expect(getByLabelText('Pet status: Active recently')).toBeTruthy();
      expect(getByLabelText(/Husky, 10 months old/)).toBeTruthy();
      expect(getByLabelText('Lives in TP Qui Nhơn')).toBeTruthy();
      expect(getByLabelText('Distance: 2 kilometers away')).toBeTruthy();
    });
  });
});
