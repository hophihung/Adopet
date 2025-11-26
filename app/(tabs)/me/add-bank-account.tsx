import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { BankAccountService, CreateBankAccountInput } from '@/src/features/payout/services/bankAccount.service';
import { colors } from '@/src/theme/colors';

const VIETNAM_BANKS = [
  'Vietcombank',
  'BIDV',
  'VietinBank',
  'Agribank',
  'ACB',
  'Techcombank',
  'MBBank',
  'VPBank',
  'TPBank',
  'Sacombank',
  'HDBank',
  'SHB',
  'VIB',
  'Eximbank',
  'MSB',
  'OCB',
  'SeABank',
  'PVcomBank',
  'VietABank',
  'BacABank',
  'NamABank',
  'PGBank',
  'ABBank',
  'NCB',
  'OceanBank',
  'GPBank',
  'LienVietPostBank',
  'KienLongBank',
  'DongABank',
  'PublicBank',
  'SCB',
  'VCCB',
  'BAOVIET Bank',
  'VietBank',
  'CBBank',
  'OCEANBANK',
  'PGBank',
  'PVcomBank',
];

export default function AddBankAccountScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateBankAccountInput>({
    bank_name: '',
    account_number: '',
    account_holder_name: '',
    branch_name: '',
    is_primary: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showBankPicker, setShowBankPicker] = useState(false);

  const isSeller = profile?.role === 'seller';

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.bank_name.trim()) {
      newErrors.bank_name = 'Vui lòng chọn ngân hàng';
    }

    if (!formData.account_number.trim()) {
      newErrors.account_number = 'Vui lòng nhập số tài khoản';
    } else if (formData.account_number.length < 8) {
      newErrors.account_number = 'Số tài khoản phải có ít nhất 8 ký tự';
    }

    if (!formData.account_holder_name.trim()) {
      newErrors.account_holder_name = 'Vui lòng nhập tên chủ tài khoản';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !user?.id || !isSeller) return;

    try {
      setLoading(true);
      await BankAccountService.create(formData, user.id);
      Alert.alert('Thành công', 'Đã thêm tài khoản ngân hàng thành công', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error('Error creating bank account:', error);
      Alert.alert('Lỗi', error.message || 'Không thể thêm tài khoản ngân hàng');
    } finally {
      setLoading(false);
    }
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
          <Text style={styles.headerTitle}>Thêm tài khoản ngân hàng</Text>
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
        {/* Bank Name */}
        <View style={styles.section}>
          <Text style={styles.label}>Ngân hàng *</Text>
          <TouchableOpacity
            style={[styles.input, errors.bank_name && styles.inputError]}
            onPress={() => setShowBankPicker(true)}
          >
            <Text style={formData.bank_name ? styles.inputText : styles.placeholderText}>
              {formData.bank_name || 'Chọn ngân hàng'}
            </Text>
          </TouchableOpacity>
          {errors.bank_name && <Text style={styles.errorText}>{errors.bank_name}</Text>}
        </View>

        {/* Account Number */}
        <View style={styles.section}>
          <Text style={styles.label}>Số tài khoản *</Text>
          <TextInput
            style={[styles.input, errors.account_number && styles.inputError]}
            placeholder="Nhập số tài khoản"
            value={formData.account_number}
            onChangeText={(text) => setFormData({ ...formData, account_number: text })}
            keyboardType="numeric"
          />
          {errors.account_number && <Text style={styles.errorText}>{errors.account_number}</Text>}
        </View>

        {/* Account Holder Name */}
        <View style={styles.section}>
          <Text style={styles.label}>Tên chủ tài khoản *</Text>
          <TextInput
            style={[styles.input, errors.account_holder_name && styles.inputError]}
            placeholder="Nhập tên chủ tài khoản"
            value={formData.account_holder_name}
            onChangeText={(text) => setFormData({ ...formData, account_holder_name: text })}
          />
          {errors.account_holder_name && <Text style={styles.errorText}>{errors.account_holder_name}</Text>}
        </View>

        {/* Branch Name */}
        <View style={styles.section}>
          <Text style={styles.label}>Chi nhánh (Tùy chọn)</Text>
          <TextInput
            style={styles.input}
            placeholder="Nhập chi nhánh"
            value={formData.branch_name}
            onChangeText={(text) => setFormData({ ...formData, branch_name: text })}
          />
        </View>

        {/* Is Primary */}
        <View style={styles.section}>
          <View style={styles.switchRow}>
            <Text style={styles.label}>Đặt làm tài khoản chính</Text>
            <Switch
              value={formData.is_primary ?? false}
              onValueChange={(value) => setFormData({ ...formData, is_primary: value })}
              trackColor={{ false: '#ccc', true: colors.primary }}
            />
          </View>
          <Text style={styles.helperText}>
            Tài khoản chính sẽ được dùng để nhận thanh toán từ đơn hàng
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Thêm tài khoản</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Bank Picker Modal */}
      {showBankPicker && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn ngân hàng</Text>
              <TouchableOpacity onPress={() => setShowBankPicker(false)}>
                <Text style={styles.modalClose}>Đóng</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.bankList}>
              {VIETNAM_BANKS.map((bank) => (
                <TouchableOpacity
                  key={bank}
                  style={styles.bankItem}
                  onPress={() => {
                    setFormData({ ...formData, bank_name: bank });
                    setShowBankPicker(false);
                  }}
                >
                  <Text style={styles.bankItemText}>{bank}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
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
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E4E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    minHeight: 48,
    justifyContent: 'center',
  },
  inputText: {
    fontSize: 15,
    color: '#333',
  },
  placeholderText: {
    fontSize: 15,
    color: '#999',
  },
  inputError: {
    borderColor: '#FF3B30',
    borderWidth: 2,
  },
  errorText: {
    fontSize: 13,
    color: '#FF3B30',
    marginTop: 6,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E4E7EB',
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#D4D6DC',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E4E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  modalClose: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  bankList: {
    maxHeight: 400,
  },
  bankItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  bankItemText: {
    fontSize: 15,
    color: '#333',
  },
});

