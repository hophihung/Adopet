import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Star, X, Camera, Image as ImageIcon } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { OrderService, Order } from '@/src/features/products/services/order.service';
import { ReviewService, CreateReviewInput, ProductReview } from '@/src/features/reviews/services/review.service';
import { colors } from '@/src/theme/colors';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '@/lib/supabase';

export default function ReviewOrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [order, setOrder] = useState<Order | null>(null);
  const [existingReview, setExistingReview] = useState<ProductReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState<string[]>([]);

  useEffect(() => {
    if (id && user?.id) {
      loadOrder();
    }
  }, [id, user?.id]);

  const loadOrder = async () => {
    if (!id || !user?.id) return;

    try {
      setLoading(true);
      const [orderData, reviewData] = await Promise.all([
        OrderService.getById(id, user.id),
        ReviewService.getByOrder(id),
      ]);

      if (orderData && orderData.status === 'delivered') {
        setOrder(orderData);
        if (reviewData) {
          setExistingReview(reviewData);
          setRating(reviewData.rating);
          setTitle(reviewData.title || '');
          setComment(reviewData.comment || '');
          setImages(reviewData.image_urls || []);
        }
      } else {
        Alert.alert('Lỗi', 'Đơn hàng chưa được giao hoặc không tồn tại', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } catch (error: any) {
      console.error('Error loading order:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin đơn hàng');
    } finally {
      setLoading(false);
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
        quality: 0.8,
        allowsMultipleSelection: true,
      });

      if (!result.canceled && result.assets) {
        const newImages = result.assets.slice(0, 5 - images.length); // Max 5 images
        for (const asset of newImages) {
          if (asset.uri) {
            await uploadImage(asset.uri);
          }
        }
      }
    } catch (err: any) {
      console.error('Image picker error:', err);
      Alert.alert('Lỗi', 'Không thể chọn ảnh');
    }
  };

  const uploadImage = async (uri: string): Promise<void> => {
    try {
      setUploading(true);
      setUploadingImages((prev) => [...prev, uri]);

      // Optimize image
      const { optimizeImageForUpload } = await import('@/src/utils/storageOptimization');
      const optimizedUri = await optimizeImageForUpload(uri, {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.85,
      });

      const base64 = await FileSystem.readAsStringAsync(optimizedUri, {
        encoding: 'base64',
      });
      const arrayBuffer = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const fileName = `reviews/${user?.id}-${Date.now()}-${Math.random().toString(36).substring(2, 15)}.jpg`;

      const { error } = await supabase.storage
        .from('post-images')
        .upload(fileName, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (error) throw error;

      const { data } = supabase.storage
        .from('post-images')
        .getPublicUrl(fileName);

      if (data?.publicUrl) {
        setImages((prev) => [...prev, data.publicUrl]);
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      Alert.alert('Lỗi', 'Không thể upload ảnh');
    } finally {
      setUploading(false);
      setUploadingImages((prev) => prev.filter((u) => u !== uri));
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!order || !user?.id) return;

    if (!title.trim() || !comment.trim()) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ tiêu đề và nhận xét');
      return;
    }

    if (uploading) {
      Alert.alert('Vui lòng đợi', 'Đang upload ảnh...');
      return;
    }

    try {
      setSubmitting(true);
      const input: CreateReviewInput = {
        order_id: order.id,
        product_id: order.product_id,
        rating,
        title: title.trim(),
        comment: comment.trim(),
        image_urls: images,
      };

      if (existingReview) {
        await ReviewService.update(existingReview.id, user.id, {
          rating,
          title: title.trim(),
          comment: comment.trim(),
          image_urls: images,
        });
        Alert.alert('Thành công', 'Đã cập nhật đánh giá!', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
      await ReviewService.create(input, user.id);
      Alert.alert('Thành công', 'Cảm ơn bạn đã đánh giá!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
      }
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể gửi đánh giá');
    } finally {
      setSubmitting(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!order) {
    return null;
  }

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
          <Text style={styles.headerTitle}>
            {existingReview ? 'Xem đánh giá' : 'Đánh giá sản phẩm'}
          </Text>
          {existingReview ? (
            <TouchableOpacity
              onPress={() => router.push(`/reviews/${existingReview.id}` as any)}
              style={styles.detailButton}
            >
              <Text style={styles.detailButtonText}>Chi tiết</Text>
            </TouchableOpacity>
          ) : (
          <View style={{ width: 40 }} />
          )}
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 20 },
        ]}
      >
        {/* Product Info */}
        {order.product && (
          <View style={styles.productCard}>
            {order.product.image_url && (
              <Image
                source={{ uri: order.product.image_url }}
                style={styles.productImage}
              />
            )}
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{order.product.name}</Text>
              <Text style={styles.productPrice}>
                {formatPrice(order.product.price)}
              </Text>
            </View>
          </View>
        )}

        {/* Rating */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {existingReview ? 'Đánh giá của bạn' : 'Đánh giá của bạn *'}
          </Text>
          <View style={styles.ratingContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => !existingReview && setRating(star)}
                style={styles.starButton}
                disabled={!!existingReview}
              >
                <Star
                  size={40}
                  color={star <= rating ? '#FFD700' : '#E4E7EB'}
                  fill={star <= rating ? '#FFD700' : 'transparent'}
                />
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.ratingText}>
            {rating === 5
              ? 'Tuyệt vời'
              : rating === 4
              ? 'Tốt'
              : rating === 3
              ? 'Bình thường'
              : rating === 2
              ? 'Không tốt'
              : 'Rất tệ'}
          </Text>
        </View>

        {/* Title */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tiêu đề *</Text>
          <TextInput
            style={styles.input}
            placeholder="Nhập tiêu đề đánh giá"
            value={title}
            onChangeText={setTitle}
            maxLength={100}
            editable={!existingReview}
          />
        </View>

        {/* Comment */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nhận xét *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm..."
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={6}
            maxLength={1000}
            textAlignVertical="top"
            editable={!existingReview}
          />
          <Text style={styles.charCount}>{comment.length}/1000</Text>
        </View>

        {/* Image Upload */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ảnh đính kèm (tối đa 5)</Text>
          <View style={styles.imagesContainer}>
            {images.map((imageUri, index) => (
              <View key={index} style={styles.imageWrapper}>
                <Image source={{ uri: imageUri }} style={styles.uploadedImage} />
                {!existingReview && (
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => removeImage(index)}
                  >
                    <X size={16} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            {!existingReview && images.length < 5 && (
              <TouchableOpacity
                style={styles.addImageButton}
                onPress={pickImage}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <ImageIcon size={24} color={colors.primary} />
                )}
                <Text style={styles.addImageText}>Thêm ảnh</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Submit Button */}
        {!existingReview && (
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
            disabled={submitting || uploading}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Gửi đánh giá</Text>
          )}
        </TouchableOpacity>
        )}
        {existingReview && (
          <TouchableOpacity
            style={[styles.submitButton, styles.updateButton]}
            onPress={handleSubmit}
            disabled={submitting || uploading}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Cập nhật đánh giá</Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
  },
  starButton: {
    padding: 8,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E4E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#333',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#D4D6DC',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  updateButton: {
    backgroundColor: '#FF9500',
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  imageWrapper: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageButton: {
    width: 100,
    height: 100,
    borderWidth: 2,
    borderColor: '#E4E7EB',
    borderStyle: 'dashed',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  addImageText: {
    fontSize: 12,
    color: colors.primary,
    marginTop: 4,
    fontWeight: '600',
  },
  detailButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  detailButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

