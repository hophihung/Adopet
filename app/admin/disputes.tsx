import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, AlertCircle, CheckCircle, XCircle, MessageSquare } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { DisputeService, EscrowDispute, DisputeMessage } from '@/src/features/disputes/services/dispute.service';
import { colors } from '@/src/theme/colors';

const RESOLUTION_TYPES = [
  { value: 'refund_buyer', label: 'Hoàn tiền cho người mua' },
  { value: 'release_to_seller', label: 'Giải phóng tiền cho người bán' },
  { value: 'partial_refund', label: 'Hoàn tiền một phần' },
  { value: 'no_action', label: 'Không có hành động' },
] as const;

export default function AdminDisputesScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [disputes, setDisputes] = useState<EscrowDispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState<EscrowDispute | null>(null);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [resolutionType, setResolutionType] = useState<EscrowDispute['resolution_type']>('refund_buyer');
  const [resolution, setResolution] = useState('');
  const [resolutionAmount, setResolutionAmount] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | EscrowDispute['status']>('all');

  // Note: In production, verify admin role
  const isAdmin = profile?.role === 'admin' || true; // For now, allow all

  useEffect(() => {
    if (isAdmin) {
      loadDisputes();
    } else {
      Alert.alert('Lỗi', 'Chỉ admin mới có thể truy cập');
      router.back();
    }
  }, [isAdmin, statusFilter]);

  const loadDisputes = async () => {
    try {
      setLoading(true);
      // In production, get all disputes (admin only)
      // For now, we'll use a different approach - get disputes by admin query
      const { supabase } = await import('@/lib/supabase');
      const { data, error } = await supabase
        .from('escrow_disputes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const filtered = statusFilter === 'all' 
        ? data 
        : data.filter(d => d.status === statusFilter);
      setDisputes(filtered || []);
    } catch (error: any) {
      console.error('Error loading disputes:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách tranh chấp');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedDispute || !user?.id) return;

    if (!resolution.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập quyết định xử lý');
      return;
    }

    if (resolutionType === 'partial_refund' && !resolutionAmount.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập số tiền hoàn lại');
      return;
    }

    try {
      setResolving(true);
      await DisputeService.resolve(
        selectedDispute.id,
        user.id,
        resolution.trim(),
        resolutionType,
        resolutionType === 'partial_refund' ? parseFloat(resolutionAmount) : undefined
      );
      setShowResolveModal(false);
      setResolution('');
      setResolutionAmount('');
      await loadDisputes();
      Alert.alert('Thành công', 'Đã xử lý tranh chấp');
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể xử lý tranh chấp');
    } finally {
      setResolving(false);
    }
  };

  const getStatusColor = (status: EscrowDispute['status']) => {
    switch (status) {
      case 'open': return '#FF9500';
      case 'under_review': return '#007AFF';
      case 'resolved': return '#4CAF50';
      case 'closed': return '#999';
      case 'cancelled': return '#FF3B30';
      default: return '#999';
    }
  };

  const getStatusText = (status: EscrowDispute['status']) => {
    switch (status) {
      case 'open': return 'Mở';
      case 'under_review': return 'Đang xem xét';
      case 'resolved': return 'Đã xử lý';
      case 'closed': return 'Đã đóng';
      case 'cancelled': return 'Đã hủy';
      default: return status;
    }
  };

  const getDisputeTypeText = (type: EscrowDispute['dispute_type']) => {
    switch (type) {
      case 'product_not_received': return 'Không nhận được sản phẩm';
      case 'product_damaged': return 'Sản phẩm bị hỏng';
      case 'product_not_as_described': return 'Sản phẩm không đúng mô tả';
      case 'seller_not_responding': return 'Người bán không phản hồi';
      case 'other': return 'Khác';
      default: return type;
    }
  };

  const renderDispute = ({ item }: { item: EscrowDispute }) => {
    return (
      <TouchableOpacity
        style={styles.disputeCard}
        onPress={() => {
          setSelectedDispute(item);
          setShowResolveModal(true);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.disputeHeader}>
          <View style={styles.disputeInfo}>
            <Text style={styles.disputeId}>Tranh chấp #{item.id.substring(0, 8)}</Text>
            <Text style={styles.disputeDate}>
              {new Date(item.created_at).toLocaleDateString('vi-VN')}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {getStatusText(item.status)}
            </Text>
          </View>
        </View>

        <View style={styles.disputeDetails}>
          <Text style={styles.disputeType}>{getDisputeTypeText(item.dispute_type)}</Text>
          <Text style={styles.disputeReason} numberOfLines={2}>
            {item.reason}
          </Text>
          <Text style={styles.disputeDescription} numberOfLines={3}>
            {item.description}
          </Text>
        </View>

        {item.status === 'open' || item.status === 'under_review' ? (
          <View style={styles.disputeActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                setSelectedDispute(item);
                setShowResolveModal(true);
              }}
            >
              <CheckCircle size={16} color="#fff" />
              <Text style={styles.actionButtonText}>Xử lý</Text>
            </TouchableOpacity>
          </View>
        ) : item.resolution && (
          <View style={styles.resolutionBox}>
            <Text style={styles.resolutionLabel}>Quyết định:</Text>
            <Text style={styles.resolutionText}>{item.resolution}</Text>
            {item.resolution_type && (
              <Text style={styles.resolutionType}>
                Loại: {item.resolution_type === 'refund_buyer' ? 'Hoàn tiền người mua' :
                       item.resolution_type === 'release_to_seller' ? 'Giải phóng cho người bán' :
                       item.resolution_type === 'partial_refund' ? 'Hoàn tiền một phần' : 'Không có hành động'}
              </Text>
            )}
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
    all: disputes.length,
    open: disputes.filter(d => d.status === 'open').length,
    under_review: disputes.filter(d => d.status === 'under_review').length,
    resolved: disputes.filter(d => d.status === 'resolved').length,
    closed: disputes.filter(d => d.status === 'closed').length,
    cancelled: disputes.filter(d => d.status === 'cancelled').length,
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
          <Text style={styles.headerTitle}>Quản lý tranh chấp</Text>
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
        {(['all', 'open', 'under_review', 'resolved', 'closed', 'cancelled'] as const).map((status) => (
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
              {status === 'all' ? 'Tất cả' : getStatusText(status)}
            </Text>
            {statusCounts[status] > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{statusCounts[status]}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {disputes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <AlertCircle size={64} color="#ccc" />
          <Text style={styles.emptyText}>
            {statusFilter === 'all' ? 'Chưa có tranh chấp nào' : `Không có tranh chấp ${getStatusText(statusFilter).toLowerCase()}`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={disputes}
          renderItem={renderDispute}
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
                loadDisputes();
              }}
            />
          }
        />
      )}

      {/* Resolve Modal */}
      <Modal
        visible={showResolveModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowResolveModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Xử lý tranh chấp</Text>
            {selectedDispute && (
              <>
                <Text style={styles.modalSubtitle}>
                  Tranh chấp #{selectedDispute.id.substring(0, 8)}
                </Text>
                <Text style={styles.modalLabel}>Loại tranh chấp:</Text>
                <Text style={styles.modalValue}>
                  {getDisputeTypeText(selectedDispute.dispute_type)}
                </Text>
                <Text style={styles.modalLabel}>Lý do:</Text>
                <Text style={styles.modalValue}>{selectedDispute.reason}</Text>
                <Text style={styles.modalLabel}>Mô tả:</Text>
                <Text style={styles.modalValue}>{selectedDispute.description}</Text>

                <Text style={styles.modalLabel}>Quyết định xử lý *</Text>
                {RESOLUTION_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.modalTypeButton,
                      resolutionType === type.value && styles.modalTypeButtonActive,
                    ]}
                    onPress={() => setResolutionType(type.value)}
                  >
                    <Text
                      style={[
                        styles.modalTypeButtonText,
                        resolutionType === type.value && styles.modalTypeButtonTextActive,
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}

                {resolutionType === 'partial_refund' && (
                  <>
                    <Text style={styles.modalLabel}>Số tiền hoàn lại *</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="Nhập số tiền"
                      value={resolutionAmount}
                      onChangeText={setResolutionAmount}
                      keyboardType="numeric"
                    />
                  </>
                )}

                <Text style={styles.modalLabel}>Ghi chú quyết định *</Text>
                <TextInput
                  style={[styles.modalInput, styles.modalTextArea]}
                  placeholder="Nhập quyết định và lý do xử lý..."
                  value={resolution}
                  onChangeText={setResolution}
                  multiline
                  numberOfLines={4}
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalCancelButton]}
                    onPress={() => {
                      setShowResolveModal(false);
                      setResolution('');
                      setResolutionAmount('');
                    }}
                  >
                    <Text style={styles.modalCancelText}>Hủy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalConfirmButton, resolving && styles.modalButtonDisabled]}
                    onPress={handleResolve}
                    disabled={resolving}
                  >
                    {resolving ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.modalConfirmText}>Xác nhận</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
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
  disputeCard: {
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
  disputeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  disputeInfo: {
    flex: 1,
  },
  disputeId: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  disputeDate: {
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
  disputeDetails: {
    marginBottom: 12,
  },
  disputeType: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 8,
  },
  disputeReason: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  disputeDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  disputeActions: {
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
    backgroundColor: colors.primary,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  resolutionBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F5F7FA',
    borderRadius: 8,
  },
  resolutionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  resolutionText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
  resolutionType: {
    fontSize: 12,
    color: '#999',
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
    maxWidth: 500,
    maxHeight: '90%',
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
  modalTypeButton: {
    backgroundColor: '#F5F7FA',
    borderWidth: 1,
    borderColor: '#E4E7EB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  modalTypeButtonActive: {
    borderColor: colors.primary,
    backgroundColor: '#E3F2FD',
  },
  modalTypeButtonText: {
    fontSize: 14,
    color: '#333',
  },
  modalTypeButtonTextActive: {
    color: colors.primary,
    fontWeight: '600',
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
    height: 100,
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

