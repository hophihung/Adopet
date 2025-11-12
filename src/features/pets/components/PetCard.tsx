import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Pet } from '@/lib/supabaseClient';
import { colors } from '@/src/theme/colors';

interface PetCardProps {
  pet: Pet & {
    profiles?: {
      id: string;
      full_name: string;
      avatar_url: string;
    };
  };
  onPress?: (pet: Pet) => void;
}

export function PetCard({ 
  pet, 
  onPress,
}: PetCardProps) {
  const handlePress = () => {
    if (onPress) {
      onPress(pet);
    }
  };

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={handlePress}
      activeOpacity={0.9}
    >
      {pet.images && pet.images.length > 0 ? (
        <Image 
          source={{ uri: pet.images[0] }} 
          style={styles.image}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.placeholderImage}>
          <Text style={styles.placeholderText}>No Image</Text>
        </View>
      )}
      
      {/* Gradient Overlay */}
      <View style={styles.gradientOverlay} />
      
      {/* Status Badge */}
      <View style={[
        styles.statusBadge,
        pet.is_available ? styles.availableBadge : styles.unavailableBadge
      ]}>
        <Text style={styles.statusText}>
          {pet.is_available ? '● Có hoạt động gần đây' : '● Không hoạt động'}
        </Text>
      </View>

      {/* Pet Info Overlay */}
      <View style={styles.infoOverlay}>
        <Text style={styles.petName}>
          {`${pet.name}${pet.age_months ? ` ${pet.age_months} tháng` : ''}`}
        </Text>
        
        {pet.profiles && (
          <View style={styles.locationRow}>
            <Text style={styles.locationIcon}>🏠</Text>
            <Text style={styles.locationText}>{`Sống tại ${pet.location || 'Hà Nội'}`}</Text>
          </View>
        )}
        
        <View style={styles.locationRow}>
          <Text style={styles.locationIcon}>📍</Text>
          <Text style={styles.locationText}>Cách xa 2 km</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    height: 600,
    borderRadius: 24,
    marginHorizontal: 16,
    marginVertical: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  image: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: colors.textTertiary,
    fontSize: 16,
    fontWeight: '500',
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'transparent',
    backgroundImage: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.8))',
  },
  statusBadge: {
    position: 'absolute',
    top: 20,
    left: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  availableBadge: {
    backgroundColor: 'rgba(76, 217, 100, 0.9)',
  },
  unavailableBadge: {
    backgroundColor: 'rgba(255, 59, 48, 0.9)',
  },
  statusText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  infoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingBottom: 32,
  },
  petName: {
    fontSize: 36,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  locationText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
