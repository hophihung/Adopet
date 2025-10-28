import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  FlatList,
  TouchableWithoutFeedback,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Heart, X, RotateCcw, Star, Send, PawPrint, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Swiper from 'react-native-deck-swiper';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Pet {
  id: string;
  name: string;
  age: number;
  breed: string;
  location: string;
  distance: string;
  status: string;
  verified: boolean;
  images: string[];
}

const SAMPLE_PETS: Pet[] = [
  {
    id: '1',
    name: 'Husky',
    age: 10,
    breed: 'Husky',
    location: 'Sống tại TP. Qui Nhơn',
    distance: 'Cách xa 2 km',
    status: 'Có hoạt động gần đây',
    verified: true,
    images: [
      'https://images.pexels.com/photos/1805164/pexels-photo-1805164.jpeg',
      'https://images.pexels.com/photos/573241/pexels-photo-573241.jpeg',
      'https://images.pexels.com/photos/4587996/pexels-photo-4587996.jpeg',
    ],
  },
  {
    id: '2',
    name: 'Luna',
    age: 2,
    breed: 'British Shorthair',
    location: 'Sống tại TP. Hồ Chí Minh',
    distance: 'Cách xa 5 km',
    status: 'Có hoạt động gần đây',
    verified: true,
    images: [
      'https://images.pexels.com/photos/1543793/pexels-photo-1543793.jpeg',
      'https://images.pexels.com/photos/45201/kitty-cat-kitten-pet-45201.jpeg',
    ],
  },
  {
    id: '3',
    name: 'Buddy',
    age: 3,
    breed: 'Golden Retriever',
    location: 'Sống tại Hà Nội',
    distance: 'Cách xa 1 km',
    status: 'Có hoạt động gần đây',
    verified: true,
    images: [
      'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg',
      'https://images.pexels.com/photos/63960/dog-puppy-on-garden-royalty-free-image-63960.jpeg',
    ],
  },
];

export default function MatchScreen() {
  const { signOut } = useAuth();
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [imageIndices, setImageIndices] = useState<{[key: string]: number}>({}); // quản lý ảnh cho từng pet
  const swiperRef = useRef<any>(null);
  const flatListRefs = useRef<{[key: string]: FlatList | null}>({});

  const handleLike = () => swiperRef.current?.swipeRight();
  const handlePass = () => swiperRef.current?.swipeLeft();

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

  const handleNextImage = (pet: Pet) => {
    const currentImgIndex = getCurrentImageIndex(pet.id);
    if (currentImgIndex < pet.images.length - 1) {
      const nextIndex = currentImgIndex + 1;
      flatListRefs.current[pet.id]?.scrollToIndex({ index: nextIndex, animated: true });
      setImageIndices(prev => ({ ...prev, [pet.id]: nextIndex }));
    }
  };

  const handlePrevImage = (pet: Pet) => {
    const currentImgIndex = getCurrentImageIndex(pet.id);
    if (currentImgIndex > 0) {
      const prevIndex = currentImgIndex - 1;
      flatListRefs.current[pet.id]?.scrollToIndex({ index: prevIndex, animated: true });
      setImageIndices(prev => ({ ...prev, [pet.id]: prevIndex }));
    }
  };

  const handleImageAreaPress = (pet: Pet, event: any) => {
    const { locationX } = event.nativeEvent;
    const screenCenter = (SCREEN_WIDTH - 40) / 2;
    
    if (locationX < screenCenter) {
      handlePrevImage(pet);
    } else {
      handleNextImage(pet);
    }
  };

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
          cards={SAMPLE_PETS}
          renderCard={(pet: Pet) => (
            <View style={styles.card}>
              {/* FlatList ảnh với tap navigation */}
              <TouchableWithoutFeedback onPress={(e) => handleImageAreaPress(pet, e)}>
                <View>
                  <FlatList
                    ref={(ref) => (flatListRefs.current[pet.id] = ref)}
                    data={pet.images}
                    keyExtractor={(item, index) => `${pet.id}-${index}`}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    scrollEnabled={false} // Tắt scroll bằng tay để tránh conflict với swipe
                    onMomentumScrollEnd={(e) => {
                      const newIndex = Math.round(e.nativeEvent.contentOffset.x / (SCREEN_WIDTH - 40));
                      setImageIndices(prev => ({ ...prev, [pet.id]: newIndex }));
                    }}
                    renderItem={({ item }) => (
                      <Image source={{ uri: item }} style={styles.petImage} />
                    )}
                  />
                </View>
              </TouchableWithoutFeedback>

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

              {/* Nút chuyển ảnh trái phải (optional - có thể ẩn nếu chỉ dùng tap) */}
              {pet.images.length > 1 && (
                <View style={styles.imageNav}>
                  {getCurrentImageIndex(pet.id) > 0 && (
                    <TouchableOpacity 
                      onPress={() => handlePrevImage(pet)} 
                      style={[styles.navButton, styles.navButtonLeft]}
                    >
                      <ChevronLeft size={24} color="#fff" />
                    </TouchableOpacity>
                  )}
                  {getCurrentImageIndex(pet.id) < pet.images.length - 1 && (
                    <TouchableOpacity 
                      onPress={() => handleNextImage(pet)} 
                      style={[styles.navButton, styles.navButtonRight]}
                    >
                      <ChevronRight size={24} color="#fff" />
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Overlay thông tin */}
              <View style={styles.cardOverlay}>
                <View style={styles.statusBadge}>
                  <View style={styles.statusDot} />
                  <Text style={styles.statusText}>{pet.status}</Text>
                </View>

                <View style={styles.petInfo}>
                  <View style={styles.petHeader}>
                    <Text style={styles.petName}>{pet.name}</Text>
                    <Text style={styles.petAge}> {pet.age}</Text>
                    {pet.verified && <Text style={styles.verified}>✓</Text>}
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoIcon}>🏠</Text>
                    <Text style={styles.infoText}>{pet.location}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoIcon}>📍</Text>
                    <Text style={styles.infoText}>{pet.distance}</Text>
                  </View>
                </View>
              </View>
            </View>
          )}
          onSwipedLeft={(cardIndex) => console.log('❌ Denied', SAMPLE_PETS[cardIndex])}
          onSwipedRight={(cardIndex) => console.log('❤️ Liked', SAMPLE_PETS[cardIndex])}
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
          onPress={() => swiperRef.current?.jumpToCardIndex(currentIndex - 1)}>
          <RotateCcw size={28} color="#FFB800" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handlePass}>
          <X size={32} color="#FF3B5C" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.starButton]}>
          <Star size={24} color="#4ECFFF" fill="#4ECFFF" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
          <Heart size={28} color="#00D664" fill="#00D664" />
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
  petImage: {
    width: SCREEN_WIDTH - 40,
    height: SCREEN_WIDTH * 1.2,
    resizeMode: 'cover',
    borderRadius: 12,
  },
  imageNav: {
    position: 'absolute',
    top: '40%',
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    pointerEvents: 'box-none', // Cho phép tap xuyên qua khi không có nút
  },
  navButton: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 10,
    borderRadius: 30,
  },
  navButtonLeft: {
    marginRight: 'auto',
  },
  navButtonRight: {
    marginLeft: 'auto',
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
