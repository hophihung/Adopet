import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Heart, X, MapPin, Info } from 'lucide-react-native';
import { useRouter } from 'expo-router';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 40;

const SAMPLE_PETS = [
  {
    id: '1',
    name: 'Buddy',
    age: 2,
    breed: 'Golden Retriever',
    location: 'Hà Nội',
    image: 'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg',
    description: 'Cún vui vẻ, thân thiện, thích chơi đùa',
  },
  {
    id: '2',
    name: 'Luna',
    age: 1,
    breed: 'British Shorthair',
    location: 'TP. Hồ Chí Minh',
    image: 'https://images.pexels.com/photos/1543793/pexels-photo-1543793.jpeg',
    description: 'Mèo dễ thương, hiền lành, thích vuốt ve',
  },
  {
    id: '3',
    name: 'Max',
    age: 3,
    breed: 'Husky',
    location: 'Đà Nẵng',
    image: 'https://images.pexels.com/photos/1805164/pexels-photo-1805164.jpeg',
    description: 'Năng động, thích chạy nhảy và khám phá',
  },
];

export default function MatchScreen() {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentPet = SAMPLE_PETS[currentIndex];

  const handleLike = () => {
    Alert.alert('💚 Đã thích!', `Bạn đã thích ${currentPet.name}`);
    nextPet();
  };

  const handlePass = () => {
    nextPet();
  };

  const nextPet = () => {
    if (currentIndex < SAMPLE_PETS.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      Alert.alert('Hết rồi!', 'Bạn đã xem hết tất cả thú cưng. Hãy quay lại sau nhé!');
      setCurrentIndex(0);
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Đăng xuất',
      'Bạn có chắc muốn đăng xuất?',
      [
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
      ]
    );
  };

  if (!currentPet) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Không có thú cưng nào</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Xin chào, {profile?.full_name || user?.email}</Text>
          <Text style={styles.roleText}>
            {profile?.role === 'seller' ? '👨‍💼 Người cung cấp' : '🙋 Người tìm kiếm'}
          </Text>
        </View>
        <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
          <Text style={styles.signOutText}>Đăng xuất</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.cardContainer}>
        <View style={styles.card}>
          <Image source={{ uri: currentPet.image }} style={styles.petImage} />

          <View style={styles.petInfo}>
            <View style={styles.petHeader}>
              <Text style={styles.petName}>{currentPet.name}</Text>
              <Text style={styles.petAge}>, {currentPet.age} tuổi</Text>
            </View>

            <Text style={styles.petBreed}>{currentPet.breed}</Text>

            <View style={styles.locationContainer}>
              <MapPin size={16} color="#666" />
              <Text style={styles.locationText}>{currentPet.location}</Text>
            </View>

            <View style={styles.descriptionContainer}>
              <Info size={16} color="#666" />
              <Text style={styles.descriptionText}>{currentPet.description}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.passButton} onPress={handlePass}>
          <X size={32} color="#FF6B6B" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.likeButton} onPress={handleLike}>
          <Heart size={32} color="#4CAF50" fill="#4CAF50" />
        </TouchableOpacity>
      </View>

      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>
          {currentIndex + 1} / {SAMPLE_PETS.length}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  roleText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  signOutButton: {
    padding: 8,
  },
  signOutText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '600',
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  petImage: {
    width: '100%',
    height: 400,
    backgroundColor: '#f0f0f0',
  },
  petInfo: {
    padding: 20,
  },
  petHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  petName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  petAge: {
    fontSize: 22,
    color: '#666',
  },
  petBreed: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  locationText: {
    fontSize: 14,
    color: '#666',
  },
  descriptionContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  descriptionText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 40,
    paddingVertical: 20,
  },
  passButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  likeButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  progressContainer: {
    alignItems: 'center',
    paddingBottom: 8,
  },
  progressText: {
    fontSize: 14,
    color: '#999',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#999',
    marginTop: 100,
  },
});
