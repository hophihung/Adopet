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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, AlertCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { OrderService, Order } from '@/src/features/products/services/order.service';
import { DisputeService, CreateDisputeInput } from '@/src/features/disputes/services/dispute.service';
import { colors } from '@/src/theme/colors';

const DISPUTE_TYPES = [
  { value: 'product_not_received', label: 'Không nhận được sản phẩm' },
  { value: 'product_damaged', label: 'Sản phẩm bị hỏng' },
  { value: 'product_not_as_described', label: 'Sản phẩm không đúng mô tả' },
  { value: 'seller_not_responding', label: 'Người bán không phản hồi' },
  { value: 'other', label: 'Khác' },
] as const;

export default function OpenDisputeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [disputeType, setDisputeType] = useState<CreateDisputeInput['dispute_type']>('other');
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');

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
      if (data && data.escrow_account_id) {
        setOrder(data);
      } else {
        Alert.alert('Lỗi', 'Đơn hàng không có escrow hoặc không tồn tại', [
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
    if (!order || !user?.id || !order.escrow_account_id) return;

    if (!reason.trim() || !description.trim()) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ lý do và mô tả');
      return;
    }

    try {
      setSubmitting(true);
      const input: CreateDisputeInput = {
        escrow_account_id: order.escrow_account_id,
        order_id: order.id,
        dispute_type: disputeType,
        reason: reason.trim(),
        description: description.trim(),
      };

      await DisputeService.create(input, user.id);
      Alert.alert(
        'Thành công',
        'Đã mở tranh chấp. Admin sẽ xem xét và xử lý trong thời gian sớm nhất.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể mở tranh chấp');
    } finally {
      setSubmitting(false);
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
          <Text style={styles.headerTitle}>Mở tranh chấp</Text>
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
        <View style={styles.warningCard}>
          <AlertCircle size={24} color="#FF9500" />
          <Text style={styles.warningText}>
            Khi mở tranh chấp, số tiền escrow sẽ bị khóa cho đến khi admin xử lý.
            Vui lòng cung cấp đầy đủ thông tin và bằng chứng.
          </Text>
        </View>

        {/* Dispute Type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Loại tranh chấp *</Text>
          {DISPUTE_TYPES.map((type) => (
            <TouchableOpacity
              key={type.value}
              style={[
                styles.typeButton,
                disputeType === type.value && styles.typeButtonActive,
              ]}
              onPress={() => setDisputeType(type.value)}
            >
              <Text
                style={[
                  styles.typeButtonText,
                  disputeType === type.value && styles.typeButtonTextActive,
                ]}
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Reason */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lý do *</Text>
          <TextInput
            style={styles.input}
            placeholder="Tóm tắt lý do tranh chấp"
            value={reason}
            onChangeText={setReason}
            maxLength={200}
          />
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mô tả chi tiết *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Mô tả chi tiết vấn đề, thời gian, và các thông tin liên quan..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={8}
            maxLength={2000}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{description.length}/2000</Text>
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
            <Text style={styles.submitButtonText}>Gửi tranh chấp</Text>
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
  warningCard: {
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#8B5A00',
    marginLeft: 12,
    lineHeight: 20,
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
  typeButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E4E7EB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  typeButtonActive: {
    borderColor: colors.primary,
    backgroundColor: '#E3F2FD',
  },
  typeButtonText: {
    fontSize: 15,
    color: '#333',
  },
  typeButtonTextActive: {
    color: colors.primary,
    fontWeight: '600',
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
    height: 150,
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

