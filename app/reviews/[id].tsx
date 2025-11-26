import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  FlatList,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Star, ThumbsUp, Flag, X, Image as ImageIcon } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { ReviewService, ProductReview, CreateReportInput } from '@/src/features/reviews/services/review.service';
import { colors } from '@/src/theme/colors';

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam' },
  { value: 'inappropriate', label: 'Nội dung không phù hợp' },
  { value: 'fake', label: 'Đánh giá giả' },
  { value: 'offensive', label: 'Xúc phạm' },
  { value: 'other', label: 'Khác' },
] as const;

export default function ReviewDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [review, setReview] = useState<ProductReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasReported, setHasReported] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState<CreateReportInput['reason']>('spam');
  const [reportDescription, setReportDescription] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (id && user?.id) {
      loadReview();
    }
  }, [id, user?.id]);

  const loadReview = async () => {
    if (!id || !user?.id) return;

    try {
      setLoading(true);
      const [reviewData, reported] = await Promise.all([
        ReviewService.getById(id),
        ReviewService.hasReported(id, user.id),
      ]);

      if (reviewData) {
        setReview(reviewData);
        setHasReported(reported);
      } else {
        Alert.alert('Lỗi', 'Không tìm thấy đánh giá', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } catch (error: any) {
      console.error('Error loading review:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin đánh giá');
    } finally {
      setLoading(false);
    }
  };

  const handleVoteHelpful = async () => {
    if (!review || !user?.id) return;

    try {
      await ReviewService.voteHelpful(review.id, user.id, true);
      await loadReview(); // Reload to get updated helpful_count
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể vote');
    }
  };

  const handleReport = async () => {
    if (!review || !user?.id || !reportReason) return;

    if (reportReason === 'other' && !reportDescription.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập mô tả lý do báo cáo');
      return;
    }

    try {
      setSubmittingReport(true);
      await ReviewService.reportReview(
        {
          review_id: review.id,
          reason: reportReason,
          description: reportDescription.trim() || undefined,
        },
        user.id
      );
      setHasReported(true);
      setShowReportModal(false);
      Alert.alert('Thành công', 'Đã gửi báo cáo. Cảm ơn bạn đã giúp cải thiện cộng đồng!');
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể gửi báo cáo');
    } finally {
      setSubmittingReport(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!review) {
    return null;
  }

  const isBuyer = review.buyer_id === user?.id;

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
          <Text style={styles.headerTitle}>Chi tiết đánh giá</Text>
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
        {/* Review Card */}
        <View style={styles.card}>
          {/* Buyer Info */}
          <View style={styles.buyerInfo}>
            {review.buyer?.avatar_url ? (
              <Image
                source={{ uri: review.buyer.avatar_url }}
                style={styles.avatar}
              />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>
                  {review.buyer?.full_name?.charAt(0) || 'U'}
                </Text>
              </View>
            )}
            <View style={styles.buyerDetails}>
              <Text style={styles.buyerName}>
                {review.buyer?.full_name || 'Người dùng ẩn danh'}
              </Text>
              <Text style={styles.reviewDate}>
                {new Date(review.created_at).toLocaleDateString('vi-VN')}
              </Text>
            </View>
          </View>

          {/* Rating */}
          <View style={styles.ratingContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={24}
                color={star <= review.rating ? '#FFD700' : '#E4E7EB'}
                fill={star <= review.rating ? '#FFD700' : 'transparent'}
              />
            ))}
          </View>

          {/* Title */}
          {review.title && (
            <Text style={styles.reviewTitle}>{review.title}</Text>
          )}

          {/* Comment */}
          {review.comment && (
            <Text style={styles.reviewComment}>{review.comment}</Text>
          )}

          {/* Images */}
          {review.image_urls && review.image_urls.length > 0 && (
            <View style={styles.imagesContainer}>
              {review.image_urls.map((imageUri, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => setSelectedImage(imageUri)}
                  style={styles.imageWrapper}
                >
                  <Image source={{ uri: imageUri }} style={styles.reviewImage} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Seller Response */}
          {review.seller_response && (
            <View style={styles.sellerResponse}>
              <Text style={styles.sellerResponseLabel}>Phản hồi từ người bán:</Text>
              <Text style={styles.sellerResponseText}>{review.seller_response}</Text>
              {review.seller_response_at && (
                <Text style={styles.sellerResponseDate}>
                  {new Date(review.seller_response_at).toLocaleDateString('vi-VN')}
                </Text>
              )}
            </View>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleVoteHelpful}
            >
              <ThumbsUp size={18} color={colors.primary} />
              <Text style={styles.actionButtonText}>
                Hữu ích ({review.helpful_count})
              </Text>
            </TouchableOpacity>

            {!isBuyer && !hasReported && (
              <TouchableOpacity
                style={[styles.actionButton, styles.reportButton]}
                onPress={() => setShowReportModal(true)}
              >
                <Flag size={18} color="#FF3B30" />
                <Text style={[styles.actionButtonText, styles.reportButtonText]}>
                  Báo cáo
                </Text>
              </TouchableOpacity>
            )}

            {hasReported && (
              <View style={styles.reportedBadge}>
                <Flag size={16} color="#999" />
                <Text style={styles.reportedText}>Đã báo cáo</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Image Modal */}
      <Modal
        visible={!!selectedImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <View style={styles.imageModal}>
          <TouchableOpacity
            style={styles.closeImageButton}
            onPress={() => setSelectedImage(null)}
          >
            <X size={24} color="#fff" />
          </TouchableOpacity>
          {selectedImage && (
            <Image source={{ uri: selectedImage }} style={styles.fullImage} resizeMode="contain" />
          )}
        </View>
      </Modal>

      {/* Report Modal */}
      <Modal
        visible={showReportModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowReportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Báo cáo đánh giá</Text>
            <Text style={styles.modalSubtitle}>
              Vui lòng chọn lý do báo cáo đánh giá này
            </Text>

            {REPORT_REASONS.map((reason) => (
              <TouchableOpacity
                key={reason.value}
                style={[
                  styles.reasonButton,
                  reportReason === reason.value && styles.reasonButtonActive,
                ]}
                onPress={() => setReportReason(reason.value)}
              >
                <Text
                  style={[
                    styles.reasonButtonText,
                    reportReason === reason.value && styles.reasonButtonTextActive,
                  ]}
                >
                  {reason.label}
                </Text>
              </TouchableOpacity>
            ))}

            {reportReason === 'other' && (
              <TextInput
                style={styles.reportInput}
                placeholder="Mô tả lý do báo cáo..."
                value={reportDescription}
                onChangeText={setReportDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  setShowReportModal(false);
                  setReportDescription('');
                }}
              >
                <Text style={styles.modalCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalConfirmButton,
                  submittingReport && styles.modalButtonDisabled,
                ]}
                onPress={handleReport}
                disabled={submittingReport}
              >
                {submittingReport ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalConfirmText}>Gửi báo cáo</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buyerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  buyerDetails: {
    flex: 1,
  },
  buyerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  reviewDate: {
    fontSize: 12,
    color: '#999',
  },
  ratingContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 4,
  },
  reviewTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  reviewComment: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
    marginBottom: 16,
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  imageWrapper: {
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
  },
  reviewImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
  },
  sellerResponse: {
    backgroundColor: '#F5F7FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  sellerResponseLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  sellerResponseText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 4,
  },
  sellerResponseDate: {
    fontSize: 12,
    color: '#999',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F5F7FA',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  reportButton: {
    backgroundColor: '#FFF5F5',
  },
  reportButtonText: {
    color: '#FF3B30',
  },
  reportedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F5F7FA',
  },
  reportedText: {
    fontSize: 14,
    color: '#999',
  },
  imageModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeImageButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '100%',
    height: '80%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  reasonButton: {
    backgroundColor: '#F5F7FA',
    borderWidth: 1,
    borderColor: '#E4E7EB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  reasonButtonActive: {
    borderColor: colors.primary,
    backgroundColor: '#E3F2FD',
  },
  reasonButtonText: {
    fontSize: 15,
    color: '#333',
  },
  reasonButtonTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  reportInput: {
    backgroundColor: '#F5F7FA',
    borderWidth: 1,
    borderColor: '#E4E7EB',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    minHeight: 100,
    textAlignVertical: 'top',
    fontSize: 15,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelButton: {
    backgroundColor: '#F0F0F0',
  },
  modalConfirmButton: {
    backgroundColor: '#FF3B30',
  },
  modalButtonDisabled: {
    backgroundColor: '#D4D6DC',
  },
  modalCancelText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  modalConfirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

