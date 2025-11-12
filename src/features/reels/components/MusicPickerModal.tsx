/**
 * Music Picker Modal
 * Modal để chọn nhạc nền cho reel
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  Image,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { X, Music, Search, Play, Pause, Crown } from 'lucide-react-native';
import { MusicService, MusicTrack } from '../services/music.service';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/src/hooks/useSubscription';
import { useRouter } from 'expo-router';

interface MusicPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (track: MusicTrack) => void;
  selectedTrackId?: string;
}

export function MusicPickerModal({
  visible,
  onClose,
  onSelect,
  selectedTrackId,
}: MusicPickerModalProps) {
  const { user } = useAuth();
  const { isFreePlan } = useSubscription();
  const router = useRouter();
  
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);

  useEffect(() => {
    if (visible && user) {
      loadTracks();
      loadCategories();
    }
  }, [visible, user, selectedCategory]);

  const loadTracks = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const filters: any = {
        can_use: true, // Chỉ lấy nhạc có thể dùng
      };

      if (selectedCategory) {
        filters.category = selectedCategory;
      }

      if (searchQuery) {
        filters.search = searchQuery;
      }

      const data = await MusicService.getAvailableTracks(user.id, filters);
      setTracks(data);
    } catch (error) {
      console.error('Error loading tracks:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách nhạc');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const cats = await MusicService.getCategories();
      setCategories(cats);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleSelectTrack = (track: MusicTrack) => {
    if (track.is_premium && !track.can_use) {
      // Premium track but user doesn't have subscription
      Alert.alert(
        'Nhạc Premium',
        'Nhạc này chỉ dành cho thành viên Premium. Bạn có muốn nâng cấp không?',
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Nâng cấp',
            onPress: () => {
              onClose();
              router.push('/subscription');
            },
          },
        ]
      );
      return;
    }

    onSelect(track);
    onClose();
  };

  const handlePlayPreview = (trackId: string) => {
    // TODO: Implement audio preview
    // For now, just toggle playing state
    setPlayingTrackId(playingTrackId === trackId ? null : trackId);
  };

  const renderTrack = ({ item }: { item: MusicTrack }) => {
    const isSelected = item.id === selectedTrackId;
    const isPlaying = playingTrackId === item.id;
    const canUse = item.can_use;

    return (
      <TouchableOpacity
        style={[
          styles.trackItem,
          isSelected && styles.trackItemSelected,
          !canUse && styles.trackItemDisabled,
        ]}
        onPress={() => handleSelectTrack(item)}
        disabled={!canUse}
      >
        <View style={styles.trackContent}>
          {item.cover_image_url ? (
            <Image
              source={{ uri: item.cover_image_url }}
              style={styles.trackCover}
            />
          ) : (
            <View style={[styles.trackCover, styles.trackCoverPlaceholder]}>
              <Music size={24} color="#999" />
            </View>
          )}

          <View style={styles.trackInfo}>
            <View style={styles.trackHeader}>
              <Text style={styles.trackTitle} numberOfLines={1}>
                {item.title}
              </Text>
              {item.is_premium && (
                <View style={styles.premiumBadge}>
                  <Crown size={12} color="#FFD700" />
                  <Text style={styles.premiumText}>Premium</Text>
                </View>
              )}
            </View>
            <Text style={styles.trackArtist} numberOfLines={1}>
              {item.artist}
            </Text>
            <Text style={styles.trackDuration}>
              {Math.floor(item.duration / 60)}:{(item.duration % 60).toString().padStart(2, '0')}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.playButton}
            onPress={(e) => {
              e.stopPropagation();
              handlePlayPreview(item.id);
            }}
          >
            {isPlaying ? (
              <Pause size={20} color="#FF6B6B" />
            ) : (
              <Play size={20} color="#FF6B6B" />
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Chọn nhạc nền</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#000" />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={styles.searchContainer}>
            <Search size={20} color="#999" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm nhạc..."
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                // Debounce search
                setTimeout(() => {
                  if (text === searchQuery) {
                    loadTracks();
                  }
                }, 300);
              }}
              placeholderTextColor="#999"
            />
          </View>

          {/* Categories */}
          {categories.length > 0 && (
            <View style={styles.categoriesContainer}>
              <FlatList
                horizontal
                data={['All', ...categories]}
                keyExtractor={(item) => item}
                renderItem={({ item }) => {
                  const isSelected = item === 'All' ? !selectedCategory : item === selectedCategory;
                  return (
                    <TouchableOpacity
                      style={[
                        styles.categoryButton,
                        isSelected && styles.categoryButtonSelected,
                      ]}
                      onPress={() => {
                        setSelectedCategory(item === 'All' ? null : item);
                      }}
                    >
                      <Text
                        style={[
                          styles.categoryText,
                          isSelected && styles.categoryTextSelected,
                        ]}
                      >
                        {item}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
                showsHorizontalScrollIndicator={false}
              />
            </View>
          )}

          {/* Tracks List */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FF6B6B" />
            </View>
          ) : (
            <FlatList
              data={tracks}
              renderItem={renderTrack}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.tracksList}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Music size={48} color="#ccc" />
                  <Text style={styles.emptyText}>
                    {searchQuery ? 'Không tìm thấy nhạc' : 'Chưa có nhạc nào'}
                  </Text>
                </View>
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E4E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2933',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E4E7EB',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1F2933',
    paddingVertical: 10,
  },
  categoriesContainer: {
    paddingVertical: 12,
    paddingLeft: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E4E7EB',
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  categoryButtonSelected: {
    backgroundColor: '#FF6B6B',
  },
  categoryText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  categoryTextSelected: {
    color: '#fff',
  },
  tracksList: {
    padding: 16,
  },
  trackItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  trackItemSelected: {
    backgroundColor: '#FFF0F0',
    borderWidth: 2,
    borderColor: '#FF6B6B',
  },
  trackItemDisabled: {
    opacity: 0.5,
  },
  trackContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  trackCover: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#E4E7EB',
  },
  trackCoverPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackInfo: {
    flex: 1,
    marginLeft: 12,
  },
  trackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  trackTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2933',
    flex: 1,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  premiumText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FF6F00',
    marginLeft: 4,
  },
  trackArtist: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  trackDuration: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFE0E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 16,
  },
});










