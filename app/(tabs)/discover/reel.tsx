import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  Image,
  TouchableOpacity,
} from 'react-native';
import { Heart, MessageCircle, Share2, Play } from 'lucide-react-native';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

const SAMPLE_REELS = [
  {
    id: '1',
    petName: 'Buddy',
    username: '@happydog_owner',
    thumbnail: 'https://images.pexels.com/photos/1805164/pexels-photo-1805164.jpeg',
    caption: 'Buddy đang chơi đùa ở công viên! 🎾',
    likes: 1234,
    comments: 56,
  },
  {
    id: '2',
    petName: 'Luna',
    username: '@catlover_hcm',
    thumbnail: 'https://images.pexels.com/photos/1543793/pexels-photo-1543793.jpeg',
    caption: 'Luna đang ngủ say như một công chúa 👑😴',
    post_likes: 2341,
    comments: 89,
  },
  {
    id: '3',
    petName: 'Max',
    username: '@husky_adventures',
    thumbnail: 'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg',
    caption: 'Đi dạo buổi sáng cùng Max! 🌅',
    post_likes: 3456,
    comments: 123,
  },
  {
    id: '4',
    petName: 'Milo',
    username: '@golden_milo',
    thumbnail: 'https://images.pexels.com/photos/1390361/pexels-photo-1390361.jpeg',
    caption: 'Milo thích bơi lội lắm! 🏊‍♂️',
    post_likes: 1890,
    comments: 67,
  },
];

export default function ReelScreen() {
  const [likedReels, setLikedReels] = useState<string[]>([]);

  const toggleLike = (reelId: string) => {
    if (likedReels.includes(reelId)) {
      setLikedReels(likedReels.filter((id) => id !== reelId));
    } else {
      setLikedReels([...likedReels, reelId]);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reel 🎬</Text>
      </View>

      <ScrollView
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={SCREEN_HEIGHT - 120}
        decelerationRate="fast"
      >
        {SAMPLE_REELS.map((reel) => (
          <View key={reel.id} style={styles.reelContainer}>
            <Image source={{ uri: reel.thumbnail }} style={styles.reelImage} />

            <View style={styles.playIconContainer}>
              <Play size={64} color="#fff" fill="#fff" />
            </View>

            <View style={styles.overlay}>
              <View style={styles.infoContainer}>
                <Text style={styles.username}>{reel.username}</Text>
                <Text style={styles.caption}>{reel.caption}</Text>
              </View>

              <View style={styles.actionsContainer}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => toggleLike(reel.id)}
                >
                  <Heart
                    size={32}
                    color="#fff"
                    fill={likedReels.includes(reel.id) ? '#FF6B6B' : 'transparent'}
                  />
                  <Text style={styles.actionText}>
                    {likedReels.includes(reel.id) ? reel.post_likes||1 + 1 : reel.post_likes}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton}>
                  <MessageCircle size={32} color="#fff" />
                  <Text style={styles.actionText}>{reel.comments}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton}>
                  <Share2 size={32} color="#fff" />
                  <Text style={styles.actionText}>Chia sẻ</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    paddingTop: 30,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: '#000',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  reelContainer: {
    height: SCREEN_HEIGHT - 120,
    width: SCREEN_WIDTH,
    position: 'relative',
  },
  reelImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#111',
  },
  playIconContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -32 }, { translateY: -32 }],
    opacity: 0.8,
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 32,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  username: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  caption: {
    fontSize: 14,
    color: '#fff',
    lineHeight: 20,
  },
  actionsContainer: {
    alignItems: 'center',
    gap: 20,
  },
  actionButton: {
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
});
