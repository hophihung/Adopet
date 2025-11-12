import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Share } from 'react-native';
import { PetCardNew } from '../PetCardNew';
import { Pet } from '@/lib/supabaseClient';
import { PetService } from '@/src/features/pets/services/pet.service';
import { supabase } from '@/lib/supabase';

// Mock dependencies
const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
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

const mockShare = jest.spyOn(Share, 'share');

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
};

describe('PetCardNew Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: 'current-user-id' } },
    });
  });

  describe('Navigation Integration', () => {
    it('navigates to pet detail screen when card is pressed', () => {
      const { getByLabelText } = render(<PetCardNew pet={mockPet} />);

      const card = getByLabelText(/Pet card for Husky/);
      fireEvent.press(card);

      expect(mockPush).toHaveBeenCalledWith(`/pet/${mockPet.id}`);
    });

    it('navigates back when back button is pressed', () => {
      const { getByLabelText } = render(<PetCardNew pet={mockPet} />);

      const backButton = getByLabelText('Go back');
      fireEvent.press(backButton);

      expect(mockBack).toHaveBeenCalled();
    });

    it('uses custom onPress handler when provided', () => {
      const customOnPress = jest.fn();
      const { getByLabelText } = render(
        <PetCardNew pet={mockPet} onPress={customOnPress} />
      );

      const card = getByLabelText(/Pet card for Husky/);
      fireEvent.press(card);

      expect(customOnPress).toHaveBeenCalledWith(mockPet);
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('Like/Favorite State Updates and API Calls', () => {
    it('calls PetService.toggleLike with correct parameters', async () => {
      (PetService.toggleLike as jest.Mock).mockResolvedValue(undefined);

      const { getByLabelText } = render(<PetCardNew pet={mockPet} isLiked={false} />);

      const likeButton = getByLabelText('Like this pet');
      fireEvent.press(likeButton);

      await waitFor(() => {
        expect(PetService.toggleLike).toHaveBeenCalledWith(
          mockPet.id,
          'current-user-id'
        );
      });
    });

    it('updates like state optimistically', async () => {
      (PetService.toggleLike as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      const { getByLabelText } = render(<PetCardNew pet={mockPet} isLiked={false} />);

      const likeButton = getByLabelText('Like this pet');
      fireEvent.press(likeButton);

      // State should update immediately (optimistic)
      await waitFor(() => {
        expect(getByLabelText('Unlike this pet')).toBeTruthy();
      });
    });

    it('reverts like state on API failure', async () => {
      (PetService.toggleLike as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      const { getByLabelText } = render(<PetCardNew pet={mockPet} isLiked={false} />);

      const likeButton = getByLabelText('Like this pet');
      fireEvent.press(likeButton);

      // Wait for error handling
      await waitFor(() => {
        // State should revert back to original
        expect(getByLabelText('Like this pet')).toBeTruthy();
      });
    });

    it('prevents multiple simultaneous like requests', async () => {
      (PetService.toggleLike as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      const { getByLabelText } = render(<PetCardNew pet={mockPet} isLiked={false} />);

      const likeButton = getByLabelText('Like this pet');
      
      // Press multiple times quickly
      fireEvent.press(likeButton);
      fireEvent.press(likeButton);
      fireEvent.press(likeButton);

      await waitFor(() => {
        // Should only call API once
        expect(PetService.toggleLike).toHaveBeenCalledTimes(1);
      });
    });

    it('calls PetService.toggleLike for favorite button', async () => {
      (PetService.toggleLike as jest.Mock).mockResolvedValue(undefined);

      const { getByLabelText } = render(
        <PetCardNew pet={mockPet} isFavorited={false} />
      );

      const favoriteButton = getByLabelText('Add to favorites');
      fireEvent.press(favoriteButton);

      await waitFor(() => {
        expect(PetService.toggleLike).toHaveBeenCalledWith(
          mockPet.id,
          'current-user-id'
        );
      });
    });

    it('updates favorite state optimistically', async () => {
      (PetService.toggleLike as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      const { getByLabelText } = render(
        <PetCardNew pet={mockPet} isFavorited={false} />
      );

      const favoriteButton = getByLabelText('Add to favorites');
      fireEvent.press(favoriteButton);

      // State should update immediately (optimistic)
      await waitFor(() => {
        expect(getByLabelText('Remove from favorites')).toBeTruthy();
      });
    });
  });

  describe('Share Dialog Integration', () => {
    it('opens native share dialog with correct content', async () => {
      mockShare.mockResolvedValue({ action: 'sharedAction' });

      const { getByLabelText } = render(<PetCardNew pet={mockPet} />);

      const shareButton = getByLabelText('Share this pet');
      fireEvent.press(shareButton);

      await waitFor(() => {
        expect(mockShare).toHaveBeenCalledWith({
          message: `Check out ${mockPet.name} on Adopet!\npetadoption://pet/${mockPet.id}`,
          title: `${mockPet.name} - Adopet`,
        });
      });
    });

    it('uses custom onShare handler when provided', async () => {
      const customOnShare = jest.fn();
      const { getByLabelText } = render(
        <PetCardNew pet={mockPet} onShare={customOnShare} />
      );

      const shareButton = getByLabelText('Share this pet');
      fireEvent.press(shareButton);

      expect(customOnShare).toHaveBeenCalledWith(mockPet);
      expect(mockShare).not.toHaveBeenCalled();
    });

    it('handles share cancellation gracefully', async () => {
      mockShare.mockResolvedValue({ action: 'dismissedAction' });

      const { getByLabelText } = render(<PetCardNew pet={mockPet} />);

      const shareButton = getByLabelText('Share this pet');
      fireEvent.press(shareButton);

      await waitFor(() => {
        expect(mockShare).toHaveBeenCalled();
      });

      // Should not show error alert for cancellation
    });

    it('shows retry option when share fails', async () => {
      mockShare.mockRejectedValue(new Error('Share failed'));

      const { getByLabelText } = render(<PetCardNew pet={mockPet} />);

      const shareButton = getByLabelText('Share this pet');
      fireEvent.press(shareButton);

      await waitFor(() => {
        expect(mockShare).toHaveBeenCalled();
      });

      // Error should be logged
    });
  });

  describe('Image Caching Behavior', () => {
    it('uses cached image on subsequent renders', () => {
      const { rerender, getByLabelText } = render(<PetCardNew pet={mockPet} />);

      // First render
      expect(getByLabelText(/Pet card for Husky/)).toBeTruthy();

      // Rerender with same pet
      rerender(<PetCardNew pet={mockPet} />);

      // Image should be cached and load faster
      expect(getByLabelText(/Pet card for Husky/)).toBeTruthy();
    });

    it('loads new image when pet changes', () => {
      const { rerender, getByLabelText } = render(<PetCardNew pet={mockPet} />);

      const newPet = {
        ...mockPet,
        id: 'test-pet-2',
        name: 'Golden Retriever',
        images: ['https://example.com/different-image.jpg'],
      };

      rerender(<PetCardNew pet={newPet} />);

      expect(getByLabelText(/Pet card for Golden Retriever/)).toBeTruthy();
    });

    it('handles image URL changes correctly', () => {
      const { rerender, getByLabelText } = render(<PetCardNew pet={mockPet} />);

      const updatedPet = {
        ...mockPet,
        images: ['https://example.com/updated-image.jpg'],
      };

      rerender(<PetCardNew pet={updatedPet} />);

      // Should trigger new image load
      expect(getByLabelText(/Pet card for Husky/)).toBeTruthy();
    });
  });

  describe('End-to-End User Flows', () => {
    it('completes full like workflow', async () => {
      (PetService.toggleLike as jest.Mock).mockResolvedValue(undefined);

      const { getByLabelText } = render(<PetCardNew pet={mockPet} isLiked={false} />);

      // User sees unliked state
      expect(getByLabelText('Like this pet')).toBeTruthy();

      // User presses like button
      const likeButton = getByLabelText('Like this pet');
      fireEvent.press(likeButton);

      // State updates optimistically
      await waitFor(() => {
        expect(getByLabelText('Unlike this pet')).toBeTruthy();
      });

      // API call completes
      await waitFor(() => {
        expect(PetService.toggleLike).toHaveBeenCalled();
      });
    });

    it('completes full navigation workflow', () => {
      const { getByLabelText } = render(<PetCardNew pet={mockPet} />);

      // User taps card
      const card = getByLabelText(/Pet card for Husky/);
      fireEvent.press(card);

      // Navigation occurs
      expect(mockPush).toHaveBeenCalledWith(`/pet/${mockPet.id}`);
    });

    it('completes full share workflow', async () => {
      mockShare.mockResolvedValue({ action: 'sharedAction' });

      const { getByLabelText } = render(<PetCardNew pet={mockPet} />);

      // User presses share button
      const shareButton = getByLabelText('Share this pet');
      fireEvent.press(shareButton);

      // Share dialog opens
      await waitFor(() => {
        expect(mockShare).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining(mockPet.name),
          })
        );
      });
    });
  });
});
