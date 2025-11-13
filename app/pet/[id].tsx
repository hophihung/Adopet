import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { PetService } from '../../src/features/pets/services/pet.service';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, Edit2, Heart, MapPin, Calendar, DollarSign, MessageCircle, Scale, Palette, Activity, Shield, Syringe, Users, Baby, Zap, AlertCircle, Phone, Mail } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const PET_TYPE_LABELS: Record<string, string> = {
  dog: 'Chó',
  cat: 'Mèo',
  hamster: 'Hamster',
  bird: 'Chim',
  rabbit: 'Thỏ',
  other: 'Khác',
};

const GENDER_LABELS: Record<string, string> = {
  male: 'Đực',
  female: 'Cái',
  unknown: 'Không xác định',
};

const SIZE_LABELS: Record<string, string> = {
  small: 'Nhỏ',
  medium: 'Vừa',
  large: 'Lớn',
  extra_large: 'Rất lớn',
};

const ENERGY_LABELS: Record<string, string> = {
  low: 'Thấp',
  medium: 'Vừa',
  high: 'Cao',
};

const HEALTH_STATUS_LABELS: Record<string, string> = {
  healthy: 'Khỏe mạnh',
  vaccinated: 'Đã tiêm phòng',
  sick: 'Đang bệnh',
  needs_attention: 'Cần chú ý',
};

const VACCINATION_STATUS_LABELS: Record<string, string> = {
  up_to_date: 'Đầy đủ',
  partial: 'Một phần',
  not_vaccinated: 'Chưa tiêm',
  unknown: 'Không rõ',
};

export default function PetDetailScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  
  const [pet, setPet] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!id) return;

    const loadPet = async () => {
      try {
        setIsLoading(true);
        const petData = await PetService.getPetById(id);
        
        // Parse images if it's a string
        let parsedImages: string[] = [];
        if (Array.isArray(petData.images)) {
          parsedImages = petData.images;
        } else if (typeof petData.images === 'string') {
          try {
            parsedImages = JSON.parse(petData.images);
          } catch {
            // If parse fails, try to use as single image URL
            parsedImages = petData.images ? [petData.images] : [];
          }
        }
        
        const parsedPet = {
          ...petData,
          images: parsedImages,
        };
        
        setPet(parsedPet);
        
        // Check if pet is already liked by user
        if (user?.id) {
          const liked = await PetService.isPetLikedByUser(id, user.id);
          setIsLiked(liked);
        }
      } catch (error) {
        console.error('Error loading pet:', error);
        Alert.alert('Lỗi', 'Không thể tải thông tin pet');
        router.back();
      } finally {
        setIsLoading(false);
      }
    };

    loadPet();
  }, [id, user?.id]);

  const handleEdit = () => {
    if (pet && user?.id === pet.seller_id) {
      router.push(`/edit-pet/${pet.id}`);
    } else {
      Alert.alert('Lỗi', 'Bạn không có quyền chỉnh sửa pet này');
    }
  };

  const handleContactSeller = async () => {
    if (!user?.id) {
      Alert.alert('Thông báo', 'Vui lòng đăng nhập để liên hệ người bán');
      return;
    }

    if (!pet) return;

    try {
      setIsLiking(true);
      
      // Like pet (this will create conversation automatically via trigger)
      const result = await PetService.toggleLike(pet.id, user.id);
      
      if (result.liked) {
        setIsLiked(true);
        Alert.alert(
          'Thành công',
          'Đã quan tâm pet này! Bạn có thể xem cuộc trò chuyện trong phần Tin nhắn.',
          [
            { text: 'Xem tin nhắn', onPress: () => router.push('/(tabs)/social/chat') },
            { text: 'OK' }
          ]
        );
      } else {
        setIsLiked(false);
        Alert.alert('Thông báo', 'Đã bỏ quan tâm pet này');
      }
    } catch (error) {
      console.error('Error liking pet:', error);
      Alert.alert('Lỗi', 'Không thể quan tâm pet. Vui lòng thử lại.');
    } finally {
      setIsLiking(false);
    }
  };

  const handleImageScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / SCREEN_WIDTH);
    setCurrentImageIndex(index);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF5A75" />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  if (!pet) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Không tìm thấy pet</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isOwner = user?.id === pet.seller_id;
  const images = pet.images || [];
  const hasMultipleImages = images.length > 1;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButtonHeader}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        {isOwner && (
          <TouchableOpacity onPress={handleEdit} style={styles.editButton}>
            <Edit2 size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {/* Image Carousel */}
        <View style={styles.imageContainer}>
          {images.length > 0 ? (
            <>
              <ScrollView
                ref={scrollViewRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={handleImageScroll}
                style={styles.imageScrollView}
              >
                {images.map((image: string, index: number) => (
                  <Image
                    key={index}
                    source={{ uri: image }}
                    style={styles.petImage}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>
              
              {hasMultipleImages && (
                <View style={styles.imageIndicators}>
                  {images.map((_: any, index: number) => (
                    <View
                      key={index}
                      style={[
                        styles.indicator,
                        currentImageIndex === index && styles.indicatorActive,
                      ]}
                    />
                  ))}
                </View>
              )}
            </>
          ) : (
            <View style={styles.placeholderImage}>
              <Text style={styles.placeholderText}>Không có ảnh</Text>
            </View>
          )}
        </View>

        {/* Pet Info */}
        <View style={styles.content}>
          {/* Name and Type */}
          <View style={styles.titleSection}>
            <Text style={styles.petName}>{pet.name}</Text>
            <View style={styles.badgeContainer}>
              <View style={styles.typeBadge}>
                <Text style={styles.typeBadgeText}>
                  {PET_TYPE_LABELS[pet.type] || pet.type}
                </Text>
              </View>
              {pet.is_available ? (
                <View style={[styles.statusBadge, styles.availableBadge]}>
                  <Text style={styles.statusBadgeText}>Có sẵn</Text>
                </View>
              ) : (
                <View style={[styles.statusBadge, styles.unavailableBadge]}>
                  <Text style={styles.statusBadgeText}>Đã bán</Text>
                </View>
              )}
            </View>
          </View>

          {/* Price */}
          {pet.price && pet.price > 0 ? (
            <View style={styles.priceSection}>
              <DollarSign size={20} color="#FF5A75" />
              <Text style={styles.priceText}>
                {pet.price.toLocaleString('vi-VN')} VND
              </Text>
            </View>
          ) : (
            <View style={styles.priceSection}>
              <Text style={styles.freeText}>Miễn phí</Text>
            </View>
          )}

          {/* Details Grid */}
          <View style={styles.detailsGrid}>
            {pet.age_months && (
              <View style={styles.detailItem}>
                <Calendar size={18} color="#666" />
                <Text style={styles.detailLabel}>Tuổi</Text>
                <Text style={styles.detailValue}>
                  {Math.floor(pet.age_months / 12)} tuổi
                  {pet.age_months % 12 > 0 && ` ${pet.age_months % 12} tháng`}
                </Text>
              </View>
            )}
            
            {pet.gender && (
              <View style={styles.detailItem}>
                <Heart size={18} color="#666" />
                <Text style={styles.detailLabel}>Giới tính</Text>
                <Text style={styles.detailValue}>
                  {GENDER_LABELS[pet.gender] || pet.gender}
                </Text>
              </View>
            )}
            
            {pet.breed && (
              <View style={styles.detailItem}>
                <Activity size={18} color="#666" />
                <Text style={styles.detailLabel}>Giống</Text>
                <Text style={styles.detailValue}>{pet.breed}</Text>
              </View>
            )}

            {pet.weight_kg && (
              <View style={styles.detailItem}>
                <Scale size={18} color="#666" />
                <Text style={styles.detailLabel}>Cân nặng</Text>
                <Text style={styles.detailValue}>{pet.weight_kg} kg</Text>
              </View>
            )}

            {pet.color && (
              <View style={styles.detailItem}>
                <Palette size={18} color="#666" />
                <Text style={styles.detailLabel}>Màu sắc</Text>
                <Text style={styles.detailValue}>{pet.color}</Text>
              </View>
            )}

            {pet.size && (
              <View style={styles.detailItem}>
                <Activity size={18} color="#666" />
                <Text style={styles.detailLabel}>Kích thước</Text>
                <Text style={styles.detailValue}>
                  {SIZE_LABELS[pet.size] || pet.size}
                </Text>
              </View>
            )}

            {pet.energy_level && (
              <View style={styles.detailItem}>
                <Zap size={18} color="#666" />
                <Text style={styles.detailLabel}>Mức năng lượng</Text>
                <Text style={styles.detailValue}>
                  {ENERGY_LABELS[pet.energy_level] || pet.energy_level}
                </Text>
              </View>
            )}
            
            {pet.location && (
              <View style={styles.detailItem}>
                <MapPin size={18} color="#666" />
                <Text style={styles.detailLabel}>Địa điểm</Text>
                <Text style={styles.detailValue}>{pet.location}</Text>
              </View>
            )}
          </View>

          {/* Health & Vaccination Status */}
          {(pet.health_status || pet.vaccination_status) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tình trạng sức khỏe</Text>
              <View style={styles.detailsGrid}>
                {pet.health_status && (
                  <View style={styles.detailItem}>
                    <Shield size={18} color="#666" />
                    <Text style={styles.detailLabel}>Sức khỏe</Text>
                    <Text style={styles.detailValue}>
                      {HEALTH_STATUS_LABELS[pet.health_status] || pet.health_status}
                    </Text>
                  </View>
                )}
                {pet.vaccination_status && (
                  <View style={styles.detailItem}>
                    <Syringe size={18} color="#666" />
                    <Text style={styles.detailLabel}>Tiêm phòng</Text>
                    <Text style={styles.detailValue}>
                      {VACCINATION_STATUS_LABELS[pet.vaccination_status] || pet.vaccination_status}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Characteristics */}
          {(pet.spayed_neutered !== null || pet.microchipped !== null || pet.house_trained !== null || pet.good_with_kids !== null || pet.good_with_pets !== null) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Đặc điểm</Text>
              <View style={styles.characteristicsContainer}>
                {pet.spayed_neutered && (
                  <View style={styles.characteristicBadge}>
                    <Text style={styles.characteristicText}>✓ Đã triệt sản</Text>
                  </View>
                )}
                {pet.microchipped && (
                  <View style={styles.characteristicBadge}>
                    <Text style={styles.characteristicText}>✓ Có chip</Text>
                  </View>
                )}
                {pet.house_trained && (
                  <View style={styles.characteristicBadge}>
                    <Text style={styles.characteristicText}>✓ Biết đi vệ sinh</Text>
                  </View>
                )}
                {pet.good_with_kids && (
                  <View style={styles.characteristicBadge}>
                    <Baby size={14} color="#4CD964" />
                    <Text style={styles.characteristicText}>Thân thiện trẻ em</Text>
                  </View>
                )}
                {pet.good_with_pets && (
                  <View style={styles.characteristicBadge}>
                    <Users size={14} color="#4CD964" />
                    <Text style={styles.characteristicText}>Thân thiện thú cưng khác</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Special Needs */}
          {pet.special_needs && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Nhu cầu đặc biệt</Text>
              <View style={styles.specialNeedsContainer}>
                <AlertCircle size={18} color="#FF9500" />
                <Text style={styles.specialNeedsText}>{pet.special_needs}</Text>
              </View>
            </View>
          )}

          {/* Contact Info */}
          {(pet.contact_phone || pet.contact_email) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Thông tin liên hệ</Text>
              <View style={styles.contactContainer}>
                {pet.contact_phone && (
                  <View style={styles.contactItem}>
                    <Phone size={18} color="#666" />
                    <Text style={styles.contactText}>{pet.contact_phone}</Text>
                  </View>
                )}
                {pet.contact_email && (
                  <View style={styles.contactItem}>
                    <Mail size={18} color="#666" />
                    <Text style={styles.contactText}>{pet.contact_email}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Description */}
          {pet.description && (
            <View style={styles.descriptionSection}>
              <Text style={styles.sectionTitle}>Mô tả</Text>
              <Text style={styles.descriptionText}>{pet.description}</Text>
            </View>
          )}

          {/* Seller Info */}
          {pet.profiles && (
            <View style={styles.sellerSection}>
              <Text style={styles.sectionTitle}>Người bán</Text>
              <View style={styles.sellerInfo}>
                {pet.profiles.avatar_url && (
                  <Image
                    source={{ uri: pet.profiles.avatar_url }}
                    style={styles.sellerAvatar}
                  />
                )}
                <View style={styles.sellerDetails}>
                  <Text style={styles.sellerName}>
                    {pet.profiles.full_name || 'Người dùng'}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Action Buttons */}
          {!isOwner && pet.is_available && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.contactButton, isLiked && styles.contactButtonLiked]}
                onPress={handleContactSeller}
                disabled={isLiking}
              >
                {isLiking ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : isLiked ? (
                  <Heart size={20} color="#fff" fill="#fff" />
                ) : (
                  <MessageCircle size={20} color="#fff" />
                )}
                <Text style={styles.contactButtonText}>
                  {isLiked ? 'Đã quan tâm' : 'Liên hệ người bán'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#fff',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: '#FF5A75',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'transparent',
  },
  backButtonHeader: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    backgroundColor: '#000',
    position: 'relative',
  },
  imageScrollView: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
  },
  petImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
  },
  placeholderImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 16,
    color: '#999',
  },
  imageIndicators: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  indicatorActive: {
    backgroundColor: '#fff',
    width: 24,
  },
  content: {
    padding: 16,
  },
  titleSection: {
    marginBottom: 16,
  },
  petName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  typeBadge: {
    backgroundColor: '#FF5A75',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  typeBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  availableBadge: {
    backgroundColor: '#4CD964',
  },
  unavailableBadge: {
    backgroundColor: '#FF3B30',
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  priceSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  priceText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FF5A75',
  },
  freeText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#4CD964',
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  detailItem: {
    flex: 1,
    minWidth: '45%',
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  descriptionSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  sellerSection: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
  },
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sellerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e0e0e0',
  },
  sellerDetails: {
    flex: 1,
  },
  sellerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  actionButtons: {
    marginTop: 8,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF5A75',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  contactButtonLiked: {
    backgroundColor: '#4CD964',
  },
  contactButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  characteristicsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  characteristicBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  characteristicText: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '600',
  },
  specialNeedsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 12,
  },
  specialNeedsText: {
    flex: 1,
    fontSize: 14,
    color: '#E65100',
    lineHeight: 20,
  },
  contactContainer: {
    gap: 12,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
  },
  contactText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
});
