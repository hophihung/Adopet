import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Heart, X, RotateCcw, Star, Send, PawPrint, Video, Home, MapPin } from 'lucide-react-native';
import { useRouter, usePathname } from 'expo-router';
import Swiper from 'react-native-deck-swiper';
import { PetService } from '@/src/features/pets/services/pet.service';
import { colors } from '@/src/theme/colors';
import { PetCardNew } from '@/src/features/pets/components';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Pet {
  id: string;
  name: string;
  type: string;
  age_months?: number;
  breed?: string;
  location?: string;
  description?: string;
  price?: number;
  images: string[];
  seller_id: string;
  is_available: boolean;
  like_count: number;
  view_count: number;
  profiles?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  energy_level?: string;
  size?: string;
  distance_km?: number;
}

// Feature flag to toggle between old and new card design
const USE_NEW_CARD_DESIGN = true;

export default function MatchScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [imageIndices, setImageIndices] = useState<{ [key: string]: number }>({});
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedPets, setLikedPets] = useState<Set<string>>(new Set());
  const [activeTopTab, setActiveTopTab] = useState<'match' | 'explore'>('match');
  const swiperRef = useRef<any>(null);

  const imageAnimations = useRef<{ [key: string]: Animated.Value }>({});

  const getAnimationValue = (petId: string) => {
    if (!imageAnimations.current[petId]) {
      imageAnimations.current[petId] = new Animated.Value(0);
    }
    return imageAnimations.current[petId];
  };

  useEffect(() => {
    loadPets();
  }, []);

  useEffect(() => {
    if (!pathname) return;
    if (pathname.includes('/explore')) {
      setActiveTopTab('explore');
    } else {
      setActiveTopTab('match');
    }
  }, [pathname]);

  const navigateTopTab = useCallback(
    (destination: 'match' | 'explore') => {
      setActiveTopTab(destination);
      if (destination === 'match') {
        router.replace('/(tabs)/discover/match');
      } else {
        router.replace('/(tabs)/discover/explore');
      }
    },
    [router]
  );

  const handleOpenReel = useCallback(() => {
    router.push('/(tabs)/discover/reel');
  }, [router]);

  const loadPets = async () => {
    try {
      setLoading(true);
      
      // Load tất cả pets
      const availablePets = await PetService.getAvailablePets(user?.id);

      const parsedPets = availablePets.map((pet: any) => ({
        ...pet,
        images: Array.isArray(pet.images)
          ? pet.images
          : typeof pet.images === 'string'
            ? JSON.parse(pet.images)
            : [],
      }));

      setPets(parsedPets);
    } catch (error) {
      console.error('Error loading pets:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách pet');
    } finally {
      setLoading(false);
    }
  };

  const trackPetView = async (petId: string) => {
    try {
      await PetService.trackView(petId, user?.id);
    } catch (error) {
      console.error('Error tracking view:', error);
    }
  };

  const handleToggleLike = async (petId: string) => {
    if (!user?.id) return;

    try {
      const result = await PetService.toggleLike(petId, user.id);

      if (result.liked) {
        setLikedPets((prev) => new Set(prev).add(petId));
      } else {
        setLikedPets((prev) => {
          const next = new Set(prev);
          next.delete(petId);
          return next;
        });
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleLike = () => {
    if (currentIndex < pets.length) {
      trackPetView(pets[currentIndex].id);
    }
    swiperRef.current?.swipeRight();
  };

  const handlePass = async () => {
    if (currentIndex < pets.length && user?.id) {
      const petId = pets[currentIndex].id;
      trackPetView(petId);
      
      // Lưu pass action - pet này sẽ không hiển thị lại
      try {
        await PetService.passPet(petId, user.id);
      } catch (error) {
        console.error('Error passing pet:', error);
      }
    }
    swiperRef.current?.swipeLeft();
  };

  const getCurrentImageIndex = (petId: string) => imageIndices[petId] || 0;

  const handleNextImage = (petId: string) => {
    const pet = pets.find((p) => p.id === petId);
    if (!pet) return;

    const currentImgIndex = getCurrentImageIndex(petId);
    if (currentImgIndex < pet.images.length - 1) {
      const nextIndex = currentImgIndex + 1;

      Animated.timing(getAnimationValue(petId), {
        toValue: nextIndex,
        duration: 300,
        useNativeDriver: true,
      }).start();

      setImageIndices((prev) => ({ ...prev, [petId]: nextIndex }));
    }
  };

  const handlePrevImage = (petId: string) => {
    const currentImgIndex = getCurrentImageIndex(petId);
    if (currentImgIndex > 0) {
      const prevIndex = currentImgIndex - 1;

      Animated.timing(getAnimationValue(petId), {
        toValue: prevIndex,
        duration: 300,
        useNativeDriver: true,
      }).start();

      setImageIndices((prev) => ({ ...prev, [petId]: prevIndex }));
    }
  };

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: 'center', alignItems: 'center' },
        ]}>
        <ActivityIndicator size="large" color="#FF5A75" />
        <Text style={{ marginTop: 16, fontSize: 16, color: '#666' }}>
          Đang tải pets...
        </Text>
      </View>
    );
  }

  if (pets.length === 0) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: 'center', alignItems: 'center' },
        ]}>
        <Text style={{ fontSize: 18, fontWeight: '600', color: '#333' }}>
          Không có pet để hiển thị
        </Text>
        <TouchableOpacity
          style={{
            marginTop: 20,
            backgroundColor: '#FF5A75',
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 8,
          }}
          onPress={loadPets}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>Làm mới</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.brand}>
          <PawPrint size={32} color="#FF6B6B" />
          <Text style={styles.brandText}>Adopet</Text>
        </View>

        <View style={styles.topNav}>
          <TouchableOpacity
            style={[
              styles.topNavButton,
              activeTopTab === 'match' && styles.topNavButtonActive,
            ]}
            onPress={() => navigateTopTab('match')}
          >
            <Text
              style={[
                styles.topNavText,
                activeTopTab === 'match' && styles.topNavTextActive,
              ]}>
              Match
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.topNavButton,
              activeTopTab === 'explore' && styles.topNavButtonActive,
            ]}
            onPress={() => navigateTopTab('explore')}
          >
            <Text
              style={[
                styles.topNavText,
                activeTopTab === 'explore' && styles.topNavTextActive,
              ]}>
              Explore
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerActionButton} onPress={handleOpenReel}>
            <Video size={22} color="#FF3B5C" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.cardContainer}>
        <Swiper
          ref={swiperRef}
          cards={pets}
          renderCard={(pet: Pet) => 
            USE_NEW_CARD_DESIGN ? (
              <PetCardNew
                pet={pet}
                onPress={() => router.push(`/pet/${pet.id}`)}
                onLike={() => handleToggleLike(pet.id)}
                onFavorite={() => handleToggleLike(pet.id)}
                onShare={async (pet) => {
                  try {
                    await PetService.sharePet(pet.id);
                  } catch (error) {
                    console.error('Error sharing pet:', error);
                  }
                }}
                onBack={() => swiperRef.current?.jumpToCardIndex(Math.max(currentIndex - 1, 0))}
                onClose={() => swiperRef.current?.swipeLeft()}
                isLiked={likedPets.has(pet.id)}
                isFavorited={likedPets.has(pet.id)}
                showActions={true}
              />
            ) : (
            <View style={styles.card}>
              <View style={styles.imageContainer}>
                <Animated.View
                  style={[
                    styles.imageSlider,
                    pet.images.length > 1 && {
                      transform: [
                        {
                          translateX: getAnimationValue(pet.id).interpolate({
                            inputRange: pet.images.map((_, i) => i),
                            outputRange: pet.images.map(
                              (_, i) => -i * (SCREEN_WIDTH - 40)
                            ),
                          }),
                        },
                      ],
                    },
                  ]}>
                  {pet.images.map((imageUrl, index) => (
                    <Image
                      key={`${pet.id}-${index}`}
                      source={{ uri: imageUrl }}
                      style={styles.petImage}
                    />
                  ))}
                </Animated.View>
              </View>

              <View style={styles.tapZones}>
                <TouchableOpacity
                  activeOpacity={1}
                  style={styles.tapZoneLeft}
                  onPress={() => handlePrevImage(pet.id)}
                />
                <TouchableOpacity
                  activeOpacity={1}
                  style={styles.tapZoneRight}
                  onPress={() => handleNextImage(pet.id)}
                />
              </View>

              <View style={styles.imageIndicators}>
                {pet.images.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.indicator,
                      getCurrentImageIndex(pet.id) === index && styles.indicatorActive,
                    ]}
                  />
                ))}
              </View>

              <View style={styles.cardOverlay}>
                {/* Pet Info Overlay - Bottom Left */}
                <View style={styles.petInfoOverlay}>
                  {/* Active Status */}
                  <View style={styles.activeStatus}>
                    <View style={styles.activeDot} />
                    <Text style={styles.activeText}>Có hoạt động gần đây</Text>
                  </View>

                  {/* Name, Age, Verification */}
                  <View style={styles.nameRow}>
                    <Text style={styles.petName}>{pet.name}</Text>
                    {pet.age_months && (
                      <Text style={styles.petAge}>
                        {Math.floor(pet.age_months / 12)}
                      </Text>
                    )}
                    <Text style={styles.verifiedIcon}>✓</Text>
                  </View>

                  {/* Location */}
                  {pet.location && (
                    <View style={styles.infoRow}>
                      <Home size={14} color="#fff" style={styles.icon} />
                      <Text style={styles.infoText}>Sống tại {pet.location}</Text>
                    </View>
                  )}

                  {/* Distance */}
                  {pet.distance_km !== undefined && (
                    <View style={styles.infoRow}>
                      <MapPin size={14} color="#fff" style={styles.icon} />
                      <Text style={styles.infoText}>
                        Cách xa {pet.distance_km.toFixed(1)} km
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
            )
          }
          onSwipedLeft={async (cardIndex) => {
            if (cardIndex < pets.length && user?.id) {
              const petId = pets[cardIndex].id;
              console.log(' Pass', pets[cardIndex].name);
              
              // Lưu pass action - pet này sẽ không hiển thị lại
              try {
                await PetService.passPet(petId, user.id);
              } catch (error) {
                console.error('Error passing pet:', error);
              }
            }
            setCurrentIndex(cardIndex + 1);
          }}
          onSwipedRight={(cardIndex) => {
            if (cardIndex < pets.length) {
              console.log(' Like', pets[cardIndex].name);
              handleToggleLike(pets[cardIndex].id);
            }
            setCurrentIndex(cardIndex + 1);
          }}
          cardIndex={currentIndex}
          onSwiped={(cardIndex) => {
            setCurrentIndex(cardIndex + 1);
          }}
          backgroundColor="transparent"
          stackSize={3}
          stackSeparation={15}
          animateCardOpacity
          verticalSwipe={false}
        />
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() =>
            swiperRef.current?.jumpToCardIndex(Math.max(currentIndex - 1, 0))
          }
        >
          <RotateCcw size={28} color="#FFB800" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handlePass}>
          <X size={32} color="#FF3B5C" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.starButton]}>
          <Star size={24} color="#4ECFFF" fill="#4ECFFF" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
          <Heart
            size={28}
            color={
              currentIndex < pets.length &&
              likedPets.has(pets[currentIndex]?.id)
                ? '#FF8C42'
                : '#FF8C42'
            }
            fill={
              currentIndex < pets.length &&
              likedPets.has(pets[currentIndex]?.id)
                ? '#FF8C42'
                : 'transparent'
            }
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Send size={24} color="#9368FF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: colors.background,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandText: { fontSize: 26, fontWeight: '700', color: '#6366F1' },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 24,
    padding: 4,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  topNavButton: {
    paddingVertical: 6,
    paddingHorizontal: 18,
    borderRadius: 20,
  },
  topNavButtonActive: {
    backgroundColor: colors.primarySoft,
  },
  topNavText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  topNavTextActive: {
    color: colors.primary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerActionButtonActive: {
    backgroundColor: '#FFF0F2',
    borderColor: colors.primary,
  },
  cardContainer: { flex: 1, paddingTop: 10 },
  card: {
    height: SCREEN_WIDTH * 1.4,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: colors.surfaceElevated,
  },
  imageContainer: {
    width: SCREEN_WIDTH - 40,
    height: SCREEN_WIDTH * 1.2,
    overflow: 'hidden',
    borderRadius: 12,
  },
  imageSlider: {
    flexDirection: 'row',
    height: SCREEN_WIDTH * 1.2,
  },
  petImage: {
    width: SCREEN_WIDTH - 40,
    height: SCREEN_WIDTH * 1.2,
    resizeMode: 'cover',
  },
  tapZones: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_WIDTH * 1.2,
    flexDirection: 'row',
  },
  tapZoneLeft: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  tapZoneRight: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  imageIndicators: {
    position: 'absolute',
    top: 20,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  indicatorActive: {
    backgroundColor: '#fff',
    width: 20,
  },
  cardOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 20,
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  petInfoOverlay: {
    alignSelf: 'flex-start',
    maxWidth: '80%',
  },
  activeStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00D664',
  },
  activeText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  petName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  petAge: {
    fontSize: 28,
    color: '#fff',
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  verifiedIcon: {
    fontSize: 20,
    color: '#4ECFFF',
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  icon: {
    marginRight: 0,
  },
  infoText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 20,
    paddingHorizontal: 20,
    paddingBottom: 100, // Thêm padding để tránh bị tab bar che
    zIndex: 10, // Đảm bảo hiển thị trên tab bar
  },
  actionButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  starButton: { width: 50, height: 50, borderRadius: 25 },
});

















