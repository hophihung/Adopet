import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Camera, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import { ProductService, CreateProductInput, ProductCategory } from '@/src/features/products/services/product.service';
import { imageUploadService } from '@/src/services/imageUpload.service';
import { colors } from '@/src/theme/colors';

export default function CreateProductScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  
  const [formData, setFormData] = useState<CreateProductInput>({
    name: '',
    description: '',
    price: 0,
    original_price: undefined,
    stock_quantity: 0,
    is_available: true,
    shipping_fee: 0,
    estimated_delivery_days: 3,
    tags: [],
  });
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isSeller = profile?.role === 'seller';

  useEffect(() => {
    if (!isSeller || !user?.id) {
      Alert.alert('Lỗi', 'Chỉ seller mới có thể tạo sản phẩm');
      router.back();
      return;
    }
    loadCategories();
  }, [user?.id, isSeller]);

  const loadCategories = async () => {
    try {
      const data = await ProductService.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Lỗi', 'Cần cấp quyền truy cập thư viện ảnh');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error: any) {
      Alert.alert('Lỗi', 'Không thể chọn ảnh: ' + (error.message || 'Đã có lỗi xảy ra'));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Vui lòng nhập tên sản phẩm';
    }

    if (formData.price <= 0) {
      newErrors.price = 'Giá sản phẩm phải lớn hơn 0';
    }

    if (formData.original_price && formData.original_price <= formData.price) {
      newErrors.original_price = 'Giá gốc phải lớn hơn giá bán';
    }

    if (!imageUri) {
      newErrors.image = 'Vui lòng chọn ảnh sản phẩm';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !user?.id) return;

    try {
      setLoading(true);

      // Upload image
      let imageUrl: string | undefined;
      if (imageUri) {
        const result = await imageUploadService.uploadImage(
          imageUri,
          'pet-images',
          'products',
          { optimize: true, maxWidth: 1920, maxHeight: 1920, quality: 0.85 }
        );
        if (result) {
          imageUrl = result.url;
        }
      }

      // Create product
      await ProductService.create(
        {
          ...formData,
          category_id: selectedCategoryId || undefined,
          image_url: imageUrl,
        },
        user.id
      );

      Alert.alert('Thành công', 'Đã tạo sản phẩm thành công', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error('Error creating product:', error);
      Alert.alert('Lỗi', error.message || 'Không thể tạo sản phẩm');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[colors.primary, colors.primaryLight]}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Tạo sản phẩm</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 20 },
        ]}
      >
        {/* Image */}
        <View style={styles.section}>
          <Text style={styles.label}>Ảnh sản phẩm *</Text>
          {imageUri ? (
            <View style={styles.imageContainer}>
              <Image source={{ uri: imageUri }} style={styles.image} />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => setImageUri(null)}
              >
                <X size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.imagePicker}
              onPress={pickImage}
            >
              <Camera size={32} color={colors.primary} />
              <Text style={styles.imagePickerText}>Chọn ảnh</Text>
            </TouchableOpacity>
          )}
          {errors.image && <Text style={styles.errorText}>{errors.image}</Text>}
        </View>

        {/* Category */}
        <View style={styles.section}>
          <Text style={styles.label}>Danh mục</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.categoryContainer}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryButton,
                    selectedCategoryId === category.id && styles.categoryButtonSelected,
                  ]}
                  onPress={() => setSelectedCategoryId(category.id)}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      selectedCategoryId === category.id && styles.categoryTextSelected,
                    ]}
                  >
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Name */}
        <View style={styles.section}>
          <Text style={styles.label}>Tên sản phẩm *</Text>
          <TextInput
            style={[styles.input, errors.name && styles.inputError]}
            placeholder="Nhập tên sản phẩm"
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
          />
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.label}>Mô tả</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Mô tả sản phẩm..."
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Price */}
        <View style={styles.section}>
          <Text style={styles.label}>Giá bán (VNĐ) *</Text>
          <TextInput
            style={[styles.input, errors.price && styles.inputError]}
            placeholder="0"
            value={formData.price > 0 ? formData.price.toString() : ''}
            onChangeText={(text) => {
              const price = parseFloat(text) || 0;
              setFormData({ ...formData, price });
            }}
            keyboardType="numeric"
          />
          {errors.price && <Text style={styles.errorText}>{errors.price}</Text>}
        </View>

        {/* Original Price */}
        <View style={styles.section}>
          <Text style={styles.label}>Giá gốc (VNĐ) - Tùy chọn</Text>
          <TextInput
            style={[styles.input, errors.original_price && styles.inputError]}
            placeholder="0"
            value={formData.original_price && formData.original_price > 0 ? formData.original_price.toString() : ''}
            onChangeText={(text) => {
              const originalPrice = parseFloat(text) || undefined;
              setFormData({ ...formData, original_price: originalPrice });
            }}
            keyboardType="numeric"
          />
          {errors.original_price && (
            <Text style={styles.errorText}>{errors.original_price}</Text>
          )}
        </View>

        {/* Stock */}
        <View style={styles.section}>
          <Text style={styles.label}>Số lượng tồn kho</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            value={formData.stock_quantity?.toString() || '0'}
            onChangeText={(text) => {
              const quantity = parseInt(text) || 0;
              setFormData({ ...formData, stock_quantity: quantity });
            }}
            keyboardType="numeric"
          />
        </View>

        {/* Shipping */}
        <View style={styles.section}>
          <Text style={styles.label}>Phí vận chuyển (VNĐ)</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            value={formData.shipping_fee?.toString() || '0'}
            onChangeText={(text) => {
              const fee = parseFloat(text) || 0;
              setFormData({ ...formData, shipping_fee: fee });
            }}
            keyboardType="numeric"
          />
        </View>

        {/* Delivery Days */}
        <View style={styles.section}>
          <Text style={styles.label}>Thời gian giao hàng (ngày)</Text>
          <TextInput
            style={styles.input}
            placeholder="3"
            value={formData.estimated_delivery_days?.toString() || '3'}
            onChangeText={(text) => {
              const days = parseInt(text) || 3;
              setFormData({ ...formData, estimated_delivery_days: days });
            }}
            keyboardType="numeric"
          />
        </View>

        {/* Available */}
        <View style={styles.section}>
          <View style={styles.switchRow}>
            <Text style={styles.label}>Còn hàng</Text>
            <Switch
              value={formData.is_available ?? true}
              onValueChange={(value) =>
                setFormData({ ...formData, is_available: value })
              }
              trackColor={{ false: '#ccc', true: colors.primary }}
            />
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Tạo sản phẩm</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  headerGradient: {
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E4E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
  },
  inputError: {
    borderColor: '#FF3B30',
    borderWidth: 2,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  errorText: {
    fontSize: 13,
    color: '#FF3B30',
    marginTop: 6,
  },
  imageContainer: {
    position: 'relative',
    width: 200,
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePicker: {
    width: 200,
    height: 200,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#E4E7EB',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  imagePickerText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  categoryContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#E4E7EB',
  },
  categoryButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  categoryTextSelected: {
    color: '#fff',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E4E7EB',
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#D4D6DC',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

