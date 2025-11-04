import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, PawPrint } from 'lucide-react-native';
import { petColors, petEmojis, PetType } from '@/src/config/virtualPet/animations';

interface PetSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (petType: PetType, name: string) => void;
}

export function PetSelectionModal({
  visible,
  onClose,
  onSelect,
}: PetSelectionModalProps) {
  const [selectedType, setSelectedType] = useState<PetType | null>(null);
  const [petName, setPetName] = useState('');

  const handleSelect = () => {
    if (!selectedType) {
      Alert.alert('Chưa chọn', 'Vui lòng chọn loại pet!');
      return;
    }

    if (!petName.trim()) {
      Alert.alert('Chưa đặt tên', 'Vui lòng đặt tên cho pet!');
      return;
    }

    onSelect(selectedType, petName.trim());
    // Reset
    setSelectedType(null);
    setPetName('');
  };

  const handleClose = () => {
    setSelectedType(null);
    setPetName('');
    onClose();
  };

  const petTypes: PetType[] = ['cat', 'dog', 'bird'];
  const petTypeLabels: Record<PetType, string> = {
    cat: 'Mèo',
    dog: 'Chó',
    bird: 'Chim',
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <PawPrint size={24} color="#FF6B9D" />
              <Text style={styles.headerTitle}>Tạo Virtual Pet</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Pet Type Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Chọn loại pet:</Text>
            <View style={styles.petTypesContainer}>
              {petTypes.map((type) => {
                const colors = petColors[type];
                const isSelected = selectedType === type;

                return (
                  <TouchableOpacity
                    key={type}
                    onPress={() => setSelectedType(type)}
                    style={[
                      styles.petTypeCard,
                      isSelected && styles.petTypeCardSelected,
                    ]}
                  >
                    <LinearGradient
                      colors={isSelected ? [colors.primary, colors.secondary] : ['#F0F0F0', '#E0E0E0']}
                      style={styles.petTypeGradient}
                    >
                      <Text style={styles.petEmoji}>{petEmojis[type]}</Text>
                      <Text
                        style={[
                          styles.petTypeLabel,
                          isSelected && styles.petTypeLabelSelected,
                        ]}
                      >
                        {petTypeLabels[type]}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Pet Name Input */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Đặt tên cho pet:</Text>
            <TextInput
              style={styles.input}
              placeholder="Nhập tên pet..."
              placeholderTextColor="#999"
              value={petName}
              onChangeText={setPetName}
              maxLength={20}
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
            >
              <Text style={styles.cancelButtonText}>Hủy</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.createButton,
                (!selectedType || !petName.trim()) && styles.createButtonDisabled,
              ]}
              onPress={handleSelect}
              disabled={!selectedType || !petName.trim()}
            >
              <LinearGradient
                colors={
                  selectedType && petName.trim()
                    ? ['#FF6B9D', '#FF8E53']
                    : ['#CCC', '#BBB']
                }
                style={styles.createButtonGradient}
              >
                <Text style={styles.createButtonText}>Tạo Pet</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
  },
  closeButton: {
    padding: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  petTypesContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  petTypeCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  petTypeCardSelected: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  petTypeGradient: {
    padding: 20,
    alignItems: 'center',
    borderRadius: 16,
  },
  petEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  petTypeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  petTypeLabelSelected: {
    color: '#FFF',
  },
  input: {
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#FAFAFA',
    color: '#000',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  createButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonGradient: {
    padding: 16,
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
});

