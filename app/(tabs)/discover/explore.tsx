import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MapPin } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { PetService } from '@/src/features/pets/services/pet.service';
import { formatPetLocation } from '@/src/features/pets/utils/location';
import { colors } from '@/src/theme/colors';
import { SkeletonGrid } from '@/src/components/Skeleton';
import { DiscoverHeader } from '@/src/components/DiscoverHeader';

const FALLBACK_IMAGE = 'https://images.pexels.com/photos/4587993/pexels-photo-4587993.jpeg';

interface Pet {
  id: string;
  name: string;
  type?: string;
  breed?: string;
  location?: string;
  energy_level?: string;
  images: string[];
}

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
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  const loadPets = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      try {
        if (mode === 'initial') {
          setLoading(true);
        } else {
          setRefreshing(true);
        }
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
        if (mode === 'initial') {
          setLoading(false);
        } else {
          setRefreshing(false);
        }
      }
    },
    [user?.id]
  );

  useEffect(() => {
    loadPets('initial');
  }, [loadPets]);

  const handleRefresh = () => {
    loadPets('refresh');
  };

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
      <DiscoverHeader />
      
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Filters */}
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

        {/* Grid */}
        {loading ? (
          <View style={styles.loaderContainer}>
            <SkeletonGrid count={6} />
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
                  <Text style={styles.petName}>{pet.name}</Text>
                  {pet.breed && <Text style={styles.petMeta}>{pet.breed}</Text>}
                  <View style={styles.petMetaRow}>
                    <MapPin size={12} color="#FF6B6B" />
                    <Text style={styles.petMetaText}>
                      {formatPetLocation(pet.location)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}

            {filteredPets.length === 0 && !loading && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>Chưa có thú cưng</Text>
                <Text style={styles.emptySubtitle}>
                  Hãy thử bộ lọc khác nhé
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
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
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
    backgroundColor: '#F8F9FA',
    borderRadius: 24,
    padding: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  topNavButton: {
    paddingVertical: 6,
    paddingHorizontal: 18,
    borderRadius: 20,
  },
  topNavButtonActive: {
    backgroundColor: '#FFF4EB',
  },
  topNavText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  topNavTextActive: {
    color: '#FF8C42',
  },
  headerActionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
    marginTop: 40,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 0,
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
    marginBottom: 12,
  },
  petImage: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
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
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
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
