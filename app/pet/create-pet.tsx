import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  Alert as RNAlert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { usePetManagement } from '../../src/features/pets/hooks/usePetManagement';
import { PetCreateData } from '../../src/features/pets/services/pet.service';
import { LinearGradient } from 'expo-linear-gradient';
import {
  X,
  Check,
  Plus,
  Trash2,
  Camera,
  MapPin,
  DollarSign,
  FileText,
  Calendar,
  Users2,
} from 'lucide-react-native';

const PET_TYPES = [
  { value: 'dog', label: 'Chó' },
  { value: 'cat', label: 'Mèo' },
  { value: 'hamster', label: 'Hamster' },
  { value: 'bird', label: 'Chim' },
  { value: 'rabbit', label: 'Thỏ' },
  { value: 'other', label: 'Khác' },
];

const GENDER_OPTIONS = [
  { value: 'male', label: 'Đực' },
  { value: 'female', label: 'Cái' },
  { value: 'unknown', label: 'Không xác định' },
];

export default function CreatePetScreen() {
  const router = useRouter();
  const { createPet, petLimitInfo, loading } = usePetManagement();

  const [formData, setFormData] = useState<PetCreateData>({
    name: '',
    type: 'dog',
    age_months: undefined,
    gender: undefined,
    description: '',
    location: '',
    price: undefined,
    images: [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Tên pet là bắt buộc';
    }

    if (formData.images.length === 0) {
      newErrors.images = 'Vui lòng thêm ít nhất 1 ảnh';
    }

    if (formData.images.length > 4) {
      newErrors.images = 'Tối đa 4 ảnh cho mỗi pet';
    }

    if (formData.price && formData.price < 0) {
      newErrors.price = 'Giá không thể âm';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      await createPet(formData);
      RNAlert.alert('Thành công', 'Đã tạo pet thành công!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      RNAlert.alert(
        'Lỗi',
        error instanceof Error ? error.message : 'Không thể tạo pet'
      );
    }
  };

  const handleImageAdd = () => {
    if (formData.images.length >= 4) {
      RNAlert.alert('Thông báo', 'Tối đa 4 ảnh cho mỗi pet');
      return;
    }

    // TODO: Implement image picker
    RNAlert.alert('Thông báo', 'Tính năng chọn ảnh sẽ được implement sau');
  };

  const handleImageRemove = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  return (
    <View style={styles.container}>
      {/* Header with Gradient */}
      <LinearGradient
        colors={['#FF6B6B', '#FF8E53']}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.headerButton}
          >
            <X size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Tạo Pet mới</Text>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            style={styles.headerButton}
          >
            <Check
              size={24}
              color={loading ? 'rgba(255,255,255,0.5)' : '#fff'}
            />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Pet Limit Info */}
        {petLimitInfo && (
          <View style={styles.limitInfo}>
            <Text style={styles.limitText}>
              📊 Đã tạo {petLimitInfo.currentCount}/{petLimitInfo.limit} pet
            </Text>
          </View>
        )}

        {/* Form */}
        <View style={styles.form}>
          {/* Pet Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tên pet *</Text>
            <TextInput
              style={[styles.input, errors.name && styles.inputError]}
              value={formData.name}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, name: text }))
              }
              placeholder="Nhập tên pet"
            />
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          </View>

          {/* Pet Type */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Loại pet *</Text>
            <View style={styles.typeGrid}>
              {PET_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.typeButton,
                    formData.type === type.value && styles.typeButtonSelected,
                  ]}
                  onPress={() =>
                    setFormData((prev) => ({
                      ...prev,
                      type: type.value as any,
                    }))
                  }
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      formData.type === type.value &&
                        styles.typeButtonTextSelected,
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Age */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tuổi (tháng)</Text>
            <TextInput
              style={styles.input}
              value={formData.age_months?.toString() || ''}
              onChangeText={(text) =>
                setFormData((prev) => ({
                  ...prev,
                  age_months: text ? parseInt(text) : undefined,
                }))
              }
              placeholder="Nhập tuổi (tháng)"
              keyboardType="numeric"
            />
          </View>

          {/* Gender */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Giới tính</Text>
            <View style={styles.genderRow}>
              {GENDER_OPTIONS.map((gender) => (
                <TouchableOpacity
                  key={gender.value}
                  style={[
                    styles.genderButton,
                    formData.gender === gender.value &&
                      styles.genderButtonSelected,
                  ]}
                  onPress={() =>
                    setFormData((prev) => ({
                      ...prev,
                      gender: gender.value as any,
                    }))
                  }
                >
                  <Text
                    style={[
                      styles.genderButtonText,
                      formData.gender === gender.value &&
                        styles.genderButtonTextSelected,
                    ]}
                  >
                    {gender.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Location */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Địa điểm</Text>
            <TextInput
              style={styles.input}
              value={formData.location}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, location: text }))
              }
              placeholder="Nhập địa điểm"
            />
          </View>

          {/* Price */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Giá (VND)</Text>
            <TextInput
              style={[styles.input, errors.price && styles.inputError]}
              value={formData.price?.toString() || ''}
              onChangeText={(text) =>
                setFormData((prev) => ({
                  ...prev,
                  price: text ? parseFloat(text) : undefined,
                }))
              }
              placeholder="Nhập giá (để trống nếu miễn phí)"
              keyboardType="numeric"
            />
            {errors.price && (
              <Text style={styles.errorText}>{errors.price}</Text>
            )}
          </View>

          {/* Description */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mô tả</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, description: text }))
              }
              placeholder="Mô tả về pet..."
              multiline
              numberOfLines={4}
            />
          </View>

          {/* Images */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Ảnh *</Text>
            <Text style={styles.imageLimitText}>
              Tối đa 4 ảnh ({formData.images.length}/4)
            </Text>

            <View style={styles.imageContainer}>
              {formData.images.map((image, index) => (
                <View key={index} style={styles.imageItem}>
                  <Image source={{ uri: image }} style={styles.image} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => handleImageRemove(index)}
                  >
                    <Text style={styles.removeImageText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}

              {formData.images.length < 4 && (
                <TouchableOpacity
                  style={styles.addImageButton}
                  onPress={handleImageAdd}
                >
                  <Camera size={32} color="#999" />
                </TouchableOpacity>
              )}
            </View>

            {errors.images && (
              <Text style={styles.errorText}>{errors.images}</Text>
            )}
          </View>
        </View>
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
    paddingTop: 48,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  limitInfo: {
    backgroundColor: '#FFF5F5',
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B6B',
  },
  limitText: {
    fontSize: 14,
    color: '#FF6B6B',
    fontWeight: '600',
  },
  form: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  inputError: {
    borderColor: '#FF3B30',
    borderWidth: 2,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  errorText: {
    fontSize: 13,
    color: '#FF3B30',
    marginTop: 6,
    marginLeft: 4,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  typeButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  typeButtonSelected: {
    backgroundColor: '#FF6B6B',
    borderColor: '#FF6B6B',
    shadowColor: '#FF6B6B',
    shadowOpacity: 0.3,
    elevation: 3,
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  typeButtonTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  genderRow: {
    flexDirection: 'row',
    gap: 12,
  },
  genderButton: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  genderButtonSelected: {
    backgroundColor: '#FF6B6B',
    borderColor: '#FF6B6B',
    shadowColor: '#FF6B6B',
    shadowOpacity: 0.3,
    elevation: 3,
  },
  genderButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  genderButtonTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  imageLimitText: {
    fontSize: 13,
    color: '#999',
    marginBottom: 12,
  },
  imageContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  imageItem: {
    position: 'relative',
    width: 100,
    height: 100,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 12,
  },
  removeImageButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#FF3B30',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  removeImageText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  addImageButton: {
    width: 100,
    height: 100,
    backgroundColor: '#fff',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  addImageText: {
    fontSize: 32,
    color: '#999',
    fontWeight: '300',
  },
});
