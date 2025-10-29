import React, { useRef, useState, useEffect } from 'react';
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
  FlatList,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Heart, X, RotateCcw, Star, Send, PawPrint } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Swiper from 'react-native-deck-swiper';
import { PetService } from '@/src/features/pets/services/pet.service';

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
}

// No mock data - will be fetched from Supabase

export default function MatchScreen() {
  const { signOut, user } = useAuth();
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [imageIndices, setImageIndices] = useState<{[key: string]: number}>({}); // quản lý ảnh cho từng pet
  const imageListRefs = useRef<{ [key: string]: FlatList<string> | null }>({});
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedPets, setLikedPets] = useState<Set<string>>(new Set());
  const swiperRef = useRef<any>(null);
  
  // Animation values cho từng pet
  const imageAnimations = useRef<{[key: string]: Animated.Value}>({});
  
  // Initialize animation value cho mỗi pet (giữ lại cho overlay/indicator nếu cần)
  const getAnimationValue = (petId: string) => {
    if (!imageAnimations.current[petId]) {
      imageAnimations.current[petId] = new Animated.Value(0);
    }
    return imageAnimations.current[petId];
  };

  // Load available pets from Supabase
  useEffect(() => {
    loadPets();
  }, []);

  const loadPets = async () => {
    try {
      setLoading(true);
      const availablePets = await PetService.getAvailablePets(user?.id);
      
      // Parse images if they're stored as JSON strings
      const parsedPets = availablePets.map((pet: any) => ({
        ...pet,
        images: Array.isArray(pet.images) ? pet.images : (
          typeof pet.images === 'string' ? JSON.parse(pet.images) : []
        ),
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
        setLikedPets(prev => new Set(prev).add(petId));
      } else {
        setLikedPets(prev => {
          const newSet = new Set(prev);
          newSet.delete(petId);
          return newSet;
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
  
  const handlePass = () => {
    if (currentIndex < pets.length) {
      trackPetView(pets[currentIndex].id);
    }
    swiperRef.current?.swipeLeft();
  };

  const handleSignOut = async () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
            router.replace('/login');
          } catch (error: any) {
            Alert.alert('Lỗi', error.message);
          }
        },
      },
    ]);
  };

  const getCurrentImageIndex = (petId: string) => imageIndices[petId] || 0;

  const handleNextImage = (petId: string) => {
    const pet = pets.find(p => p.id === petId);
    if (!pet) return;

    const currentImgIndex = getCurrentImageIndex(petId);
    const nextIndex = Math.min(currentImgIndex + 1, Math.max(0, pet.images.length - 1));

    if (nextIndex !== currentImgIndex) {
      imageListRefs.current[petId]?.scrollToIndex({ index: nextIndex, animated: true });
      setImageIndices(prev => ({ ...prev, [petId]: nextIndex }));
      Animated.timing(getAnimationValue(petId), { toValue: nextIndex, duration: 200, useNativeDriver: true }).start();
    }
  };

  const handlePrevImage = (petId: string) => {
    const currentImgIndex = getCurrentImageIndex(petId);
    const prevIndex = Math.max(0, currentImgIndex - 1);

    if (prevIndex !== currentImgIndex) {
      imageListRefs.current[petId]?.scrollToIndex({ index: prevIndex, animated: true });
      setImageIndices(prev => ({ ...prev, [petId]: prevIndex }));
      Animated.timing(getAnimationValue(petId), { toValue: prevIndex, duration: 200, useNativeDriver: true }).start();
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#FF5A75" />
        <Text style={{ marginTop: 16, fontSize: 16, color: '#666' }}>Đang tải pets...</Text>
      </View>
    );
  }

  if (pets.length === 0) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ fontSize: 18, fontWeight: '600', color: '#333' }}>Không có pet để hiển thị</Text>
        <TouchableOpacity
          style={{ marginTop: 20, backgroundColor: '#FF5A75', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}
          onPress={loadPets}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>Làm mới</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>
          <PawPrint size={36} color="#FF6B6B" /> Adopet
        </Text>
        <TouchableOpacity onPress={handleSignOut}>
          <Text style={styles.headerIcon}>⚡</Text>
        </TouchableOpacity>
      </View>

      {/* Swiper */}
      <View style={styles.cardContainer}>
        <Swiper
          ref={swiperRef}
          cards={pets}
          renderCard={(pet: Pet) => (
            <View style={styles.card}>
              {/* Container ảnh - FlatList paging */}
              <View style={styles.imageContainer}>
                <FlatList
                  ref={(ref) => { imageListRefs.current[pet.id] = ref as any; }}
                  data={pet.images}
                  keyExtractor={(uri, idx) => `${pet.id}-${idx}`}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  initialScrollIndex={getCurrentImageIndex(pet.id)}
                  getItemLayout={(_, index) => ({ length: SCREEN_WIDTH - 40, offset: (SCREEN_WIDTH - 40) * index, index })}
                  onMomentumScrollEnd={(e) => {
                    const offsetX = e.nativeEvent.contentOffset.x;
                    const width = SCREEN_WIDTH - 40;
                    const idx = Math.round(offsetX / width);
                    setImageIndices(prev => ({ ...prev, [pet.id]: idx }));
                    Animated.timing(getAnimationValue(pet.id), { toValue: idx, duration: 150, useNativeDriver: true }).start();
                  }}
                  renderItem={({ item: imageUrl }) => (
                    <Image source={{ uri: imageUrl }} style={styles.petImage} />
                  )}
                />
              </View>

              {/* Tap zones - bên trái và bên phải */}
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

              {/* Chỉ báo số ảnh */}
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

              {/* Overlay thông tin */}
              <View style={styles.cardOverlay}>
                {/* Top: Seller info */}
                {pet.profiles && (
                  <View style={styles.sellerInfo}>
                    {pet.profiles.avatar_url && (
                      <Image
                        source={{ uri: pet.profiles.avatar_url }}
                        style={styles.sellerAvatar}
                      />
                    )}
                    <View>
                      <Text style={styles.sellerName}>{pet.profiles.full_name || 'Người bán'}</Text>
                      <View style={styles.statsBadge}>
                        <Text style={styles.statText}>👍 {pet.like_count}</Text>
                        <Text style={styles.statSeparator}>|</Text>
                        <Text style={styles.statText}>👁 {pet.view_count}</Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Bottom: Pet info */}
                <View style={styles.petInfo}>
                  <View style={styles.petHeader}>
                    <Text style={styles.petName}>{pet.name}</Text>
                    <Text style={styles.petAge}>{pet.age_months ? Math.floor(pet.age_months / 12) : '?'}</Text>
                  </View>
                  {pet.breed && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoIcon}>🐶</Text>
                      <Text style={styles.infoText}>{pet.breed}</Text>
                    </View>
                  )}
                  {pet.location && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoIcon}>📄</Text>
                      <Text style={styles.infoText}>{pet.location}</Text>
                    </View>
                  )}
                  {pet.size && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoIcon}>💰</Text>
                      <Text style={styles.infoText}>Size: {pet.size}</Text>
                    </View>
                  )}
                  {pet.energy_level && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoIcon}>⚡</Text>
                      <Text style={styles.infoText}>{pet.energy_level}</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          )}
          onSwipedLeft={(cardIndex) => {
            if (cardIndex < pets.length) {
              console.log('❌ Pass', pets[cardIndex].name);
            }
            setCurrentIndex(cardIndex + 1);
          }}
          onSwipedRight={(cardIndex) => {
            if (cardIndex < pets.length) {
              console.log('❤️ Like', pets[cardIndex].name);
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

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => swiperRef.current?.jumpToCardIndex(Math.max(currentIndex - 1, 0))}>
          <RotateCcw size={28} color="#FFB800" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handlePass}>
          <X size={32} color="#FF3B5C" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.starButton]}>
          <Star size={24} color="#4ECFFF" fill="#4ECFFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleLike}
        >
          <Heart
            size={28}
            color={currentIndex < pets.length && likedPets.has(pets[currentIndex]?.id) ? "#FF3B5C" : "#00D664"}
            fill={currentIndex < pets.length && likedPets.has(pets[currentIndex]?.id) ? "#FF3B5C" : "#00D664"}
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
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 10,
  },
  logo: { fontSize: 34, fontWeight: 'bold', color: '#FF3B5C' },
  headerIcon: { fontSize: 24, color: '#9368FF', paddingRight: 6 },
  cardContainer: { flex: 1, paddingTop: 10 },
  card: {
    height: SCREEN_WIDTH * 1.4,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
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
    justifyContent: 'space-between',
    padding: 16,
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    margin: 12,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#00D664' },
  statusText: { color: '#fff', fontSize: 12, fontWeight: '500' },
  petInfo: { backgroundColor: 'transparent', margin: 12 },
  petHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  petName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  petAge: {
    fontSize: 32,
    color: '#fff',
    fontWeight: '400',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  verified: {
    fontSize: 20,
    color: '#4ECFFF',
    marginLeft: 6,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  infoIcon: { fontSize: 16, marginRight: 8 },
  infoText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 10,
    alignSelf: 'flex-start',
    margin: 12,
  },
  sellerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#fff',
  },
  sellerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  statsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  statText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  statSeparator: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 20,
    paddingHorizontal: 20,
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
