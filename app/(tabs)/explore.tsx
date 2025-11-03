import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  PawPrint,
  MapPin,
  Sparkles,
  SlidersHorizontal,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { PetService } from '@/src/features/pets/services/pet.service';

interface Pet {
  id: string;
  name: string;
  type?: string;
  breed?: string;
  location?: string;
  energy_level?: string;
  images: string[];
}

const FALLBACK_IMAGE =
  'https://images.pexels.com/photos/4587993/pexels-photo-4587993.jpeg';

const FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Dogs', value: 'dog' },
  { label: 'Cats', value: 'cat' },
  { label: 'Small Pets', value: 'small' },
  { label: 'Active', value: 'active' },
];

export default function ExploreScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [activeTopTab, setActiveTopTab] = useState<'match' | 'explore'>(
    'explore'
  );

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

  const loadPets = async () => {
    try {
      setLoading(true);
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
      console.error('Failed to load explore pets:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigateTopTab = useCallback(
    (destination: 'match' | 'explore') => {
      setActiveTopTab(destination);
      if (destination === 'match') {
        router.replace('/(tabs)');
      } else {
        router.replace('/explore');
      }
    },
    [router]
  );

  const filteredPets = useMemo(() => {
    if (selectedFilter === 'all') return pets;
    if (selectedFilter === 'active') {
      return pets.filter((pet) =>
        pet.energy_level?.toLowerCase().includes('active')
      );
    }
    return pets.filter(
      (pet) =>
        pet.type?.toLowerCase() === selectedFilter ||
        pet.breed?.toLowerCase().includes(selectedFilter)
    );
  }, [pets, selectedFilter]);

  const handleOpenPet = (petId: string) => {
    router.push(`/pet/${petId}`);
  };

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
              ]}
            >
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
              ]}
            >
              Explore
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.headerActionButton} onPress={loadPets}>
          <SlidersHorizontal size={20} color="#FF3B5C" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient colors={['#FFE4EC', '#FFF7F9']} style={styles.heroCard}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>Khám phá thú cưng nổi bật</Text>
            <Text style={styles.heroSubtitle}>
              Tìm kiếm người bạn mới từ bộ sưu tập được tuyển chọn bởi cộng đồng
              Adopet.
            </Text>
            <TouchableOpacity
              style={styles.heroButton}
              onPress={() => setSelectedFilter('active')}
            >
              <Sparkles size={16} color="#FF3B5C" />
              <Text style={styles.heroButtonText}>Gợi ý năng động</Text>
            </TouchableOpacity>
          </View>
          <Image
            source={{
              uri: 'https://images.pexels.com/photos/5732476/pexels-photo-5732476.jpeg',
            }}
            style={styles.heroImage}
          />
        </LinearGradient>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter.value}
              style={[
                styles.filterChip,
                selectedFilter === filter.value && styles.filterChipActive,
              ]}
              onPress={() => setSelectedFilter(filter.value)}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedFilter === filter.value && styles.filterTextActive,
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#FF5A75" />
            <Text style={styles.loaderText}>Đang khám phá thú cưng...</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {filteredPets.map((pet) => (
              <TouchableOpacity
                key={pet.id}
                style={styles.petCard}
                onPress={() => handleOpenPet(pet.id)}
              >
                <Image
                  source={{ uri: pet.images?.[0] || FALLBACK_IMAGE }}
                  style={styles.petImage}
                />
                <View style={styles.petInfo}>
                  <View style={styles.petHeader}>
                    <Text style={styles.petName}>{pet.name}</Text>
                    {pet.type && (
                      <View style={styles.typeBadge}>
                        <Text style={styles.typeText}>{pet.type}</Text>
                      </View>
                    )}
                  </View>
                  {pet.breed && <Text style={styles.petMeta}>{pet.breed}</Text>}
                  <View style={styles.petMetaRow}>
                    <MapPin size={14} color="#FF3B5C" />
                    <Text style={styles.petMetaText}>
                      {pet.location || 'Chưa cập nhật'}
                    </Text>
                  </View>
                  {pet.energy_level && (
                    <View style={styles.petMetaRow}>
                      <Sparkles size={14} color="#FFB800" />
                      <Text style={styles.petMetaText}>{pet.energy_level}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}

            {filteredPets.length === 0 && !loading && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>Chưa có thú cưng phù hợp</Text>
                <Text style={styles.emptySubtitle}>
                  Hãy thử bộ lọc khác hoặc quay lại sau nhé.
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandText: { fontSize: 26, fontWeight: '700', color: '#FF3B5C' },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F9FC',
    borderRadius: 24,
    padding: 4,
  },
  topNavButton: {
    paddingVertical: 6,
    paddingHorizontal: 18,
    borderRadius: 20,
  },
  topNavButtonActive: {
    backgroundColor: '#FFE4EC',
  },
  topNavText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7A7F85',
  },
  topNavTextActive: {
    color: '#FF3B5C',
  },
  headerActionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFE8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  heroCard: {
    flexDirection: 'row',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  heroCopy: {
    flex: 1,
    gap: 12,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2B2F3A',
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#4F5665',
    lineHeight: 20,
  },
  heroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 18,
    alignSelf: 'flex-start',
  },
  heroButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF3B5C',
  },
  heroImage: {
    width: 110,
    height: 110,
    borderRadius: 20,
    marginLeft: 12,
  },
  filterRow: {
    gap: 12,
    paddingBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#F0F3F8',
  },
  filterChipActive: {
    backgroundColor: '#FF5A75',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterTextActive: {
    color: '#fff',
  },
  loaderContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  loaderText: {
    marginTop: 14,
    fontSize: 15,
    color: '#667085',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  petCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  petImage: {
    width: '100%',
    height: 150,
  },
  petInfo: {
    padding: 14,
    gap: 8,
  },
  petHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  petName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  typeBadge: {
    backgroundColor: '#FFE8F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FF3B5C',
  },
  petMeta: {
    fontSize: 13,
    color: '#6B7280',
  },
  petMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  petMetaText: {
    fontSize: 12,
    color: '#4B5563',
  },
  emptyState: {
    width: '100%',
    paddingVertical: 40,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },
});
