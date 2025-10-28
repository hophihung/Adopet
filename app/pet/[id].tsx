import React, { useState, useEffect } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { usePetManagement } from '../../src/features/pets/hooks/usePetManagement';
import { PetUpdateData } from '../../src/features/pets/services/pet.service';
import { imageUploadService, ImageUploadResult } from '../../src/services/imageUpload.service';

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

export default function EditPetScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getPetById, updatePet, loading } = usePetManagement();
  
  const [pet, setPet] = useState<any>(null);
  const [formData, setFormData] = useState<PetUpdateData>({
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
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingImages, setUploadingImages] = useState(false);

  useEffect(() => {
    if (id) {
      loadPet();
    }
  }, [id]);

  const loadPet = async () => {
    try {
      setIsLoading(true);
      const petData = await getPetById(id!);
      setPet(petData);
      setFormData({
        name: petData.name,
        type: petData.type,
        age_months: petData.age_months,
        gender: petData.gender,
        description: petData.description || '',
        location: petData.location || '',
        price: petData.price,
        images: petData.images || [],
      });
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể tải thông tin pet');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Tên pet là bắt buộc';
    }

    if (formData.images && formData.images.length > 4) {
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
      // Upload new images first if there are any
      if (formData.images && formData.images.length > 0) {
        setUploadingImages(true);
        
        // Filter out existing URLs (already uploaded) and new URIs
        const existingUrls = formData.images.filter(img => img.startsWith('http'));
        const newUris = formData.images.filter(img => !img.startsWith('http'));
        
        if (newUris.length > 0) {
          const uploadResults = await imageUploadService.uploadMultipleImages(
            newUris,
            'pet-images',
            'pets'
          );

          if (uploadResults.length === 0) {
            Alert.alert('Lỗi', 'Không thể upload ảnh');
            setUploadingImages(false);
            return;
          }

          // Combine existing URLs with new uploaded URLs
          const updatedFormData = {
            ...formData,
            images: [...existingUrls, ...uploadResults.map(result => result.url)]
          };

          await updatePet(id!, updatedFormData);
        } else {
          await updatePet(id!, formData);
        }
      } else {
        await updatePet(id!, formData);
      }

      Alert.alert(
        'Thành công',
        'Đã cập nhật pet thành công!',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      Alert.alert(
        'Lỗi',
        error instanceof Error ? error.message : 'Không thể cập nhật pet'
      );
    } finally {
      setUploadingImages(false);
    }
  };

  const handleImageAdd = async () => {
    if (formData.images && formData.images.length >= 4) {
      Alert.alert('Thông báo', 'Tối đa 4 ảnh cho mỗi pet');
      return;
    }
    
    try {
      setUploadingImages(true);
      
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

        setFormData(prev => ({
          ...prev,
          images: [...(prev.images || []), imageUri]
        }));
      }
    } catch (error) {
      console.error('Error adding image:', error);
      Alert.alert('Lỗi', 'Không thể thêm ảnh');
    } finally {
      setUploadingImages(false);
    }
  };

  const handleImageRemove = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images?.filter((_, i) => i !== index) || []
    }));
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  if (!pet) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Không tìm thấy pet</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.cancelButton}>Hủy</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Chỉnh sửa Pet</Text>
        <TouchableOpacity 
          onPress={handleSubmit}
          disabled={loading || uploadingImages}
        >
          <Text style={[
            styles.saveButton,
            (loading || uploadingImages) && styles.saveButtonDisabled
          ]}>
            {uploadingImages ? 'Đang upload...' : loading ? 'Đang lưu...' : 'Lưu'}
          </Text>
        </TouchableOpacity>
      </View>

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
          <Text style={styles.label}>Ảnh</Text>
          <Text style={styles.imageLimitText}>
            Tối đa 4 ảnh ({(formData.images?.length || 0)}/4)
          </Text>
          
          <View style={styles.imageContainer}>
            {formData.images?.map((image, index) => (
              <View key={index} style={styles.imageItem}>
                <Image source={{ uri: image }} style={styles.image} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => handleImageRemove(index)}
                >
                  <Text style={styles.removeImageText}>×</Text>
                </TouchableOpacity>
              </View>
            )) || []}
            
            {(formData.images?.length || 0) < 4 && (
              <TouchableOpacity
                style={styles.addImageButton}
                onPress={handleImageAdd}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
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
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
});
