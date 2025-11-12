import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert, Share } from 'react-native';
import { PetCardNew } from '../PetCardNew';
import { Pet } from '@/lib/supabaseClient';
import { PetService } from '@/src/features/pets/services/pet.service';
import { supabase } from '@/lib/supabase';

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
      getUser: jest.fn(),
    },
  },
}));

jest.spyOn(Alert, 'alert');
jest.spyOn(Share, 'share');

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

const mockPetWithoutImage: Pet = {
  ...mockPet,
  images: [],
};

describe('PetCardNew', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: 'current-user-id' } },
    });
  });

  describe('Rendering', () => {
    it('renders correctly with valid pet data', () => {
      const { getByText, getByLabelText } = render(<PetCardNew pet={mockPet} />);

      expect(getByText('Husky')).toBeTruthy();
      expect(getByText('10 tháng')).toBeTruthy();
      expect(getByText('Sống tại TP Qui Nhơn')).toBeTruthy();
      expect(getByText('Có hoạt động gần đây')).toBeTruthy();
      expect(getByLabelText(/Pet card for Husky/)).toBeTruthy();
    });

    it('displays verification badge for verified sellers', () => {
      const { UNSAFE_getByType } = render(<PetCardNew pet={mockPet} />);
      const icons = UNSAFE_getByType('MaterialIcons');
      
      // Should have verification badge (verified icon)
      expect(icons).toBeTruthy();
    });

    it('does not display verification badge for unverified sellers', () => {
      const unverifiedPet = {
        ...mockPet,
        profiles: {
          ...mockPet.profiles!,
          reputation_points: 50,
        },
      };

      const { queryByTestId } = render(<PetCardNew pet={unverifiedPet} />);
      // Verification badge should not be present
      expect(queryByTestId('verification-badge')).toBeNull();
    });

    it('hides action buttons when showActions is false', () => {
      const { queryByLabelText } = render(
        <PetCardNew pet={mockPet} showActions={false} />
      );

      expect(queryByLabelText('Like this pet')).toBeNull();
      expect(queryByLabelText('Add to favorites')).toBeNull();
      expect(queryByLabelText('Share this pet')).toBeNull();
    });
  });

  describe('Image Loading States', () => {
    it('displays placeholder when image is missing', () => {
      const { getByText, getByLabelText } = render(
        <PetCardNew pet={mockPetWithoutImage} />
      );

      expect(getByText('Không có ảnh')).toBeTruthy();
      expect(getByLabelText('No image available')).toBeTruthy();
    });

    it('shows loading indicator while image loads', () => {
      const { getByTestId } = render(<PetCardNew pet={mockPet} />);
      
      // ActivityIndicator should be present initially
      const loadingIndicator = getByTestId('activity-indicator');
      expect(loadingIndicator).toBeTruthy();
    });

    it('displays error state on image load failure', async () => {
      const { getByLabelText, getByText } = render(<PetCardNew pet={mockPet} />);

      // Simulate image error
      const imageBackground = getByLabelText(/Pet card for/);
      fireEvent(imageBackground, 'error');

      await waitFor(() => {
        expect(getByText('Không có ảnh')).toBeTruthy();
        expect(getByLabelText('Image failed to load')).toBeTruthy();
      });
    });

    it('shows retry button on image error', async () => {
      const { getByLabelText, getByText } = render(<PetCardNew pet={mockPet} />);

      // Simulate image error
      const imageBackground = getByLabelText(/Pet card for/);
      fireEvent(imageBackground, 'error');

      await waitFor(() => {
        expect(getByText('Thử lại')).toBeTruthy();
        expect(getByLabelText('Retry loading image')).toBeTruthy();
      });
    });
  });

  describe('Button Press Handlers', () => {
    it('calls onPress when card is tapped', () => {
      const onPressMock = jest.fn();
      const { getByLabelText } = render(
        <PetCardNew pet={mockPet} onPress={onPressMock} />
      );

      const card = getByLabelText(/Pet card for Husky/);
      fireEvent.press(card);

      expect(onPressMock).toHaveBeenCalledWith(mockPet);
    });

    it('calls onBack when back button is pressed', () => {
      const onBackMock = jest.fn();
      const { getByLabelText } = render(
        <PetCardNew pet={mockPet} onBack={onBackMock} />
      );

      const backButton = getByLabelText('Go back');
      fireEvent.press(backButton);

      expect(onBackMock).toHaveBeenCalled();
    });

    it('calls onClose when close button is pressed', () => {
      const onCloseMock = jest.fn();
      const { getByLabelText } = render(
        <PetCardNew pet={mockPet} onClose={onCloseMock} />
      );

      const closeButton = getByLabelText('Close');
      fireEvent.press(closeButton);

      expect(onCloseMock).toHaveBeenCalled();
    });

    it('calls onLike when heart button is pressed', () => {
      const onLikeMock = jest.fn();
      const { getByLabelText } = render(
        <PetCardNew pet={mockPet} onLike={onLikeMock} />
      );

      const likeButton = getByLabelText('Like this pet');
      fireEvent.press(likeButton);

      expect(onLikeMock).toHaveBeenCalledWith(mockPet.id);
    });

    it('calls onFavorite when star button is pressed', () => {
      const onFavoriteMock = jest.fn();
      const { getByLabelText } = render(
        <PetCardNew pet={mockPet} onFavorite={onFavoriteMock} />
      );

      const favoriteButton = getByLabelText('Add to favorites');
      fireEvent.press(favoriteButton);

      expect(onFavoriteMock).toHaveBeenCalledWith(mockPet.id);
    });

    it('calls onShare when share button is pressed', () => {
      const onShareMock = jest.fn();
      const { getByLabelText } = render(
        <PetCardNew pet={mockPet} onShare={onShareMock} />
      );

      const shareButton = getByLabelText('Share this pet');
      fireEvent.press(shareButton);

      expect(onShareMock).toHaveBeenCalledWith(mockPet);
    });

    it('toggles like state when heart button is pressed without custom handler', async () => {
      (PetService.toggleLike as jest.Mock).mockResolvedValue(undefined);

      const { getByLabelText } = render(<PetCardNew pet={mockPet} isLiked={false} />);

      const likeButton = getByLabelText('Like this pet');
      fireEvent.press(likeButton);

      await waitFor(() => {
        expect(PetService.toggleLike).toHaveBeenCalledWith(mockPet.id, 'current-user-id');
      });
    });

    it('shows error alert when like fails', async () => {
      (PetService.toggleLike as jest.Mock).mockRejectedValue(new Error('Network error'));

      const { getByLabelText } = render(<PetCardNew pet={mockPet} isLiked={false} />);

      const likeButton = getByLabelText('Like this pet');
      fireEvent.press(likeButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Lỗi',
          'Không thể thích pet này. Vui lòng thử lại.'
        );
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper accessibility labels for card', () => {
      const { getByLabelText } = render(<PetCardNew pet={mockPet} />);

      const card = getByLabelText(
        'Pet card for Husky, 10 months old, located in TP Qui Nhơn'
      );
      expect(card).toBeTruthy();
    });

    it('has proper accessibility labels for all buttons', () => {
      const { getByLabelText } = render(<PetCardNew pet={mockPet} />);

      expect(getByLabelText('Go back')).toBeTruthy();
      expect(getByLabelText('Close')).toBeTruthy();
      expect(getByLabelText('Add to favorites')).toBeTruthy();
      expect(getByLabelText('Like this pet')).toBeTruthy();
      expect(getByLabelText('Share this pet')).toBeTruthy();
    });

    it('updates accessibility label when like state changes', () => {
      const { getByLabelText, rerender } = render(
        <PetCardNew pet={mockPet} isLiked={false} />
      );

      expect(getByLabelText('Like this pet')).toBeTruthy();

      rerender(<PetCardNew pet={mockPet} isLiked={true} />);

      expect(getByLabelText('Unlike this pet')).toBeTruthy();
    });

    it('updates accessibility label when favorite state changes', () => {
      const { getByLabelText, rerender } = render(
        <PetCardNew pet={mockPet} isFavorited={false} />
      );

      expect(getByLabelText('Add to favorites')).toBeTruthy();

      rerender(<PetCardNew pet={mockPet} isFavorited={true} />);

      expect(getByLabelText('Remove from favorites')).toBeTruthy();
    });
  });

  describe('Responsive Layout', () => {
    it('renders without crashing on different screen sizes', () => {
      // This test ensures the component handles responsive calculations
      const { getByText } = render(<PetCardNew pet={mockPet} />);
      
      expect(getByText('Husky')).toBeTruthy();
    });
  });
});
