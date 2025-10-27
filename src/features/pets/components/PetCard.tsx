import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import { Pet } from '@/lib/supabaseClient';

interface PetCardProps {
  pet: Pet & {
    profiles?: {
      id: string;
      full_name: string;
      avatar_url: string;
    };
  };
  onPress?: (pet: Pet) => void;
  onToggleAvailability?: (petId: string) => void;
  showOwnerActions?: boolean;
}

export function PetCard({ 
  pet, 
  onPress, 
  onToggleAvailability,
  showOwnerActions = false 
}: PetCardProps) {
  const handlePress = () => {
    if (onPress) {
      onPress(pet);
    }
  };

  const handleToggleAvailability = () => {
    if (onToggleAvailability) {
      Alert.alert(
        'Thay đổi trạng thái',
        `Bạn có chắc muốn ${pet.is_available ? 'ẩn' : 'hiển thị'} pet này?`,
        [
          { text: 'Hủy', style: 'cancel' },
          { 
            text: 'Xác nhận', 
            onPress: () => onToggleAvailability(pet.id),
            style: pet.is_available ? 'destructive' : 'default'
          }
        ]
      );
    }
  };

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {/* Pet Images */}
      <View style={styles.imageContainer}>
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
        
        {/* Status Badge */}
        <View style={[
          styles.statusBadge,
          pet.is_available ? styles.availableBadge : styles.unavailableBadge
        ]}>
          <Text style={styles.statusText}>
            {pet.is_available ? 'Có sẵn' : 'Đã bán'}
          </Text>
        </View>

        {/* Price Badge */}
        {pet.price && pet.price > 0 && (
          <View style={styles.priceBadge}>
            <Text style={styles.priceText}>
              {pet.price.toLocaleString('vi-VN')}đ
            </Text>
          </View>
        )}
      </View>

      {/* Pet Info */}
      <View style={styles.infoContainer}>
        <Text style={styles.petName}>{pet.name}</Text>
        
        <View style={styles.detailsRow}>
          <Text style={styles.petType}>{pet.type}</Text>
          {pet.age_months && (
            <Text style={styles.petAge}>
              {pet.age_months} tháng
            </Text>
          )}
        </View>

        {pet.gender && (
          <Text style={styles.petGender}>
            {pet.gender === 'male' ? 'Đực' : pet.gender === 'female' ? 'Cái' : 'Không xác định'}
          </Text>
        )}

        {pet.location && (
          <Text style={styles.petLocation}>📍 {pet.location}</Text>
        )}

        {pet.description && (
          <Text style={styles.petDescription} numberOfLines={2}>
            {pet.description}
          </Text>
        )}

        {/* Owner Info */}
        {pet.profiles && (
          <View style={styles.ownerInfo}>
            <Text style={styles.ownerText}>
              Chủ: {pet.profiles.full_name}
            </Text>
          </View>
        )}

        {/* Owner Actions */}
        {showOwnerActions && (
          <View style={styles.ownerActions}>
            <TouchableOpacity 
              style={[
                styles.actionButton,
                pet.is_available ? styles.hideButton : styles.showButton
              ]}
              onPress={handleToggleAvailability}
            >
              <Text style={styles.actionButtonText}>
                {pet.is_available ? 'Ẩn' : 'Hiển thị'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageContainer: {
    position: 'relative',
    height: 200,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#999',
    fontSize: 16,
  },
  statusBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  availableBadge: {
    backgroundColor: '#34C759',
  },
  unavailableBadge: {
    backgroundColor: '#FF3B30',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  priceBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priceText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  infoContainer: {
    padding: 16,
  },
  petName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  petType: {
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
  },
  petAge: {
    fontSize: 14,
    color: '#666',
  },
  petGender: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  petLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  petDescription: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  ownerInfo: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  ownerText: {
    fontSize: 14,
    color: '#666',
  },
  ownerActions: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  hideButton: {
    backgroundColor: '#FF3B30',
  },
  showButton: {
    backgroundColor: '#34C759',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
