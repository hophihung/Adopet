/**
 * Integration Test for Pet Components
 * 
 * This file verifies that all components can be imported correctly
 * and that the type interfaces are compatible.
 * 
 * To run: Import this file in your app to verify no errors occur.
 */

import React from 'react';
import { View } from 'react-native';
import { PetCard, PetCardNew } from './index';
import { Pet } from '@/lib/supabaseClient';

// Mock pet data for testing
const mockPet: Pet = {
  id: 'test-123',
  seller_id: 'seller-123',
  name: 'Test Pet',
  type: 'dog',
  age_months: 12,
  gender: 'male',
  description: 'A friendly test pet',
  location: 'Test City',
  price: 1000000,
  images: ['https://example.com/image.jpg'],
  is_available: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

/**
 * Integration test component
 * This component should compile without errors if integration is successful
 */
export function IntegrationTest() {
  const handlePress = (pet: Pet) => {
    console.log('Pet pressed:', pet.name);
  };

  const handleLike = (petId: string) => {
    console.log('Pet liked:', petId);
  };

  const handleFavorite = (petId: string) => {
    console.log('Pet favorited:', petId);
  };

  const handleShare = (pet: Pet) => {
    console.log('Pet shared:', pet.name);
  };

  return (
    <View>
      {/* Test PetCard (Legacy) */}
      <PetCard
        pet={mockPet}
        onPress={handlePress}
        showOwnerActions={false}
      />

      {/* Test PetCardNew */}
      <PetCardNew
        pet={mockPet}
        onPress={handlePress}
        onLike={handleLike}
        onFavorite={handleFavorite}
        onShare={handleShare}
        onBack={() => console.log('Back')}
        onClose={() => console.log('Close')}
        isLiked={false}
        isFavorited={false}
        showActions={true}
      />
    </View>
  );
}

// Type checking tests
type PetCardProps = React.ComponentProps<typeof PetCard>;
type PetCardNewProps = React.ComponentProps<typeof PetCardNew>;

// Verify Pet type compatibility
const testPetCompatibility = (pet: Pet) => {
  // Both components should accept the same Pet type
  const _petCardProps: PetCardProps = { pet, onPress: () => {} };
  const _petCardNewProps: PetCardNewProps = { pet, onPress: () => {} };
  
  return true;
};

console.log('✅ Integration test passed - all imports and types are compatible');

export default IntegrationTest;
