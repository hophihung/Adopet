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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Package, MapPin, Phone, Truck, CheckCircle, Clock, XCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { OrderService, Order } from '@/src/features/products/services/order.service';
import { DisputeService, EscrowDispute } from '@/src/features/disputes/services/dispute.service';
import { ReviewService, ProductReview } from '@/src/features/reviews/services/review.service';
import { colors } from '@/src/theme/colors';
import { supabase } from '@/lib/supabase';
import { AlertCircle, Star, FileText } from 'lucide-react-native';

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [dispute, setDispute] = useState<EscrowDispute | null>(null);
  const [review, setReview] = useState<ProductReview | null>(null);
  const [checkingDisputeReview, setCheckingDisputeReview] = useState(false);

  useEffect(() => {
    if (id && user?.id) {
      loadOrder();

      // Subscribe to realtime updates
      const orderChannel = supabase
        .channel(`order-${id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: `id=eq.${id}`,
          },
          () => {
            loadOrder();
          }
        )
        .subscribe();

      return () => {
        orderChannel.unsubscribe();
      };
    }
  }, [id, user?.id]);

  const loadOrder = async () => {
    if (!id || !user?.id) return;

    try {
      setLoading(true);
      const data = await OrderService.getById(id, user.id);
      if (data) {
        setOrder(data);
        // Check dispute and review after order is loaded
        await checkDisputeAndReview(data);
      } else {
        Alert.alert('Lỗi', 'Không tìm thấy đơn hàng', [
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

  const checkDisputeAndReview = async (orderData: Order) => {
    if (!user?.id) return;

    try {
      setCheckingDisputeReview(true);

      // Check dispute if order has escrow
      if (orderData.escrow_account_id) {
        try {
          const disputes = await DisputeService.getByUser(user.id);
          const orderDispute = disputes.find(
            (d: EscrowDispute) => d.order_id === orderData.id || d.escrow_account_id === orderData.escrow_account_id
          );
          setDispute(orderDispute || null);
        } catch (error) {
          console.error('Error checking dispute:', error);
        }
      }

      // Check review if order is delivered
      if (orderData.status === 'delivered') {
        try {
          const orderReview = await ReviewService.getByOrder(orderData.id);
          setReview(orderReview || null);
        } catch (error) {
          console.error('Error checking review:', error);
        }
      }
    } catch (error) {
      console.error('Error checking dispute and review:', error);
    } finally {
      setCheckingDisputeReview(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  };

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending': return '#FF9500';
      case 'confirmed': return '#007AFF';
      case 'processing': return '#5856D6';
      case 'shipped': return '#34C759';
      case 'delivered': return '#4CAF50';
      case 'cancelled': return '#FF3B30';
      default: return '#999';
    }
  };

  const getStatusText = (status: Order['status']) => {
    switch (status) {
      case 'pending': return 'Chờ xác nhận';
      case 'confirmed': return 'Đã xác nhận';
      case 'processing': return 'Đang xử lý';
      case 'shipped': return 'Đã giao hàng';
      case 'delivered': return 'Đã nhận hàng';
      case 'cancelled': return 'Đã hủy';
      default: return status;
    }
  };

  const getStatusIcon = (status: Order['status']) => {
    switch (status) {
      case 'delivered': return <CheckCircle size={24} color="#4CAF50" />;
      case 'cancelled': return <XCircle size={24} color="#FF3B30" />;
      default: return <Clock size={24} color={getStatusColor(status)} />;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Không tìm thấy đơn hàng</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isBuyer = order.buyer_id === user?.id;
  const isSeller = order.seller_id === user?.id;

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
          <Text style={styles.headerTitle}>Chi tiết đơn hàng</Text>
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
        {/* Order Status */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            {getStatusIcon(order.status)}
            <View style={styles.statusInfo}>
              <Text style={styles.statusLabel}>Trạng thái đơn hàng</Text>
              <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
                {getStatusText(order.status)}
              </Text>
            </View>
          </View>
          <View style={styles.statusTimeline}>
            <View style={[styles.timelineItem, order.status !== 'pending' && styles.timelineItemActive]}>
              <View style={[styles.timelineDot, order.status !== 'pending' && styles.timelineDotActive]} />
              <Text style={styles.timelineText}>Đặt hàng</Text>
              {order.created_at && (
                <Text style={styles.timelineDate}>
                  {new Date(order.created_at).toLocaleString('vi-VN')}
                </Text>
              )}
            </View>
            <View style={[styles.timelineItem, ['confirmed', 'processing', 'shipped', 'delivered'].includes(order.status) && styles.timelineItemActive]}>
              <View style={[styles.timelineDot, ['confirmed', 'processing', 'shipped', 'delivered'].includes(order.status) && styles.timelineDotActive]} />
              <Text style={styles.timelineText}>Xác nhận</Text>
              {order.confirmed_at && (
                <Text style={styles.timelineDate}>
                  {new Date(order.confirmed_at).toLocaleString('vi-VN')}
                </Text>
              )}
            </View>
            <View style={[styles.timelineItem, ['shipped', 'delivered'].includes(order.status) && styles.timelineItemActive]}>
              <View style={[styles.timelineDot, ['shipped', 'delivered'].includes(order.status) && styles.timelineDotActive]} />
              <Text style={styles.timelineText}>Giao hàng</Text>
              {order.shipped_at && (
                <Text style={styles.timelineDate}>
                  {new Date(order.shipped_at).toLocaleString('vi-VN')}
                </Text>
              )}
            </View>
            <View style={[styles.timelineItem, order.status === 'delivered' && styles.timelineItemActive]}>
              <View style={[styles.timelineDot, order.status === 'delivered' && styles.timelineDotActive]} />
              <Text style={styles.timelineText}>Hoàn thành</Text>
              {order.delivered_at && (
                <Text style={styles.timelineDate}>
                  {new Date(order.delivered_at).toLocaleString('vi-VN')}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Product Info */}
        {order.product && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sản phẩm</Text>
            <View style={styles.productRow}>
              {order.product.image_url && (
                <Image source={{ uri: order.product.image_url }} style={styles.productImage} />
              )}
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{order.product.name}</Text>
                <Text style={styles.productPrice}>
                  {formatPrice(order.unit_price)} x {order.quantity}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Shipping Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Thông tin giao hàng</Text>
          <View style={styles.infoRow}>
            <MapPin size={18} color={colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Địa chỉ</Text>
              <Text style={styles.infoValue}>
                {order.shipping_address}
                {order.shipping_ward && `, ${order.shipping_ward}`}
                {order.shipping_district && `, ${order.shipping_district}`}
                {order.shipping_city && `, ${order.shipping_city}`}
              </Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Phone size={18} color={colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Người nhận</Text>
              <Text style={styles.infoValue}>
                {order.shipping_name} - {order.shipping_phone}
              </Text>
            </View>
          </View>
          {order.tracking_number && (
            <View style={styles.infoRow}>
              <Truck size={18} color={colors.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Mã vận đơn</Text>
                <Text style={[styles.infoValue, { fontFamily: 'monospace' }]}>
                  {order.tracking_number}
                </Text>
              </View>
            </View>
          )}
          {order.shipping_note && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Ghi chú</Text>
              <Text style={styles.infoValue}>{order.shipping_note}</Text>
            </View>
          )}
        </View>

        {/* Payment Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Thông tin thanh toán</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Tạm tính</Text>
            <Text style={styles.priceValue}>{formatPrice(order.total_price)}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Phí vận chuyển</Text>
            <Text style={styles.priceValue}>{formatPrice(order.shipping_fee)}</Text>
          </View>
          <View style={[styles.priceRow, styles.priceRowTotal]}>
            <Text style={styles.priceLabelTotal}>Tổng tiền</Text>
            <Text style={styles.priceValueTotal}>{formatPrice(order.final_price)}</Text>
          </View>
          <View style={styles.paymentMethod}>
            <Text style={styles.paymentLabel}>Phương thức:</Text>
            <Text style={styles.paymentValue}>
              {order.payment_method === 'cod' ? 'Thanh toán khi nhận hàng' :
               order.payment_method === 'bank_transfer' ? 'Chuyển khoản' :
               'Ví điện tử'}
            </Text>
          </View>
          <View style={styles.paymentMethod}>
            <Text style={styles.paymentLabel}>Trạng thái:</Text>
            <Text style={[styles.paymentValue, {
              color: order.payment_status === 'paid' ? '#4CAF50' :
                     order.payment_status === 'failed' ? '#FF3B30' : '#FF9500'
            }]}>
              {order.payment_status === 'paid' ? 'Đã thanh toán' :
               order.payment_status === 'failed' ? 'Thất bại' :
               order.payment_status === 'refunded' ? 'Đã hoàn tiền' : 'Chờ thanh toán'}
            </Text>
          </View>
        </View>

        {/* Notes */}
        {(order.buyer_note || order.seller_note) && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Ghi chú</Text>
            {order.buyer_note && (
              <View style={styles.noteSection}>
                <Text style={styles.noteLabel}>Người mua:</Text>
                <Text style={styles.noteValue}>{order.buyer_note}</Text>
              </View>
            )}
            {order.seller_note && (
              <View style={styles.noteSection}>
                <Text style={styles.noteLabel}>Người bán:</Text>
                <Text style={styles.noteValue}>{order.seller_note}</Text>
              </View>
            )}
          </View>
        )}

        {/* Escrow Info */}
        {order.escrow_status && order.escrow_status !== 'none' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Escrow</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Trạng thái:</Text>
              <Text style={[styles.infoValue, { color: colors.primary }]}>
                {order.escrow_status === 'escrowed' ? 'Đang giữ' :
                 order.escrow_status === 'released' ? 'Đã giải phóng' :
                 order.escrow_status === 'refunded' ? 'Đã hoàn tiền' :
                 order.escrow_status === 'disputed' ? 'Đang tranh chấp' : order.escrow_status}
              </Text>
            </View>
            {order.platform_fee && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Phí nền tảng:</Text>
                <Text style={styles.infoValue}>{formatPrice(order.platform_fee)}</Text>
              </View>
            )}
            {order.seller_payout && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Tiền nhận (seller):</Text>
                <Text style={[styles.infoValue, { color: '#4CAF50' }]}>
                  {formatPrice(order.seller_payout)}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsCard}>
          {/* Dispute Actions */}
          {order.escrow_account_id && (
            <>
              {dispute ? (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => router.push(`/orders/${id}/dispute-detail` as any)}
                  activeOpacity={0.8}
                >
                  <FileText size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Xem chi tiết tranh chấp</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.actionButton, styles.disputeButton]}
                  onPress={() => router.push(`/orders/${id}/dispute` as any)}
                  activeOpacity={0.8}
                >
                  <AlertCircle size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Mở tranh chấp</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {/* Review Action */}
          {isBuyer && order.status === 'delivered' && (
            <>
              {review ? (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => router.push(`/orders/${id}/review` as any)}
                  activeOpacity={0.8}
                >
                  <Star size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Xem đánh giá của bạn</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.actionButton, styles.reviewButton]}
                  onPress={() => router.push(`/orders/${id}/review` as any)}
                  activeOpacity={0.8}
                >
                  <Star size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Đánh giá sản phẩm</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
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
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusInfo: {
    marginLeft: 12,
    flex: 1,
  },
  statusLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '700',
  },
  statusTimeline: {
    gap: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    opacity: 0.5,
  },
  timelineItemActive: {
    opacity: 1,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E4E7EB',
    marginRight: 12,
  },
  timelineDotActive: {
    backgroundColor: colors.primary,
  },
  timelineText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  timelineDate: {
    fontSize: 12,
    color: '#999',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  productRow: {
    flexDirection: 'row',
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
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  priceRowTotal: {
    borderTopWidth: 1,
    borderTopColor: '#E4E7EB',
    paddingTop: 12,
    marginTop: 8,
  },
  priceLabel: {
    fontSize: 15,
    color: '#666',
  },
  priceValue: {
    fontSize: 15,
    color: '#333',
    fontWeight: '600',
  },
  priceLabelTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  priceValueTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  paymentMethod: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  paymentLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  paymentValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  noteSection: {
    marginBottom: 12,
  },
  noteLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
    fontWeight: '600',
  },
  noteValue: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  actionsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 8,
  },
  disputeButton: {
    backgroundColor: '#FF3B30',
  },
  reviewButton: {
    backgroundColor: '#FF9500',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});

