import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';

const PET_TYPES = [
  { id: 'dog', label: 'Chó', icon: '🐕' },
  { id: 'cat', label: 'Mèo', icon: '🐈' },
  { id: 'hamster', label: 'Chuột hamster', icon: '🐹' },
  { id: 'rabbit', label: 'Thỏ', icon: '🐰' },
  { id: 'bird', label: 'Chim', icon: '🦜' },
  { id: 'fish', label: 'Cá', icon: '🐠' },
];

const AGE_RANGES = [
  { id: 'puppy', label: 'Con non (0-1 tuổi)' },
  { id: 'young', label: 'Trẻ (1-3 tuổi)' },
  { id: 'adult', label: 'Trưởng thành (3-7 tuổi)' },
  { id: 'senior', label: 'Già (7+ tuổi)' },
];

const REGIONS = [
  { id: 'hn', label: 'Hà Nội' },
  { id: 'hcm', label: 'TP. Hồ Chí Minh' },
  { id: 'dn', label: 'Đà Nẵng' },
  { id: 'hp', label: 'Hải Phòng' },
  { id: 'ct', label: 'Cần Thơ' },
  { id: 'other', label: 'Tỉnh thành khác' },
];

export default function FilterPetScreen() {
  const router = useRouter();
  const [selectedPetTypes, setSelectedPetTypes] = useState<string[]>([]);
  const [selectedAges, setSelectedAges] = useState<string[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);

  const toggleSelection = (
    id: string,
    selected: string[],
    setSelected: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    if (selected.includes(id)) {
      setSelected(selected.filter((item) => item !== id));
    } else {
      setSelected([...selected, id]);
    }
  };

  const handleContinue = () => {
    router.replace('/(tabs)');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Bạn đang tìm kiếm gì? 🔍</Text>
        <Text style={styles.subtitle}>
          Chọn sở thích của bạn để tìm thú cưng phù hợp nhất
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Loại thú cưng</Text>
          <View style={styles.optionsGrid}>
            {PET_TYPES.map((pet) => (
              <TouchableOpacity
                key={pet.id}
                style={[
                  styles.petTypeCard,
                  selectedPetTypes.includes(pet.id) && styles.selectedCard,
                ]}
                onPress={() =>
                  toggleSelection(pet.id, selectedPetTypes, setSelectedPetTypes)
                }
              >
                <Text style={styles.petIcon}>{pet.icon}</Text>
                <Text style={styles.petLabel}>{pet.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Độ tuổi</Text>
          <View style={styles.optionsColumn}>
            {AGE_RANGES.map((age) => (
              <TouchableOpacity
                key={age.id}
                style={[
                  styles.optionCard,
                  selectedAges.includes(age.id) && styles.selectedCard,
                ]}
                onPress={() => toggleSelection(age.id, selectedAges, setSelectedAges)}
              >
                <Text style={styles.optionLabel}>{age.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Khu vực</Text>
          <View style={styles.optionsColumn}>
            {REGIONS.map((region) => (
              <TouchableOpacity
                key={region.id}
                style={[
                  styles.optionCard,
                  selectedRegions.includes(region.id) && styles.selectedCard,
                ]}
                onPress={() =>
                  toggleSelection(region.id, selectedRegions, setSelectedRegions)
                }
              >
                <Text style={styles.optionLabel}>{region.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
          <Text style={styles.continueButtonText}>
            Bắt đầu tìm kiếm
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => router.replace('/(tabs)')}
        >
          <Text style={styles.skipButtonText}>Bỏ qua</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
    lineHeight: 22,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  optionsColumn: {
    gap: 12,
  },
  petTypeCard: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: '#f9f9f9',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  optionCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    padding: 16,
  },
  selectedCard: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FF6B6B',
  },
  petIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  petLabel: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
    fontWeight: '500',
  },
  optionLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  continueButton: {
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 12,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    padding: 12,
    alignItems: 'center',
    marginBottom: 32,
  },
  skipButtonText: {
    color: '#999',
    fontSize: 14,
  },
});
