import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { usePetManagement } from '../../src/features/pets/hooks/usePetManagement';
import { PetLimitBanner } from '../../src/features/pets/components/PetLimitBanner';
import { PetCard } from '../../src/features/pets/components/PetCard';

export default function MyPetsScreen() {
  const router = useRouter();
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
          { text: 'Nâng cấp', onPress: () => router.push('/(auth)/subscription') }
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
          }
        }
      ]
    );
  };

  const handleToggleAvailability = async (petId: string) => {
    try {
      await togglePetAvailability(petId);
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể thay đổi trạng thái pet. Vui lòng thử lại.');
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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Pet của tôi</Text>
        <TouchableOpacity 
          style={[
            styles.createButton,
            !petLimitInfo?.canCreate && styles.createButtonDisabled
          ]}
          onPress={handleCreatePet}
          disabled={!petLimitInfo?.canCreate}
        >
          <Text style={styles.createButtonText}>+ Tạo Pet</Text>
        </TouchableOpacity>
      </View>

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
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{userPets.length}</Text>
          <Text style={styles.statLabel}>Tổng Pet</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {userPets.filter(pet => pet.is_available).length}
          </Text>
          <Text style={styles.statLabel}>Đang bán</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {userPets.filter(pet => !pet.is_available).length}
          </Text>
          <Text style={styles.statLabel}>Đã bán</Text>
        </View>
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
            <Text style={styles.emptyTitle}>Chưa có pet nào</Text>
            <Text style={styles.emptyDescription}>
              Tạo pet đầu tiên của bạn để bắt đầu bán!
            </Text>
            <TouchableOpacity 
              style={styles.emptyButton}
              onPress={handleCreatePet}
            >
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
                  <Text style={styles.editButtonText}>Chỉnh sửa</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.deleteButton}
                  onPress={() => handleDeletePet(pet.id, pet.name)}
                >
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
    backgroundColor: '#f8f8f8',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
  },
  createButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonDisabled: {
    backgroundColor: '#ccc',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  petList: {
    flex: 1,
  },
  petItem: {
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 8,
  },
  editButton: {
    flex: 1,
    backgroundColor: '#34C759',
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 8,
    alignItems: 'center',
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
    borderRadius: 8,
    marginLeft: 8,
    alignItems: 'center',
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
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  emptyButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
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
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
