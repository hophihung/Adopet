import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Platform,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { usePetManagement } from '../../../src/features/pets/hooks/usePetManagement';
import { PetLimitBanner } from '../../../src/features/pets/components/PetLimitBanner';
import { PetCard } from '../../../src/features/pets/components/PetCard';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus, Edit2, Trash2, PawPrint } from 'lucide-react-native';

export default function MyPetsScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<'my-pets' | 'virtual-pet'>('my-pets');
  
  // Navigate between my-pets and virtual-pet
  const handleTabChange = (tab: 'my-pets' | 'virtual-pet') => {
    setActiveTab(tab);
    if (tab === 'virtual-pet') {
      router.replace('/(tabs)/pets/virtual-pet');
    } else {
      router.replace('/(tabs)/pets/my-pets');
    }
  };

  // Update active tab based on current pathname
  useEffect(() => {
    if (pathname?.includes('/virtual-pet')) {
      setActiveTab('virtual-pet');
    } else {
      setActiveTab('my-pets');
    }
  }, [pathname]);
  const {
    userPets,
    petLimitInfo,
    loading,
    error,
    deletePet,
    togglePetAvailability,
    fetchUserPets,
  } = usePetManagement();

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchUserPets();
    setRefreshing(false);
  };

  const handleCreatePet = () => {
    if (!petLimitInfo?.canCreate) {
      Alert.alert(
        'Đã đạt giới hạn',
        `Bạn đã tạo ${petLimitInfo?.currentCount}/${petLimitInfo?.limit} pet objects. Hãy nâng cấp gói để tạo thêm!`,
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Nâng cấp',
            onPress: () => router.push('/(auth)/subscription'),
          },
        ]
      );
      return;
    }
    router.push('/pet/create-pet');
  };

  const handleEditPet = (petId: string) => {
    router.push(`/edit-pet/${petId}` as any);
  };

  const handleDeletePet = (petId: string, petName: string) => {
    Alert.alert(
      'Xóa Pet',
      `Bạn có chắc muốn xóa "${petName}"? Hành động này không thể hoàn tác.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePet(petId);
              Alert.alert('Thành công', 'Đã xóa pet thành công!');
            } catch (error) {
              Alert.alert('Lỗi', 'Không thể xóa pet. Vui lòng thử lại.');
            }
          },
        },
      ]
    );
  };

  const handleToggleAvailability = async (petId: string) => {
    try {
      await togglePetAvailability(petId);
    } catch (error) {
      Alert.alert(
        'Lỗi',
        'Không thể thay đổi trạng thái pet. Vui lòng thử lại.'
      );
    }
  };

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchUserPets}>
          <Text style={styles.retryButtonText}>Thử lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with Gradient */}
      <LinearGradient
        colors={['#FF6B6B', '#FF8E53']}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerTabsContainer}>
            <TouchableOpacity
              style={styles.headerTab}
              onPress={() => handleTabChange('my-pets')}
              activeOpacity={0.7}
            >
              <Text style={[styles.headerTabText, activeTab === 'my-pets' && styles.headerTabTextActive]}>
                Pets của tôi
              </Text>
              {activeTab === 'my-pets' && <View style={styles.headerTabIndicator} />}
            </TouchableOpacity>
            <View style={styles.headerTabDivider} />
            <TouchableOpacity
              style={styles.headerTab}
              onPress={() => handleTabChange('virtual-pet')}
              activeOpacity={0.7}
            >
              <Text style={[styles.headerTabText, activeTab === 'virtual-pet' && styles.headerTabTextActive]}>
                Pet ảo
              </Text>
              {activeTab === 'virtual-pet' && <View style={styles.headerTabIndicator} />}
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[
              styles.createButton,
              !petLimitInfo?.canCreate && styles.createButtonDisabled,
            ]}
            onPress={handleCreatePet}
            disabled={!petLimitInfo?.canCreate}
            activeOpacity={0.8}
          >
            <Plus size={24} color="#FF6B6B" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Pet Limit Banner */}
      {petLimitInfo && (
        <PetLimitBanner
          currentCount={petLimitInfo.currentCount}
          limit={petLimitInfo.limit}
          plan={petLimitInfo.plan}
        />
      )}

      {/* Pet Stats */}
      <View style={styles.statsContainer}>
        <LinearGradient colors={['#4A90E2', '#357ABD']} style={styles.statItem}>
          <Text style={styles.statNumber}>{userPets.length}</Text>
          <Text style={styles.statLabel}>Tổng Pet</Text>
        </LinearGradient>

        <LinearGradient colors={['#34C759', '#28A745']} style={styles.statItem}>
          <Text style={styles.statNumber}>
            {userPets.filter((pet) => pet.is_available).length}
          </Text>
          <Text style={styles.statLabel}>Đang bán</Text>
        </LinearGradient>

        <LinearGradient colors={['#FF9500', '#FF6B00']} style={styles.statItem}>
          <Text style={styles.statNumber}>
            {userPets.filter((pet) => !pet.is_available).length}
          </Text>
          <Text style={styles.statLabel}>Đã bán</Text>
        </LinearGradient>
      </View>

      {/* Pet List */}
      <ScrollView
        style={styles.petList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {userPets.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <PawPrint size={80} color="#FF6B6B" strokeWidth={1.5} />
            </View>
            <Text style={styles.emptyTitle}>Chưa có pet nào</Text>
            <Text style={styles.emptyDescription}>
              Tạo pet đầu tiên của bạn để bắt đầu bán!
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={handleCreatePet}
            >
              <Plus size={20} color="#fff" />
              <Text style={styles.emptyButtonText}>Tạo Pet đầu tiên</Text>
            </TouchableOpacity>
          </View>
        ) : (
          userPets.map((pet) => (
            <View key={pet.id} style={styles.petItem}>
              <PetCard
                pet={pet}
                showOwnerActions={true}
                onToggleAvailability={handleToggleAvailability}
              />

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => handleEditPet(pet.id)}
                >
                  <Edit2 size={16} color="#fff" />
                  <Text style={styles.editButtonText}>Chỉnh sửa</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeletePet(pet.id, pet.name)}
                >
                  <Trash2 size={16} color="#fff" />
                  <Text style={styles.deleteButtonText}>Xóa</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 16,
    paddingHorizontal: 20,
    zIndex: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTabsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    flex: 1,
  },
  headerTab: {
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    position: 'relative',
  },
  headerTabDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  headerTabText: {
    fontSize: 17,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  headerTabTextActive: {
    color: '#fff',
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
  headerTabIndicator: {
    position: 'absolute',
    bottom: 2,
    left: '50%',
    transform: [{ translateX: -20 }],
    width: 40,
    height: 3,
    backgroundColor: '#fff',
    borderRadius: 2,
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  createButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  createButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    opacity: 0.5,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    gap: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  petList: {
    flex: 1,
    paddingTop: 8,
  },
  petItem: {
    marginBottom: 12,
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: '#F8F9FA',
  },
  editButton: {
    flex: 1,
    backgroundColor: '#34C759',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#FF3B30',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyIconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#FFF5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  emptyButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#F5F7FA',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
