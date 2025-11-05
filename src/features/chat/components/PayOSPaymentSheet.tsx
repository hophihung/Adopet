import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { X, CreditCard, QrCode, ExternalLink } from 'lucide-react-native';
import { PayOSTransactionService } from '../services/payos-transaction.service';
import { PAYOS_CONFIG } from '@/src/config/payos.config';
import { colors } from '@/src/theme/colors';

interface PayOSPaymentSheetProps {
  visible: boolean;
  transactionId: string;
  amount: number;
  petName: string;
  transactionCode: string;
  onSuccess: () => void;
  onCancel: () => void;
}

/**
 * PayOS Payment Sheet for Transactions
 * 
 * PayOS là payment gateway của Việt Nam, hỗ trợ:
 * - QR Code thanh toán
 * - Payment link
 * - Webhook để xác nhận thanh toán
 */
export function PayOSPaymentSheet({
  visible,
  transactionId,
  amount,
  petName,
  transactionCode,
  onSuccess,
  onCancel,
}: PayOSPaymentSheetProps) {
  const [loading, setLoading] = useState(false);
  const [creatingPayment, setCreatingPayment] = useState(false);
  const [paymentLink, setPaymentLink] = useState<{
    payment_url: string;
    payment_link_id: string;
    qr_code: string;
  } | null>(null);

  // Note: PayOS credentials are stored in Supabase Secrets
  // Client app doesn't need them, Edge Function handles API calls
  useEffect(() => {
    // No need to check credentials here, Edge Function will handle validation
  }, [visible]);

  const createPaymentLink = async () => {
    try {
      setCreatingPayment(true);

      const link = await PayOSTransactionService.createPaymentLink(
        transactionId,
        amount,
        petName,
        transactionCode
      );

      setPaymentLink(link);
    } catch (error: any) {
      console.error('Error creating payment link:', error);
      Alert.alert('Lỗi', error.message || 'Không thể tạo payment link');
    } finally {
      setCreatingPayment(false);
    }
  };

  const handleOpenPaymentLink = async () => {
    if (!paymentLink?.payment_url) return;

    try {
      const canOpen = await Linking.canOpenURL(paymentLink.payment_url);
      if (canOpen) {
        await Linking.openURL(paymentLink.payment_url);
      } else {
        Alert.alert('Lỗi', 'Không thể mở payment link');
      }
    } catch (error: any) {
      console.error('Error opening payment link:', error);
      Alert.alert('Lỗi', 'Không thể mở payment link');
    }
  };

  const handleCheckPayment = async () => {
    if (!paymentLink?.payment_link_id) return;

    try {
      setLoading(true);
      
      // Kiểm tra trạng thái thanh toán từ PayOS
      const paymentInfo = await PayOSTransactionService.getPaymentLinkInfo(
        paymentLink.payment_link_id
      );

      // Check if payment is completed (PayOS đã nhận tiền)
      // PayOS trả về status: 'PAID', 'CANCELLED', 'PENDING', etc.
      if (paymentInfo.status === 'PAID' || paymentInfo.status === 'success' || paymentInfo.status === 'COMPLETED') {
        // PayOS đã xác nhận nhận tiền, mới confirm transaction
        await PayOSTransactionService.confirmTransactionAfterPayment(
          transactionId,
          paymentLink.payment_link_id
        );

        Alert.alert('Thành công', 'PayOS đã xác nhận nhận tiền. Giao dịch đã hoàn thành!');
        onSuccess();
      } else if (paymentInfo.status === 'CANCELLED' || paymentInfo.status === 'EXPIRED') {
        Alert.alert(
          'Thanh toán đã hủy',
          'Giao dịch thanh toán đã bị hủy hoặc hết hạn. Vui lòng thử lại.'
        );
      } else {
        // PENDING hoặc các status khác
        Alert.alert(
          'Đang chờ PayOS xác nhận',
          'PayOS chưa xác nhận nhận tiền. Vui lòng đợi vài giây rồi thử lại.\n\nTrạng thái: ' + (paymentInfo.status || 'PENDING')
        );
      }
    } catch (error: any) {
      console.error('Error checking payment:', error);
      Alert.alert('Lỗi', error.message || 'Không thể kiểm tra trạng thái thanh toán');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      createPaymentLink();
    } else {
      setPaymentLink(null);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onCancel}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Thanh toán qua PayOS</Text>
          <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
            <X size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.petInfo}>
            <CreditCard size={48} color={colors.primary} />
            <Text style={styles.petName}>{petName}</Text>
            <Text style={styles.amount}>
              {amount.toLocaleString('vi-VN')} VNĐ
            </Text>
            <Text style={styles.transactionCode}>
              Mã: {transactionCode}
            </Text>
          </View>

          {creatingPayment ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Đang tạo payment link...</Text>
            </View>
          ) : paymentLink ? (
            <View style={styles.paymentContainer}>
              <Text style={styles.instructionTitle}>
                Vui lòng thanh toán bằng một trong các cách sau:
              </Text>

              {/* QR Code */}
              {paymentLink.qr_code && (
                <View style={styles.qrSection}>
                  <Text style={styles.qrLabel}>Quét QR Code:</Text>
                  <View style={styles.qrContainer}>
                    <QrCode size={200} color="#333" />
                    <Text style={styles.qrNote}>
                      QR Code sẽ được hiển thị ở đây
                    </Text>
                    <Text style={styles.qrNoteSmall}>
                      (Cần render QR code từ payment_link_id)
                    </Text>
                  </View>
                </View>
              )}

              {/* Payment Link */}
              <View style={styles.linkSection}>
                <TouchableOpacity
                  style={styles.paymentLinkButton}
                  onPress={handleOpenPaymentLink}
                >
                  <ExternalLink size={20} color="#fff" />
                  <Text style={styles.paymentLinkText}>
                    Mở link thanh toán PayOS
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Check Payment Button */}
              <TouchableOpacity
                style={[styles.checkButton, loading && styles.checkButtonDisabled]}
                onPress={handleCheckPayment}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.checkButtonText}>
                      Kiểm tra trạng thái thanh toán
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <Text style={styles.noteText}>
                💡 Sau khi thanh toán thành công, nhấn "Kiểm tra trạng thái thanh toán" 
                để xác nhận giao dịch.
              </Text>
            </View>
          ) : (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>
                Không thể tạo payment link. Vui lòng thử lại.
              </Text>
            </View>
          )}

          <View style={styles.securityBadge}>
            <Text style={styles.securityText}>
              🔒 Bảo mật bởi PayOS • Thông tin thanh toán được mã hóa
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  petInfo: {
    alignItems: 'center',
    marginBottom: 32,
    paddingVertical: 24,
  },
  petName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
    marginBottom: 8,
  },
  amount: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 8,
  },
  transactionCode: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#666',
  },
  paymentContainer: {
    flex: 1,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 24,
    textAlign: 'center',
  },
  qrSection: {
    marginBottom: 24,
    alignItems: 'center',
  },
  qrLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  qrContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    minHeight: 250,
    justifyContent: 'center',
    width: '100%',
  },
  qrNote: {
    fontSize: 14,
    color: '#999',
    marginTop: 12,
    textAlign: 'center',
  },
  qrNoteSmall: {
    fontSize: 12,
    color: '#ccc',
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  linkSection: {
    marginBottom: 16,
  },
  paymentLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B35',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  paymentLinkText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  checkButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  checkButtonDisabled: {
    opacity: 0.6,
  },
  checkButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  noteText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#F44336',
    textAlign: 'center',
  },
  securityBadge: {
    marginTop: 24,
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  securityText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});

