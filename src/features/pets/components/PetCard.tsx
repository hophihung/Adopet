import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
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
    backgroundColor: colors.surface,
    borderRadius: 20,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
    height: 220,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
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
  statusBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  availableBadge: {
    backgroundColor: colors.success,
  },
  unavailableBadge: {
    backgroundColor: colors.error,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  priceBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  priceText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  infoContainer: {
    padding: 20,
  },
  petName: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 8,
  },
  petType: {
    fontSize: 15,
    color: colors.primary,
    textTransform: 'capitalize',
    fontWeight: '700',
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  petAge: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  petGender: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 6,
    fontWeight: '500',
  },
  petLocation: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 10,
    fontWeight: '500',
  },
  petDescription: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 22,
    fontWeight: '400',
  },
  ownerInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  ownerText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  ownerActions: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  hideButton: {
    backgroundColor: colors.error,
  },
  showButton: {
    backgroundColor: colors.success,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
