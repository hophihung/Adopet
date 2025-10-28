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
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { usePetManagement } from '../../src/features/pets/hooks/usePetManagement';
import { PetCreateData } from '../../src/features/pets/services/pet.service';
import { imageUploadService } from '../../src/services/imageUpload.service';

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
  const [uploadingImages, setUploadingImages] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]); // Local image URIs

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Tên pet là bắt buộc';
    }

    if (selectedImages.length === 0) {
      newErrors.images = 'Vui lòng thêm ít nhất 1 ảnh';
    }

    if (selectedImages.length > 4) {
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
      setUploadingImages(true);
      
      // Upload all images to Supabase Storage
      const uploadResults = await imageUploadService.uploadMultipleImages(
        selectedImages,
        'pet-images',
        'pets'
      );

      if (uploadResults.length === 0) {
        Alert.alert('Lỗi', 'Không thể upload ảnh');
        return;
      }

      // Create pet with uploaded image URLs
      const petDataWithImages: PetCreateData = {
        ...formData,
        images: uploadResults.map(result => result.url)
      };

      await createPet(petDataWithImages);

      Alert.alert(
        'Thành công',
        'Đã tạo pet thành công!',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Create pet error:', error);
      Alert.alert(
        'Lỗi',
        error instanceof Error ? error.message : 'Không thể tạo pet'
      );
    } finally {
      setUploadingImages(false);
    }
  };

  const handleImageAdd = async () => {
    if (selectedImages.length >= 4) {
      Alert.alert('Thông báo', 'Tối đa 4 ảnh cho mỗi pet');
      return;
    }
    
    try {
      const imageUri = await imageUploadService.pickImage({
        quality: 0.8,
        maxWidth: 1024,
        maxHeight: 1024,
        allowsEditing: true,
        aspect: [1, 1]
      });

      if (imageUri) {
        // Validate image
        if (!imageUploadService.validateImage(imageUri)) {
          Alert.alert('Lỗi', 'Định dạng ảnh không được hỗ trợ. Vui lòng chọn ảnh JPG, PNG hoặc WebP');
          return;
        }

        // Check file size
        const fileSize = await imageUploadService.getFileSize(imageUri);
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (fileSize > maxSize) {
          Alert.alert('Lỗi', 'Kích thước ảnh quá lớn. Vui lòng chọn ảnh nhỏ hơn 5MB');
          return;
        }

        setSelectedImages(prev => [...prev, imageUri]);
      }
    } catch (error) {
      console.error('Error adding image:', error);
      Alert.alert('Lỗi', 'Không thể thêm ảnh');
    }
  };

  const handleImageRemove = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.cancelButton}>Hủy</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Tạo Pet mới</Text>
        <TouchableOpacity 
          onPress={handleSubmit}
          disabled={loading || uploadingImages}
        >
          <Text style={[
            styles.saveButton,
            (loading || uploadingImages) && styles.saveButtonDisabled
          ]}>
            {uploadingImages ? 'Đang upload...' : loading ? 'Đang tạo...' : 'Tạo'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Pet Limit Info */}
      {petLimitInfo && (
        <View style={styles.limitInfo}>
          <Text style={styles.limitText}>
            Đã tạo {petLimitInfo.currentCount}/{petLimitInfo.limit} pets
            {petLimitInfo.canCreate ? '' : ' - Đã đạt giới hạn!'}
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
            onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
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
                  formData.type === type.value && styles.typeButtonSelected
                ]}
                onPress={() => setFormData(prev => ({ ...prev, type: type.value as any }))}
              >
                <Text style={[
                  styles.typeButtonText,
                  formData.type === type.value && styles.typeButtonTextSelected
                ]}>
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
            onChangeText={(text) => setFormData(prev => ({ 
              ...prev, 
              age_months: text ? parseInt(text) : undefined 
            }))}
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
                  formData.gender === gender.value && styles.genderButtonSelected
                ]}
                onPress={() => setFormData(prev => ({ 
                  ...prev, 
                  gender: gender.value as any 
                }))}
              >
                <Text style={[
                  styles.genderButtonText,
                  formData.gender === gender.value && styles.genderButtonTextSelected
                ]}>
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
            onChangeText={(text) => setFormData(prev => ({ ...prev, location: text }))}
            placeholder="Nhập địa điểm"
          />
        </View>

        {/* Price */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Giá (VND)</Text>
          <TextInput
            style={[styles.input, errors.price && styles.inputError]}
            value={formData.price?.toString() || ''}
            onChangeText={(text) => setFormData(prev => ({ 
              ...prev, 
              price: text ? parseFloat(text) : undefined 
            }))}
            placeholder="Nhập giá (để trống nếu miễn phí)"
            keyboardType="numeric"
          />
          {errors.price && <Text style={styles.errorText}>{errors.price}</Text>}
        </View>

        {/* Description */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Mô tả</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.description}
            onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
            placeholder="Mô tả về pet..."
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Images */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Ảnh *</Text>
          <Text style={styles.imageLimitText}>
            Tối đa 4 ảnh ({selectedImages.length}/4)
          </Text>
          
          <View style={styles.imageContainer}>
            {selectedImages.map((image, index) => (
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
            
            {selectedImages.length < 4 && (
              <TouchableOpacity
                style={styles.addImageButton}
                onPress={handleImageAdd}
                disabled={loading || uploadingImages}
              >
                <Text style={styles.addImageText}>+</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {errors.images && <Text style={styles.errorText}>{errors.images}</Text>}
        </View>
      </View>
    </ScrollView>
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
  cancelButton: {
    fontSize: 16,
    color: '#007AFF',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  saveButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  saveButtonDisabled: {
    color: '#ccc',
  },
  limitInfo: {
    backgroundColor: '#e8f4f8',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  limitText: {
    fontSize: 14,
    color: '#007AFF',
    textAlign: 'center',
  },
  form: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    marginTop: 4,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  typeButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  typeButtonText: {
    fontSize: 14,
    color: '#666',
  },
  typeButtonTextSelected: {
    color: '#fff',
  },
  genderRow: {
    flexDirection: 'row',
    gap: 12,
  },
  genderButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  genderButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  genderButtonText: {
    fontSize: 14,
    color: '#666',
  },
  genderButtonTextSelected: {
    color: '#fff',
  },
  imageLimitText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  imageContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  imageItem: {
    position: 'relative',
    width: 80,
    height: 80,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FF3B30',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  addImageButton: {
    width: 80,
    height: 80,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  addImageText: {
    fontSize: 24,
    color: '#666',
  },
  addImageButtonDisabled: {
    opacity: 0.5,
  },
});
