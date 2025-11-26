import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Star, ThumbsUp, Filter } from 'lucide-react-native';
import { ReviewService, ProductReview, ReviewFilter } from '../services/review.service';
import { colors } from '@/src/theme/colors';

interface ReviewsListProps {
  productId: string;
  limit?: number;
}

export function ReviewsList({ productId, limit = 20 }: ReviewsListProps) {
  const router = useRouter();
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<ReviewFilter>('recent');
  const [showFilter, setShowFilter] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    loadReviews(true);
  }, [productId, filter]);

  const loadReviews = async (reset: boolean = false) => {
    try {
      if (reset) {
        setLoading(true);
        setOffset(0);
      } else {
        setRefreshing(true);
      }

      const currentOffset = reset ? 0 : offset;
      const data = await ReviewService.getByProduct(productId, {
        limit,
        offset: currentOffset,
        filter,
      });

      if (reset) {
        setReviews(data);
      } else {
        setReviews((prev) => [...prev, ...data]);
      }

      setHasMore(data.length === limit);
      setOffset(currentOffset + data.length);
    } catch (error: any) {
      console.error('Error loading reviews:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleLoadMore = () => {
    if (!loading && hasMore && !refreshing) {
      loadReviews(false);
    }
  };

  const renderReview = ({ item }: { item: ProductReview }) => {
    return (
      <TouchableOpacity
        style={styles.reviewCard}
        onPress={() => router.push(`/reviews/${item.id}` as any)}
        activeOpacity={0.7}
      >
        {/* Buyer Info */}
        <View style={styles.reviewHeader}>
          <View style={styles.buyerInfo}>
            {item.buyer?.avatar_url ? (
              <Image source={{ uri: item.buyer.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>
                  {item.buyer?.full_name?.charAt(0) || 'U'}
                </Text>
              </View>
            )}
            <View style={styles.buyerDetails}>
              <Text style={styles.buyerName}>
                {item.buyer?.full_name || 'Người dùng ẩn danh'}
              </Text>
              <Text style={styles.reviewDate}>
                {new Date(item.created_at).toLocaleDateString('vi-VN')}
              </Text>
            </View>
          </View>
          <View style={styles.ratingContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={16}
                color={star <= item.rating ? '#FFD700' : '#E4E7EB'}
                fill={star <= item.rating ? '#FFD700' : 'transparent'}
              />
            ))}
          </View>
        </View>

        {/* Title */}
        {item.title && <Text style={styles.reviewTitle}>{item.title}</Text>}

        {/* Comment */}
        {item.comment && (
          <Text style={styles.reviewComment} numberOfLines={3}>
            {item.comment}
          </Text>
        )}

        {/* Images Preview */}
        {item.image_urls && item.image_urls.length > 0 && (
          <View style={styles.imagesPreview}>
            {item.image_urls.slice(0, 3).map((imageUri, index) => (
              <Image
                key={index}
                source={{ uri: imageUri }}
                style={styles.previewImage}
              />
            ))}
            {item.image_urls.length > 3 && (
              <View style={styles.moreImagesOverlay}>
                <Text style={styles.moreImagesText}>+{item.image_urls.length - 3}</Text>
              </View>
            )}
          </View>
        )}

        {/* Seller Response */}
        {item.seller_response && (
          <View style={styles.sellerResponse}>
            <Text style={styles.sellerResponseLabel}>Phản hồi từ người bán:</Text>
            <Text style={styles.sellerResponseText} numberOfLines={2}>
              {item.seller_response}
            </Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.reviewFooter}>
          <View style={styles.helpfulContainer}>
            <ThumbsUp size={14} color={colors.primary} />
            <Text style={styles.helpfulText}>{item.helpful_count} hữu ích</Text>
          </View>
          <Text style={styles.viewDetailText}>Xem chi tiết →</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const filterOptions: { value: ReviewFilter; label: string }[] = [
    { value: 'recent', label: 'Mới nhất' },
    { value: 'highest', label: 'Đánh giá cao nhất' },
    { value: 'lowest', label: 'Đánh giá thấp nhất' },
    { value: 'most_helpful', label: 'Hữu ích nhất' },
  ];

  if (loading && reviews.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filter Header */}
      <View style={styles.filterHeader}>
        <Text style={styles.sectionTitle}>Đánh giá ({reviews.length})</Text>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilter(!showFilter)}
        >
          <Filter size={18} color={colors.primary} />
          <Text style={styles.filterButtonText}>
            {filterOptions.find((f) => f.value === filter)?.label || 'Lọc'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Filter Options */}
      {showFilter && (
        <View style={styles.filterOptions}>
          {filterOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.filterOption,
                filter === option.value && styles.filterOptionActive,
              ]}
              onPress={() => {
                setFilter(option.value);
                setShowFilter(false);
              }}
            >
              <Text
                style={[
                  styles.filterOptionText,
                  filter === option.value && styles.filterOptionTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Chưa có đánh giá nào</Text>
        </View>
      ) : (
        <FlatList
          data={reviews}
          renderItem={renderReview}
          keyExtractor={(item) => item.id}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadReviews(true)}
            />
          }
          ListFooterComponent={
            hasMore && !loading ? (
              <View style={styles.loadMoreContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : null
          }
          scrollEnabled={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F5F7FA',
    borderWidth: 1,
    borderColor: '#E4E7EB',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F7FA',
    borderWidth: 1,
    borderColor: '#E4E7EB',
  },
  filterOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  filterOptionTextActive: {
    color: '#fff',
  },
  reviewCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  buyerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  buyerDetails: {
    flex: 1,
  },
  buyerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
    marginBottom: 2,
  },
  reviewDate: {
    fontSize: 12,
    color: '#999',
  },
  ratingContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  reviewComment: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  imagesPreview: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  moreImagesOverlay: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreImagesText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  sellerResponse: {
    backgroundColor: '#F5F7FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  sellerResponseLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  sellerResponseText: {
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
  },
  reviewFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  helpfulContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  helpfulText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  viewDetailText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  loadMoreContainer: {
    padding: 20,
    alignItems: 'center',
  },
});

