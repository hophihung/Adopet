import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { CheckCircle2, Copy, Upload, CreditCard } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import { TransactionService, Transaction } from '../services/transaction.service';
import { PayOSTransactionService } from '../services/payos-transaction.service';
import { imageUploadService } from '@/src/services/imageUpload.service';
import { colors } from '@/src/theme/colors';
import { PAYOS_CONFIG } from '@/src/config/payos.config';
import { PayOSPaymentSheet } from './PayOSPaymentSheet';

interface TransactionCardProps {
  transaction: Transaction;
  isSeller: boolean;
  isBuyer: boolean;
  onUpdate?: (transaction: Transaction) => void;
}

export function TransactionCard({
  transaction,
  isSeller,
  isBuyer,
  onUpdate,
}: TransactionCardProps) {
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [showPayOSSheet, setShowPayOSSheet] = useState(false);
  const [payosQRCode, setPayosQRCode] = useState<string | null>(null);
  const [creatingPaymentLink, setCreatingPaymentLink] = useState(false);

  const copyCode = () => {
    Alert.alert(
      'Mã giao dịch',
      transaction.transaction_code,
      [
        { text: 'Đóng', style: 'cancel' },
      ]
    );
  };

  const handleUploadProof = async () => {
    try {
      setUploading(true);
      
      // Request permissions
      const hasPermission = await imageUploadService.requestPermissions();
      if (!hasPermission) {
        Alert.alert('Lỗi', 'Cần quyền truy cập ảnh để upload chứng từ');
        return;
      }

      // Pick image
      const imageUri = await imageUploadService.pickImage({
        quality: 0.8,
        maxWidth: 1920,
        maxHeight: 1920,
        allowsEditing: true,
      });

      if (!imageUri) return;

      // Upload to Supabase Storage
      const result = await imageUploadService.uploadImage(
        imageUri,
        'pet-images', // You can create a separate bucket for transaction proofs
        'transaction-proofs'
      );

      if (!result?.url) {
        Alert.alert('Lỗi', 'Không thể upload ảnh chứng từ');
        return;
      }

      // Confirm transaction with proof
      setConfirming(true);
      const updatedTransaction = await TransactionService.confirmTransaction(
        transaction.id,
        result.url
      );

      if (onUpdate) {
        onUpdate(updatedTransaction);
      }

      Alert.alert('Thành công', 'Đã xác nhận giao dịch thành công!');
    } catch (error: any) {
      console.error('Error uploading proof:', error);
      Alert.alert('Lỗi', error.message || 'Không thể xác nhận giao dịch');
    } finally {
      setUploading(false);
      setConfirming(false);
    }
  };

  const handleConfirmWithoutProof = async () => {
    try {
      setConfirming(true);
      const updatedTransaction = await TransactionService.confirmTransaction(
        transaction.id
      );

      if (onUpdate) {
        onUpdate(updatedTransaction);
      }

      Alert.alert('Thành công', 'Đã xác nhận giao dịch thành công!');
    } catch (error: any) {
      console.error('Error confirming transaction:', error);
      Alert.alert('Lỗi', error.message || 'Không thể xác nhận giao dịch');
    } finally {
      setConfirming(false);
    }
  };

  const handlePayOSPayment = () => {
    // PayOS credentials are stored in Supabase Secrets
    // Edge Function will handle validation, no need to check here
    // Open PayOS Payment Sheet
    setShowPayOSSheet(true);
  };

  const handlePayOSPaymentSuccess = async () => {
    setShowPayOSSheet(false);
    // Reload transaction to get updated status
    if (onUpdate) {
      const updatedTransaction = await TransactionService.getTransaction(transaction.id);
      onUpdate(updatedTransaction);
    }
  };

  // Tự động tạo PayOS payment link và lấy QR code khi transaction được render
  useEffect(() => {
    const createPayOSPaymentLink = async () => {
      // Chỉ tạo nếu transaction đang pending và chưa có QR code
      if (transaction.status !== 'pending' || payosQRCode) {
        return;
      }

      // Check: Nếu amount = 0 hoặc miễn phí thì không tạo QR code PayOS
      if (!transaction.amount || transaction.amount <= 0) {
        setCreatingPaymentLink(false);
        return;
      }

      // Nếu đã có payos_payment_link_id trong transaction, fetch QR code
      if ((transaction as any).payos_payment_link_id) {
        try {
          const paymentInfo = await PayOSTransactionService.getPaymentLinkInfo(
            (transaction as any).payos_payment_link_id
          );
          if (paymentInfo.qr_code) {
            setPayosQRCode(paymentInfo.qr_code);
          }
        } catch (error) {
          console.error('Error fetching payment info:', error);
        }
        return;
      }

      // Tạo payment link mới (chỉ khi amount > 0)
      try {
        setCreatingPaymentLink(true);
        const petName = transaction.pet?.name || 'Thú cưng';
        const paymentLink = await PayOSTransactionService.createPaymentLink(
          transaction.id,
          transaction.amount,
          petName,
          transaction.transaction_code
        );

        if (paymentLink.qr_code) {
          setPayosQRCode(paymentLink.qr_code);
        }
      } catch (error) {
        console.error('Error creating PayOS payment link:', error);
        // Không hiển thị alert để tránh spam, chỉ log error
      } finally {
        setCreatingPaymentLink(false);
      }
    };

    createPayOSPaymentLink();
  }, [transaction.id, transaction.status, transaction.amount]);

  if (transaction.status === 'completed') {
    return (
      <View style={[styles.container, styles.completedContainer]}>
        <View style={styles.header}>
          <CheckCircle2 size={20} color="#4CAF50" />
          <Text style={styles.completedTitle}>Giao dịch đã hoàn thành</Text>
        </View>
        <Text style={styles.completedText}>
          Mã giao dịch: {transaction.transaction_code}
        </Text>
        <Text style={styles.completedText}>
          Số tiền: {transaction.amount.toLocaleString('vi-VN')} VNĐ
        </Text>
        {transaction.completed_at && (
          <Text style={styles.completedDate}>
            Hoàn thành: {new Date(transaction.completed_at).toLocaleString('vi-VN')}
          </Text>
        )}
      </View>
    );
  }

  if (transaction.status === 'cancelled') {
    return (
      <View style={[styles.container, styles.cancelledContainer]}>
        <Text style={styles.cancelledTitle}>Giao dịch đã hủy</Text>
        <Text style={styles.cancelledText}>
          Mã giao dịch: {transaction.transaction_code}
        </Text>
      </View>
    );
  }

  // Pending transaction
  const petImage = transaction.pet?.images?.[0] || null;
  const petName = transaction.pet?.name || 'Thú cưng';
  
  return (
    <View style={[styles.container, styles.pendingContainer]}>
      <View style={styles.header}>
        <Text style={styles.title}>Giao dịch đang chờ</Text>
      </View>

      {/* Pet Image Section */}
      {petImage && (
        <View style={styles.petImageSection}>
          <Image
            source={{ uri: petImage }}
            style={styles.petImage}
            resizeMode="cover"
          />
          <Text style={styles.petName}>{petName}</Text>
        </View>
      )}

      {/* Chỉ hiển thị mã giao dịch nếu có số tiền > 0 */}
      {transaction.amount > 0 && (
        <View style={styles.codeSection}>
          <Text style={styles.label}>Mã giao dịch:</Text>
          <View style={styles.codeContainer}>
            <Text style={styles.codeText}>{transaction.transaction_code}</Text>
            <TouchableOpacity onPress={copyCode} style={styles.copyButton}>
              <Copy size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.amountSection}>
        <Text style={styles.label}>Số tiền:</Text>
        <Text style={styles.amountText}>
          {transaction.amount.toLocaleString('vi-VN')} VNĐ
        </Text>
      </View>

      {/* QR Code Section - QR code từ PayOS (QR ngân hàng) */}
      {/* Chỉ hiển thị QR code nếu có số tiền > 0 */}
      {transaction.amount > 0 ? (
        <View style={styles.qrSection}>
          <Text style={styles.qrLabel}>Quét QR để thanh toán:</Text>
          <View style={styles.qrContainer}>
            {creatingPaymentLink ? (
              <ActivityIndicator size="large" color={colors.primary} />
            ) : payosQRCode ? (
              <QRCode
                value={payosQRCode}
                size={200}
                color="#000"
                backgroundColor="#fff"
                logo={undefined}
                logoSize={30}
                logoBackgroundColor="#fff"
                logoMargin={2}
                logoBorderRadius={15}
                quietZone={10}
              />
            ) : (
              <View style={styles.qrPlaceholder}>
                <Text style={styles.qrPlaceholderText}>
                  Đang tạo QR code...
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.qrInfoText}>
            Mã: {transaction.transaction_code}
          </Text>
          <Text style={styles.qrInfoText}>
            Số tiền: {transaction.amount.toLocaleString('vi-VN')} VNĐ
          </Text>
          <Text style={styles.qrNoteText}>
            💳 QR Code từ PayOS - Quét bằng app ngân hàng
          </Text>
        </View>
      ) : (
        <View style={styles.freeTransactionSection}>
          <Text style={styles.freeTransactionTitle}>🎉 Miễn phí</Text>
          <Text style={styles.freeTransactionText}>
            Giao dịch này hoàn toàn miễn phí. Không cần thanh toán.
          </Text>
        </View>
      )}

      {transaction.payment_proof_url && (
        <View style={styles.proofSection}>
          <Text style={styles.label}>Ảnh chứng từ:</Text>
          <Image
            source={{ uri: transaction.payment_proof_url }}
            style={styles.proofImage}
          />
        </View>
      )}

      {isSeller && (
        <View style={styles.sellerInfo}>
          <Text style={styles.infoText}>
            Bạn đã gửi mã giao dịch. Đang chờ người mua chuyển khoản và xác nhận.
          </Text>
        </View>
      )}

      {isBuyer && (
        <View style={styles.buyerActions}>
          <Text style={styles.instructionText}>
            Chọn phương thức thanh toán:
          </Text>
          
          {/* PayOS Payment Button */}
          <TouchableOpacity
            style={[styles.button, styles.payosButton]}
            onPress={handlePayOSPayment}
            disabled={uploading || confirming}
          >
            <CreditCard size={18} color="#fff" />
            <Text style={styles.buttonText}>Thanh toán qua PayOS</Text>
          </TouchableOpacity>

          <Text style={styles.dividerText}>Hoặc</Text>
          
          <Text style={styles.instructionText}>
            Vui lòng chuyển khoản theo mã giao dịch trên, sau đó xác nhận:
          </Text>
          
          {!transaction.payment_proof_url && (
            <TouchableOpacity
              style={[styles.button, styles.uploadButton]}
              onPress={handleUploadProof}
              disabled={uploading || confirming}
            >
              {uploading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Upload size={18} color="#fff" />
                  <Text style={styles.buttonText}>Upload ảnh chứng từ</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.button, styles.confirmButton]}
            onPress={
              transaction.payment_proof_url
                ? handleConfirmWithoutProof
                : handleConfirmWithoutProof
            }
            disabled={uploading || confirming}
          >
            {confirming ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <CheckCircle2 size={18} color="#fff" />
                <Text style={styles.buttonText}>Xác nhận đã chuyển khoản</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* PayOS Payment Sheet Modal */}
      <PayOSPaymentSheet
        visible={showPayOSSheet}
        transactionId={transaction.id}
        amount={transaction.amount}
        petName={petName}
        transactionCode={transaction.transaction_code}
        onSuccess={handlePayOSPaymentSuccess}
        onCancel={() => setShowPayOSSheet(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
  },
  pendingContainer: {
    backgroundColor: '#FFF9E6',
    borderColor: '#FFD700',
  },
  completedContainer: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  cancelledContainer: {
    backgroundColor: '#FFEBEE',
    borderColor: '#F44336',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  completedTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4CAF50',
  },
  cancelledTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F44336',
  },
  codeSection: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  codeText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    flex: 1,
    letterSpacing: 2,
  },
  copyButton: {
    padding: 4,
  },
  amountSection: {
    marginBottom: 12,
  },
  amountText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  petImageSection: {
    marginBottom: 16,
    alignItems: 'center',
  },
  qrSection: {
    marginBottom: 16,
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  qrLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  qrContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  qrInfoText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  qrPlaceholder: {
    width: 200,
    height: 200,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrPlaceholderText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  qrNoteText: {
    fontSize: 11,
    color: '#888',
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  freeTransactionSection: {
    marginBottom: 16,
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  freeTransactionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4CAF50',
    marginBottom: 8,
  },
  freeTransactionText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  petImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    marginBottom: 8,
  },
  petName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  proofSection: {
    marginBottom: 12,
  },
  proofImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginTop: 8,
  },
  sellerInfo: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#1976D2',
    textAlign: 'center',
  },
  buyerActions: {
    marginTop: 12,
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    textAlign: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
    marginBottom: 8,
  },
  payosButton: {
    backgroundColor: '#FF6B35', // PayOS brand color
    marginBottom: 8,
  },
  uploadButton: {
    backgroundColor: '#2196F3',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
  dividerText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#999',
    marginVertical: 12,
    fontWeight: '600',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  completedText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  completedDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  cancelledText: {
    fontSize: 14,
    color: '#666',
  },
});

