import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Check, X, DollarSign } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { PayoutService, PayoutRecord } from '@/src/features/payout/services/payout.service';
import { colors } from '@/src/theme/colors';

export default function AdminPayoutsScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState<PayoutRecord | null>(null);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [externalTransactionId, setExternalTransactionId] = useState('');
  const [adminNote, setAdminNote] = useState('');

  // Check if user is admin (you may need to add admin role check)
  const isAdmin = profile?.role === 'admin' || profile?.email?.includes('admin');

  useEffect(() => {
    if (!isAdmin) {
      Alert.alert('Lỗi', 'Chỉ admin mới có thể truy cập trang này');
      router.back();
      return;
    }
    loadPayouts();
  }, [isAdmin]);

  const loadPayouts = async () => {
    try {
      setLoading(true);
      const data = await PayoutService.getPending();
      setPayouts(data);
    } catch (error: any) {
      console.error('Error loading payouts:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách payout');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleProcessPayout = async (payout: PayoutRecord) => {
    setSelectedPayout(payout);
    setShowProcessModal(true);
  };

  const handleCompletePayout = async () => {
    if (!selectedPayout) return;

    if (!externalTransactionId.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập mã giao dịch');
      return;
    }

    try {
      setProcessing(true);
      await PayoutService.updateStatus(
        selectedPayout.id,
        'completed',
        externalTransactionId,
        undefined,
        adminNote
      );
      Alert.alert('Thành công', 'Đã cập nhật trạng thái payout thành công');
      setShowProcessModal(false);
      setExternalTransactionId('');
      setAdminNote('');
      await loadPayouts();
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể cập nhật payout');
    } finally {
      setProcessing(false);
    }
  };

  const handleFailPayout = async (payout: PayoutRecord) => {
    Alert.prompt(
      'Lý do thất bại',
      'Nhập lý do payout thất bại:',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận',
          onPress: async (reason) => {
            try {
              await PayoutService.updateStatus(
                payout.id,
                'failed',
                undefined,
                reason || 'Không xác định',
                undefined
              );
              Alert.alert('Thành công', 'Đã đánh dấu payout thất bại');
              await loadPayouts();
            } catch (error: any) {
              Alert.alert('Lỗi', error.message || 'Không thể cập nhật payout');
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  };

  const renderPayout = ({ item }: { item: PayoutRecord }) => {
    return (
      <View style={styles.payoutCard}>
        <View style={styles.payoutHeader}>
          <View style={styles.payoutIcon}>
            <DollarSign size={24} color={colors.primary} />
          </View>
          <View style={styles.payoutInfo}>
            <Text style={styles.payoutAmount}>{formatPrice(item.payout_amount)}</Text>
            <Text style={styles.payoutSeller}>Seller ID: {item.seller_id.substring(0, 8)}...</Text>
            {item.bank_name && (
              <Text style={styles.payoutBank}>{item.bank_name} - {item.account_number}</Text>
            )}
            <Text style={styles.payoutDate}>
              {new Date(item.created_at).toLocaleString('vi-VN')}
            </Text>
          </View>
        </View>

        <View style={styles.payoutDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Phí nền tảng:</Text>
            <Text style={styles.detailValue}>{formatPrice(item.platform_fee)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Phương thức:</Text>
            <Text style={styles.detailValue}>{item.payout_method}</Text>
          </View>
          {item.status === 'completed' && item.external_transaction_id && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Mã giao dịch:</Text>
              <Text style={styles.detailValue}>{item.external_transaction_id}</Text>
            </View>
          )}
        </View>

        <View style={styles.payoutActions}>
          {item.status === 'pending' && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.completeButton]}
                onPress={() => handleProcessPayout(item)}
              >
                <Check size={16} color="#fff" />
                <Text style={styles.actionButtonText}>Hoàn thành</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.failButton]}
                onPress={() => handleFailPayout(item)}
              >
                <X size={16} color="#fff" />
                <Text style={styles.actionButtonText}>Thất bại</Text>
              </TouchableOpacity>
            </>
          )}
          {item.status === 'completed' && (
            <View style={styles.completedBadge}>
              <Check size={16} color="#4CAF50" />
              <Text style={styles.completedText}>Đã hoàn thành</Text>
            </View>
          )}
          {item.status === 'failed' && (
            <View style={styles.failedBadge}>
              <X size={16} color="#FF3B30" />
              <Text style={styles.failedText}>Thất bại</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
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
          <Text style={styles.headerTitle}>Quản lý Payout</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      {payouts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <DollarSign size={64} color="#ccc" />
          <Text style={styles.emptyText}>Không có payout đang chờ</Text>
        </View>
      ) : (
        <FlatList
          data={payouts}
          renderItem={renderPayout}
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
                loadPayouts();
              }}
            />
          }
        />
      )}

      {/* Process Payout Modal */}
      <Modal
        visible={showProcessModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowProcessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Hoàn thành Payout</Text>
            <Text style={styles.modalSubtitle}>
              Nhập mã giao dịch từ ngân hàng hoặc payment gateway
            </Text>

            <Text style={styles.modalLabel}>Mã giao dịch *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="VD: BANK_REF_123456"
              value={externalTransactionId}
              onChangeText={setExternalTransactionId}
            />

            <Text style={styles.modalLabel}>Ghi chú (Tùy chọn)</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              placeholder="Ghi chú cho payout này..."
              value={adminNote}
              onChangeText={setAdminNote}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  setShowProcessModal(false);
                  setExternalTransactionId('');
                  setAdminNote('');
                }}
              >
                <Text style={styles.modalCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirmButton, processing && styles.modalButtonDisabled]}
                onPress={handleCompletePayout}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalConfirmText}>Xác nhận</Text>
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
  listContent: {
    padding: 16,
  },
  payoutCard: {
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
  payoutHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  payoutIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  payoutInfo: {
    flex: 1,
  },
  payoutAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  payoutSeller: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  payoutBank: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  payoutDate: {
    fontSize: 12,
    color: '#999',
  },
  payoutDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  payoutActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
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
  completeButton: {
    backgroundColor: '#4CAF50',
  },
  failButton: {
    backgroundColor: '#FF3B30',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  completedText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
  failedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE5E5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  failedText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '600',
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
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 12,
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

