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
  Switch,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { usePetManagement } from '../../src/features/pets/hooks/usePetManagement';
import { PetUpdateData } from '../../src/features/pets/services/pet.service';
import { imageUploadService, ImageUploadResult } from '../../src/services/imageUpload.service';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation } from '../../contexts/LocationContext';
import { locationService } from '../../src/services/location.service';
import { LinearGradient } from 'expo-linear-gradient';
import {
  X,
  Check,
  Camera,
  MapPin,
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

export default function EditPetScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getPetById, updatePet, loading } = usePetManagement();
  const { location } = useLocation();
  
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
    // Enhanced fields
    breed: '',
    weight_kg: undefined,
    color: '',
    health_status: undefined,
    vaccination_status: undefined,
    vaccination_images: [],
    spayed_neutered: undefined,
    microchipped: undefined,
    house_trained: undefined,
    good_with_kids: undefined,
    good_with_pets: undefined,
    energy_level: undefined,
    size: undefined,
    special_needs: '',
    contact_phone: '',
    contact_email: '',
    contact_visibility: 'chat_only',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [vaccinationImages, setVaccinationImages] = useState<string[]>([]); // Local vaccination image URIs
  const [locationLoading, setLocationLoading] = useState(false);
  const [currentCoordinates, setCurrentCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    if (id) {
      loadPet();
    }
  }, [id]);

  const loadCurrentLocation = async (forceUpdate: boolean = false) => {
    try {
      setLocationLoading(true);
      const hasPermission = await locationService.checkPermission();
      if (!hasPermission) {
        const granted = await locationService.requestPermission();
        if (!granted) {
          setLocationLoading(false);
          return;
        }
      }

      const currentLocation = await locationService.getCurrentLocation({
        timeout: 30000,
        accuracy: Location.Accuracy.Low,
        useCached: !forceUpdate,
        silent: !forceUpdate,
      });

      if (currentLocation) {
        setCurrentCoordinates(currentLocation);
        await reverseGeocodeLocation(currentLocation.latitude, currentLocation.longitude, !forceUpdate);
      }
    } catch (error) {
      console.warn('Error loading current location:', error);
      if (forceUpdate) {
        Alert.alert('Lỗi', 'Không thể lấy vị trí. Vui lòng thử lại sau.');
      }
    } finally {
      setLocationLoading(false);
    }
  };

  const reverseGeocodeLocation = async (latitude: number, longitude: number, updateOnlyIfEmpty: boolean = true) => {
    try {
      const addresses = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (addresses && addresses.length > 0) {
        const address = addresses[0];
        const district = (address as any).district || address.subregion;
        const city = address.city || address.region;
        let formattedAddress = 'Khu vực lân cận';

        if (district && city) {
          formattedAddress = `${district}, ${city}`;
        } else if (city || district) {
          formattedAddress = city || district || 'Khu vực lân cận';
        }
        
        setFormData((prev) => {
          if (!updateOnlyIfEmpty || !prev.location) {
            return {
              ...prev,
              location: formattedAddress,
            };
          }
          return prev;
        });
      } else {
        setFormData((prev) => {
          if (!updateOnlyIfEmpty || !prev.location) {
            return {
              ...prev,
              location: 'Khu vực lân cận',
            };
          }
          return prev;
        });
      }
    } catch (error) {
      console.warn('Error reverse geocoding:', error);
      setFormData((prev) => {
        if (!updateOnlyIfEmpty || !prev.location) {
          return {
            ...prev,
            location: 'Khu vực lân cận',
          };
        }
        return prev;
      });
    }
  };

  const loadPet = async () => {
    try {
      setIsLoading(true);
      const petData = await getPetById(id!);
      
      // Check if user is the owner
      if (petData.seller_id !== user?.id) {
        Alert.alert('Lỗi', 'Bạn không có quyền chỉnh sửa pet này');
        router.back();
        return;
      }
      
      // Parse images if it's a string
      let parsedImages: string[] = [];
      if (Array.isArray(petData.images)) {
        parsedImages = petData.images;
      } else if (typeof petData.images === 'string') {
        try {
          parsedImages = JSON.parse(petData.images);
        } catch {
          parsedImages = petData.images ? [petData.images] : [];
        }
      }

      // Parse vaccination images if it's a string
      let parsedVaccinationImages: string[] = [];
      if (petData.vaccination_images) {
        if (Array.isArray(petData.vaccination_images)) {
          parsedVaccinationImages = petData.vaccination_images;
        } else if (typeof petData.vaccination_images === 'string') {
          try {
            parsedVaccinationImages = JSON.parse(petData.vaccination_images);
          } catch {
            parsedVaccinationImages = petData.vaccination_images ? [petData.vaccination_images] : [];
          }
        }
      }
      
      setPet(petData);
      setVaccinationImages(parsedVaccinationImages);
      
      if (petData.latitude && petData.longitude) {
        setCurrentCoordinates({
          latitude: petData.latitude,
          longitude: petData.longitude,
        });
      }
      
      setFormData({
        name: petData.name,
        type: petData.type,
        age_months: petData.age_months,
        gender: petData.gender,
        description: petData.description || '',
        location: petData.location || '',
        price: petData.price,
        images: parsedImages,
        breed: petData.breed || '',
        weight_kg: petData.weight_kg,
        color: petData.color || '',
        health_status: petData.health_status,
        vaccination_status: petData.vaccination_status,
        vaccination_images: parsedVaccinationImages,
        spayed_neutered: petData.spayed_neutered,
        microchipped: petData.microchipped,
        house_trained: petData.house_trained,
        good_with_kids: petData.good_with_kids,
        good_with_pets: petData.good_with_pets,
        energy_level: petData.energy_level,
        size: petData.size,
        special_needs: petData.special_needs || '',
        contact_phone: petData.contact_phone || '',
        contact_email: petData.contact_email || '',
        contact_visibility: petData.contact_visibility || 'chat_only',
      });
    } catch (error) {
      console.error('Error loading pet:', error);
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

    // Kiểm tra vaccination images nếu chọn "up_to_date" hoặc "partial"
    if (formData.vaccination_status === 'up_to_date' || formData.vaccination_status === 'partial') {
      const existingVaccinationUrls = formData.vaccination_images?.filter(img => img.startsWith('http')) || [];
      const newVaccinationUris = vaccinationImages.filter(img => !img.startsWith('http'));
      if (existingVaccinationUrls.length + newVaccinationUris.length === 0) {
        newErrors.vaccination_images = 'Vui lòng upload ảnh chứng nhận tiêm phòng';
      }
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
      
      // Upload new pet images if there are any
      const existingUrls = formData.images?.filter(img => img.startsWith('http')) || [];
      const newUris = formData.images?.filter(img => !img.startsWith('http')) || [];
      
      let finalImageUrls = existingUrls;
      if (newUris.length > 0) {
        const uploadResults = await imageUploadService.uploadMultipleImages(
          newUris,
          'pet-images',
          'pets'
        );

        if (uploadResults.length === 0 && newUris.length > 0) {
          Alert.alert('Lỗi', 'Không thể upload ảnh');
          setUploadingImages(false);
          return;
        }

        finalImageUrls = [...existingUrls, ...uploadResults.map(result => result.url)];
      }

      // Upload vaccination images if there are any new ones
      const existingVaccinationUrls = formData.vaccination_images?.filter(img => img.startsWith('http')) || [];
      const newVaccinationUris = vaccinationImages.filter(img => !img.startsWith('http'));
      
      let finalVaccinationUrls = existingVaccinationUrls;
      if (newVaccinationUris.length > 0) {
        const vaccinationUploadResults = await imageUploadService.uploadMultipleImages(
          newVaccinationUris,
          'pet-images',
          'vaccination'
        );
        finalVaccinationUrls = [...existingVaccinationUrls, ...vaccinationUploadResults.map(result => result.url)];
      }

      // Prepare update data
      const updateData: PetUpdateData = {
        ...formData,
        images: finalImageUrls,
        vaccination_images: finalVaccinationUrls.length > 0 ? finalVaccinationUrls : undefined,
        latitude: currentCoordinates?.latitude || location?.latitude,
        longitude: currentCoordinates?.longitude || location?.longitude,
        contact_visibility: formData.contact_visibility,
        location_privacy: 'approximate',
      };

      await updatePet(id!, updateData);

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
        <ActivityIndicator size="large" color="#007AFF" />
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
          <Text style={styles.title}>Chỉnh sửa Pet</Text>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading || uploadingImages}
            style={styles.headerButton}
          >
            <Check
              size={24}
              color={loading || uploadingImages ? 'rgba(255,255,255,0.5)' : '#fff'}
            />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>

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
          <View style={styles.locationHeader}>
            <Text style={styles.label}>Địa điểm</Text>
            <TouchableOpacity
              onPress={() => loadCurrentLocation(true)}
              disabled={locationLoading}
              style={styles.locationButton}
            >
              {locationLoading ? (
                <ActivityIndicator size="small" color="#FF6B6B" />
              ) : (
                <>
                  <MapPin size={16} color="#FF6B6B" />
                  <Text style={styles.locationButtonText}>Lấy vị trí</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.input}
            value={formData.location}
            onChangeText={(text) => setFormData(prev => ({ ...prev, location: text }))}
            placeholder={locationLoading ? "Đang lấy vị trí..." : "Nhập địa điểm hoặc lấy vị trí hiện tại"}
            editable={!locationLoading}
          />
          {currentCoordinates && (
            <Text style={styles.locationHint}>
              📍 Tọa độ: {currentCoordinates.latitude.toFixed(6)}, {currentCoordinates.longitude.toFixed(6)}
            </Text>
          )}
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

        {/* Breed */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Giống</Text>
          <TextInput
            style={styles.input}
            value={formData.breed || ''}
            onChangeText={(text) => setFormData(prev => ({ ...prev, breed: text }))}
            placeholder="Nhập giống (ví dụ: Golden Retriever)"
          />
        </View>

        {/* Weight */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Cân nặng (kg)</Text>
          <TextInput
            style={styles.input}
            value={formData.weight_kg?.toString() || ''}
            onChangeText={(text) => setFormData(prev => ({
              ...prev,
              weight_kg: text ? parseFloat(text) : undefined,
            }))}
            placeholder="Nhập cân nặng"
            keyboardType="numeric"
          />
        </View>

        {/* Color */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Màu sắc</Text>
          <TextInput
            style={styles.input}
            value={formData.color || ''}
            onChangeText={(text) => setFormData(prev => ({ ...prev, color: text }))}
            placeholder="Nhập màu sắc"
          />
        </View>

        {/* Size */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Kích thước</Text>
          <View style={styles.typeGrid}>
            {[
              { value: 'small', label: 'Nhỏ' },
              { value: 'medium', label: 'Vừa' },
              { value: 'large', label: 'Lớn' },
              { value: 'extra_large', label: 'Rất lớn' },
            ].map((size) => (
              <TouchableOpacity
                key={size.value}
                style={[
                  styles.typeButton,
                  formData.size === size.value && styles.typeButtonSelected,
                ]}
                onPress={() => setFormData(prev => ({
                  ...prev,
                  size: size.value as any,
                }))}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    formData.size === size.value && styles.typeButtonTextSelected,
                  ]}
                >
                  {size.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Energy Level */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Mức năng lượng</Text>
          <View style={styles.typeGrid}>
            {[
              { value: 'low', label: 'Thấp' },
              { value: 'medium', label: 'Vừa' },
              { value: 'high', label: 'Cao' },
            ].map((level) => (
              <TouchableOpacity
                key={level.value}
                style={[
                  styles.typeButton,
                  formData.energy_level === level.value && styles.typeButtonSelected,
                ]}
                onPress={() => setFormData(prev => ({
                  ...prev,
                  energy_level: level.value as any,
                }))}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    formData.energy_level === level.value && styles.typeButtonTextSelected,
                  ]}
                >
                  {level.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Health Status */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Tình trạng sức khỏe</Text>
          <View style={styles.typeGrid}>
            {[
              { value: 'healthy', label: 'Khỏe mạnh' },
              { value: 'vaccinated', label: 'Đã tiêm phòng' },
              { value: 'sick', label: 'Đang bệnh' },
              { value: 'needs_attention', label: 'Cần chú ý' },
            ].map((status) => (
              <TouchableOpacity
                key={status.value}
                style={[
                  styles.typeButton,
                  formData.health_status === status.value && styles.typeButtonSelected,
                ]}
                onPress={() => setFormData(prev => ({
                  ...prev,
                  health_status: status.value as any,
                }))}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    formData.health_status === status.value && styles.typeButtonTextSelected,
                  ]}
                >
                  {status.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Vaccination Status */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Tình trạng tiêm phòng</Text>
          <View style={styles.genderRow}>
            {[
              { value: 'up_to_date', label: 'Đầy đủ' },
              { value: 'partial', label: 'Một phần' },
              { value: 'not_vaccinated', label: 'Chưa tiêm' },
              { value: 'unknown', label: 'Không rõ' },
            ].map((status) => (
              <TouchableOpacity
                key={status.value}
                style={[
                  styles.genderButton,
                  formData.vaccination_status === status.value &&
                    styles.genderButtonSelected,
                ]}
                onPress={() => setFormData(prev => ({
                  ...prev,
                  vaccination_status: status.value as any,
                }))}
              >
                <Text
                  style={[
                    styles.genderButtonText,
                    formData.vaccination_status === status.value &&
                      styles.genderButtonTextSelected,
                  ]}
                >
                  {status.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          {/* Vaccination Images - Required if up_to_date or partial */}
          {(formData.vaccination_status === 'up_to_date' || formData.vaccination_status === 'partial') && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Ảnh chứng nhận tiêm phòng *
                <Text style={styles.requiredNote}>
                  {' '}(Cần admin duyệt)
                </Text>
              </Text>
              <Text style={styles.imageLimitText}>
                Upload ảnh chứng nhận tiêm phòng ({vaccinationImages.length}/10)
              </Text>

              <View style={styles.imageContainer}>
                {vaccinationImages.map((image, index) => (
                  <View key={index} style={styles.imageItem}>
                    <Image source={{ uri: image }} style={styles.image} />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => setVaccinationImages(prev => prev.filter((_, i) => i !== index))}
                    >
                      <Text style={styles.removeImageText}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}

                {vaccinationImages.length < 10 && (
                  <TouchableOpacity
                    style={styles.addImageButton}
                    onPress={async () => {
                      try {
                        const imageUri = await imageUploadService.pickImage({
                          quality: 0.8,
                          maxWidth: 1024,
                          maxHeight: 1024,
                          allowsEditing: true,
                        });

                        if (imageUri) {
                          setVaccinationImages(prev => [...prev, imageUri]);
                        }
                      } catch (error) {
                        console.error('Error adding vaccination image:', error);
                        Alert.alert('Lỗi', 'Không thể thêm ảnh');
                      }
                    }}
                    disabled={loading || uploadingImages}
                  >
                    <Camera size={32} color="#999" />
                  </TouchableOpacity>
                )}
              </View>

              {errors.vaccination_images && (
                <Text style={styles.errorText}>{errors.vaccination_images}</Text>
              )}
              <Text style={styles.helperText}>
                ⚠️ Pet sẽ ở trạng thái "Chờ duyệt" cho đến khi admin xác minh ảnh tiêm phòng
              </Text>
            </View>
          )}
        </View>

        {/* Boolean Fields */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Đặc điểm</Text>
          <View style={styles.booleanRow}>
            {[
              { key: 'spayed_neutered', label: 'Đã triệt sản' },
              { key: 'microchipped', label: 'Có chip' },
              { key: 'house_trained', label: 'Biết đi vệ sinh' },
              { key: 'good_with_kids', label: 'Thân thiện trẻ em' },
              { key: 'good_with_pets', label: 'Thân thiện thú cưng khác' },
            ].map((item) => {
              const isSelected = Boolean(formData[item.key as keyof PetUpdateData]);
              return (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.booleanButton,
                    isSelected && styles.booleanButtonSelected,
                  ]}
                  onPress={() => setFormData(prev => ({
                    ...prev,
                    [item.key]: !isSelected,
                  }))}
                >
                  <Text
                    style={[
                      styles.booleanButtonText,
                      isSelected && styles.booleanButtonTextSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Special Needs */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nhu cầu đặc biệt</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.special_needs || ''}
            onChangeText={(text) => setFormData(prev => ({ ...prev, special_needs: text }))}
            placeholder="Mô tả nhu cầu đặc biệt (nếu có)..."
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Contact Info */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Thông tin liên hệ</Text>
          <TextInput
            style={styles.input}
            value={formData.contact_phone || ''}
            onChangeText={(text) => setFormData(prev => ({ ...prev, contact_phone: text }))}
            placeholder="Số điện thoại"
            keyboardType="phone-pad"
          />
          <TextInput
            style={[styles.input, { marginTop: 12 }]}
            value={formData.contact_email || ''}
            onChangeText={(text) => setFormData(prev => ({ ...prev, contact_email: text }))}
            placeholder="Email"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <View style={styles.privacyToggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleLabel}>Hiển thị công khai thông tin liên hệ</Text>
              <Text style={styles.toggleHint}>
                {formData.contact_visibility === 'public'
                  ? 'Người mua sẽ thấy số điện thoại/email của bạn.'
                  : 'Thông tin liên hệ bị ẩn. Người mua chỉ có thể nhắn tin qua Adopet.'}
              </Text>
            </View>
            <Switch
              value={formData.contact_visibility === 'public'}
              onValueChange={(value) =>
                setFormData(prev => ({
                  ...prev,
                  contact_visibility: value ? 'public' : 'chat_only',
                }))
              }
            />
          </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 13,
    color: '#FF3B30',
    marginTop: 6,
    marginLeft: 4,
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
  booleanRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  booleanButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  booleanButtonSelected: {
    backgroundColor: '#FF6B6B',
    borderColor: '#FF6B6B',
    shadowColor: '#FF6B6B',
    shadowOpacity: 0.3,
    elevation: 3,
  },
  booleanButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  booleanButtonTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  requiredNote: {
    fontSize: 12,
    color: '#FF6B6B',
    fontWeight: '600',
  },
  helperText: {
    fontSize: 12,
    color: '#FF9500',
    marginTop: 8,
    fontStyle: 'italic',
  },
  privacyToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  toggleHint: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  locationButtonText: {
    fontSize: 13,
    color: '#FF6B6B',
    fontWeight: '600',
  },
  locationHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 6,
    fontStyle: 'italic',
  },
});

