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
import { ArrowLeft, Star } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { OrderService, Order } from '@/src/features/products/services/order.service';
import { ReviewService, CreateReviewInput } from '@/src/features/reviews/services/review.service';
import { colors } from '@/src/theme/colors';

export default function ReviewOrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (id && user?.id) {
      loadOrder();
    }
  }, [id, user?.id]);

  const loadOrder = async () => {
    if (!id || !user?.id) return;

    try {
      setLoading(true);
      const data = await OrderService.getById(id, user.id);
      if (data && data.status === 'delivered') {
        setOrder(data);
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

  const handleSubmit = async () => {
    if (!order || !user?.id) return;

    if (!title.trim() || !comment.trim()) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ tiêu đề và nhận xét');
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
      };

      await ReviewService.create(input, user.id);
      Alert.alert('Thành công', 'Cảm ơn bạn đã đánh giá!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
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
          <Text style={styles.headerTitle}>Đánh giá sản phẩm</Text>
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
          <Text style={styles.sectionTitle}>Đánh giá của bạn *</Text>
          <View style={styles.ratingContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setRating(star)}
                style={styles.starButton}
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
          />
          <Text style={styles.charCount}>{comment.length}/1000</Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Gửi đánh giá</Text>
          )}
        </TouchableOpacity>
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
});

