import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Package, Truck, CheckCircle, XCircle, Edit, MapPin } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { OrderService, Order } from '@/src/features/products/services/order.service';
import { colors } from '@/src/theme/colors';
import { CurrencyConverter } from '@/src/utils/currency';
import { supabase } from '@/lib/supabase';

type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
type StatusFilter = 'all' | OrderStatus;

export default function ManageOrdersScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [sellerNote, setSellerNote] = useState('');

  const isSeller = profile?.role === 'seller';

  useEffect(() => {
    if (!isSeller || !user?.id) {
      Alert.alert('Lỗi', 'Chỉ seller mới có thể quản lý đơn hàng');
      router.back();
      return;
    }
    loadOrders();

    // Subscribe to realtime updates
    const ordersChannel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `seller_id=eq.${user.id}`,
        },
        () => {
          loadOrders();
        }
      )
      .subscribe();

    return () => {
      ordersChannel.unsubscribe();
    };
  }, [user?.id, isSeller, statusFilter]);

  const loadOrders = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const data = await OrderService.getBySeller(user.id);
      setOrders(data);
    } catch (error: any) {
      console.error('Error loading orders:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách đơn hàng');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    if (!user?.id) return;

    try {
      setUpdating(true);
      await OrderService.updateStatus(orderId, newStatus, user.id, sellerNote);
      setShowStatusModal(false);
      setSellerNote('');
      await loadOrders();
      Alert.alert('Thành công', 'Đã cập nhật trạng thái đơn hàng');
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể cập nhật trạng thái');
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateTracking = async (orderId: string) => {
    if (!user?.id || !trackingNumber.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập mã vận đơn');
      return;
    }

    try {
      setUpdating(true);
      await OrderService.updateTracking(orderId, trackingNumber, user.id);
      setShowTrackingModal(false);
      setTrackingNumber('');
      await loadOrders();
      Alert.alert('Thành công', 'Đã cập nhật mã vận đơn');
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể cập nhật mã vận đơn');
    } finally {
      setUpdating(false);
    }
  };

  const formatPrice = (price: number) => {
    return CurrencyConverter.format(price, 'VND');
  };

  const getStatusColor = (status: OrderStatus) => {
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

  const getStatusText = (status: OrderStatus) => {
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

  const getNextStatus = (currentStatus: OrderStatus): OrderStatus | null => {
    switch (currentStatus) {
      case 'pending': return 'confirmed';
      case 'confirmed': return 'processing';
      case 'processing': return 'shipped';
      case 'shipped': return 'delivered';
      default: return null;
    }
  };

  const filteredOrders = statusFilter === 'all' 
    ? orders 
    : orders.filter(o => o.status === statusFilter);

  const renderOrder = ({ item }: { item: Order }) => {
    const nextStatus = getNextStatus(item.status as OrderStatus);
    const canUpdate = nextStatus !== null && item.status !== 'delivered' && item.status !== 'cancelled';

    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => router.push({
          pathname: '/orders/[id]',
          params: { id: item.id },
        } as any)}
        activeOpacity={0.7}
      >
        <View style={styles.orderHeader}>
          <View style={styles.orderInfo}>
            <Text style={styles.orderId}>Đơn #{item.id.substring(0, 8)}</Text>
            <Text style={styles.orderDate}>
              {new Date(item.created_at).toLocaleDateString('vi-VN')}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status as OrderStatus) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status as OrderStatus) }]}>
              {getStatusText(item.status as OrderStatus)}
            </Text>
          </View>
        </View>

        {item.product && (
          <View style={styles.productRow}>
            {item.product.image_url && (
              <Image source={{ uri: item.product.image_url }} style={styles.productImage} />
            )}
            <View style={styles.productInfo}>
              <Text style={styles.productName} numberOfLines={2}>
                {item.product.name}
              </Text>
              <Text style={styles.productPrice}>
                {formatPrice(item.unit_price)} x {item.quantity}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.orderDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Tổng tiền:</Text>
            <Text style={styles.detailValue}>{formatPrice(item.final_price)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Người mua:</Text>
            <Text style={styles.detailValue}>{item.shipping_name}</Text>
          </View>
          {item.escrow_status && item.escrow_status !== 'none' && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Escrow:</Text>
              <Text style={[styles.detailValue, { color: colors.primary }]}>
                {item.escrow_status === 'escrowed' ? 'Đang giữ' : 
                 item.escrow_status === 'released' ? 'Đã giải phóng' : item.escrow_status}
              </Text>
            </View>
          )}
        </View>

        {canUpdate && (
          <View style={styles.orderActions}>
            {item.status === 'shipped' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.trackingButton]}
                onPress={() => {
                  setSelectedOrder(item);
                  setShowTrackingModal(true);
                }}
              >
                <Truck size={16} color={colors.primary} />
                <Text style={styles.actionButtonText}>Mã vận đơn</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.actionButton, styles.updateButton]}
              onPress={() => {
                setSelectedOrder(item);
                setShowStatusModal(true);
              }}
            >
              <Edit size={16} color="#fff" />
              <Text style={[styles.actionButtonText, { color: '#fff' }]}>
                {nextStatus === 'delivered' ? 'Xác nhận đã giao' : 'Cập nhật trạng thái'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const statusCounts = {
    all: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    confirmed: orders.filter(o => o.status === 'confirmed').length,
    processing: orders.filter(o => o.status === 'processing').length,
    shipped: orders.filter(o => o.status === 'shipped').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
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
          <Text style={styles.headerTitle}>Quản lý đơn hàng</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      {/* Status Filters */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {(['all', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'] as StatusFilter[]).map((status) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterButton,
              statusFilter === status && styles.filterButtonActive,
            ]}
            onPress={() => setStatusFilter(status)}
          >
            <Text
              style={[
                styles.filterText,
                statusFilter === status && styles.filterTextActive,
              ]}
            >
              {status === 'all' ? 'Tất cả' : getStatusText(status as OrderStatus)}
            </Text>
            {statusCounts[status] > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{statusCounts[status]}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {filteredOrders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Package size={64} color="#ccc" />
          <Text style={styles.emptyText}>
            {statusFilter === 'all' ? 'Chưa có đơn hàng' : `Không có đơn hàng ${getStatusText(statusFilter as OrderStatus).toLowerCase()}`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          renderItem={renderOrder}
          keyExtractor={item => item.id}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 20 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadOrders();
              }}
            />
          }
        />
      )}

      {/* Update Status Modal */}
      <Modal
        visible={showStatusModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowStatusModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cập nhật trạng thái đơn hàng</Text>
            {selectedOrder && (
              <>
                <Text style={styles.modalSubtitle}>
                  Đơn hàng #{selectedOrder.id.substring(0, 8)}
                </Text>
                <Text style={styles.modalLabel}>Trạng thái hiện tại:</Text>
                <Text style={styles.modalValue}>
                  {getStatusText(selectedOrder.status as OrderStatus)}
                </Text>
                {getNextStatus(selectedOrder.status as OrderStatus) && (
                  <>
                    <Text style={styles.modalLabel}>Trạng thái mới:</Text>
                    <Text style={styles.modalValue}>
                      {getStatusText(getNextStatus(selectedOrder.status as OrderStatus)!)}
                    </Text>
                    <Text style={styles.modalLabel}>Ghi chú (Tùy chọn):</Text>
                    <TextInput
                      style={[styles.modalInput, styles.modalTextArea]}
                      placeholder="Thêm ghi chú cho đơn hàng..."
                      value={sellerNote}
                      onChangeText={setSellerNote}
                      multiline
                      numberOfLines={3}
                    />
                    <View style={styles.modalActions}>
                      <TouchableOpacity
                        style={[styles.modalButton, styles.modalCancelButton]}
                        onPress={() => {
                          setShowStatusModal(false);
                          setSellerNote('');
                        }}
                      >
                        <Text style={styles.modalCancelText}>Hủy</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.modalButton, styles.modalConfirmButton, updating && styles.modalButtonDisabled]}
                        onPress={() => {
                          if (selectedOrder && getNextStatus(selectedOrder.status as OrderStatus)) {
                            handleUpdateStatus(
                              selectedOrder.id,
                              getNextStatus(selectedOrder.status as OrderStatus)!
                            );
                          }
                        }}
                        disabled={updating}
                      >
                        {updating ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <Text style={styles.modalConfirmText}>Xác nhận</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Tracking Modal */}
      <Modal
        visible={showTrackingModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTrackingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cập nhật mã vận đơn</Text>
            <Text style={styles.modalLabel}>Mã vận đơn *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Nhập mã vận đơn"
              value={trackingNumber}
              onChangeText={setTrackingNumber}
              autoCapitalize="characters"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  setShowTrackingModal(false);
                  setTrackingNumber('');
                }}
              >
                <Text style={styles.modalCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirmButton, updating && styles.modalButtonDisabled]}
                onPress={() => {
                  if (selectedOrder) {
                    handleUpdateTracking(selectedOrder.id);
                  }
                }}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalConfirmText}>Lưu</Text>
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
  filterContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E4E7EB',
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F7FA',
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  filterTextActive: {
    color: '#fff',
  },
  filterBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  filterBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  listContent: {
    padding: 16,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 12,
    color: '#999',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  productRow: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  orderDetails: {
    marginBottom: 12,
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 13,
    color: '#666',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  orderActions: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  trackingButton: {
    backgroundColor: '#E3F2FD',
  },
  updateButton: {
    backgroundColor: colors.primary,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
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
    marginTop: 16,
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
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
    marginBottom: 8,
  },
  modalValue: {
    fontSize: 15,
    color: '#666',
    marginBottom: 12,
  },
  modalInput: {
    backgroundColor: '#F5F7FA',
    borderWidth: 1,
    borderColor: '#E4E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
  },
  modalTextArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
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
    backgroundColor: colors.primary,
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

