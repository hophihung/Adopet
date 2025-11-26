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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Plus, Edit, Trash2, Check, Building2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { BankAccountService, SellerBankAccount } from '@/src/features/payout/services/bankAccount.service';
import { colors } from '@/src/theme/colors';

export default function BankAccountsScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [bankAccounts, setBankAccounts] = useState<SellerBankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isSeller = profile?.role === 'seller';

  useEffect(() => {
    if (!isSeller || !user?.id) {
      Alert.alert('Lỗi', 'Chỉ seller mới có thể quản lý tài khoản ngân hàng');
      router.back();
      return;
    }
    loadBankAccounts();
  }, [user?.id, isSeller]);

  const loadBankAccounts = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const data = await BankAccountService.getBySeller(user.id);
      setBankAccounts(data);
    } catch (error: any) {
      console.error('Error loading bank accounts:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách tài khoản ngân hàng');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDelete = async (bankAccountId: string) => {
    Alert.alert(
      'Xác nhận xóa',
      'Bạn có chắc chắn muốn xóa tài khoản ngân hàng này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!user?.id) return;
              await BankAccountService.delete(bankAccountId, user.id);
              setBankAccounts(prev => prev.filter(ba => ba.id !== bankAccountId));
              Alert.alert('Thành công', 'Đã xóa tài khoản ngân hàng');
            } catch (error: any) {
              Alert.alert('Lỗi', error.message || 'Không thể xóa tài khoản');
            }
          },
        },
      ]
    );
  };

  const handleSetPrimary = async (bankAccountId: string) => {
    try {
      if (!user?.id) return;
      await BankAccountService.setPrimary(bankAccountId, user.id);
      await loadBankAccounts();
      Alert.alert('Thành công', 'Đã đặt làm tài khoản chính');
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể đặt làm tài khoản chính');
    }
  };

  const renderBankAccount = ({ item }: { item: SellerBankAccount }) => {
    return (
      <View style={styles.bankAccountCard}>
        <View style={styles.bankAccountHeader}>
          <View style={styles.bankIcon}>
            <Building2 size={24} color={colors.primary} />
          </View>
          <View style={styles.bankAccountInfo}>
            <Text style={styles.bankName}>{item.bank_name}</Text>
            <Text style={styles.accountNumber}>{item.account_number}</Text>
            <Text style={styles.accountHolder}>{item.account_holder_name}</Text>
            {item.branch_name && (
              <Text style={styles.branchName}>{item.branch_name}</Text>
            )}
          </View>
        </View>

        <View style={styles.bankAccountBadges}>
          {item.is_primary && (
            <View style={styles.primaryBadge}>
              <Check size={12} color="#fff" />
              <Text style={styles.primaryBadgeText}>Tài khoản chính</Text>
            </View>
          )}
          {item.is_verified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedBadgeText}>Đã xác minh</Text>
            </View>
          )}
        </View>

        <View style={styles.bankAccountActions}>
          {!item.is_primary && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleSetPrimary(item.id)}
            >
              <Text style={styles.actionButtonText}>Đặt làm chính</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => router.push({
              pathname: '/me/edit-bank-account',
              params: { id: item.id },
            } as any)}
          >
            <Edit size={16} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDelete(item.id)}
          >
            <Trash2 size={16} color="#FF3B30" />
          </TouchableOpacity>
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
          <Text style={styles.headerTitle}>Tài khoản ngân hàng</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/me/add-bank-account' as any)}
          >
            <Plus size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {bankAccounts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Building2 size={64} color="#ccc" />
          <Text style={styles.emptyText}>Chưa có tài khoản ngân hàng</Text>
          <Text style={styles.emptySubtext}>
            Thêm tài khoản ngân hàng để nhận thanh toán từ đơn hàng
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => router.push('/me/add-bank-account' as any)}
          >
            <Plus size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.emptyButtonText}>Thêm tài khoản</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={bankAccounts}
          renderItem={renderBankAccount}
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
                loadBankAccounts();
              }}
            />
          }
        />
      )}
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
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  bankAccountCard: {
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
  bankAccountHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  bankIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bankAccountInfo: {
    flex: 1,
  },
  bankName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  accountNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 4,
  },
  accountHolder: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  branchName: {
    fontSize: 12,
    color: '#999',
  },
  bankAccountBadges: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  primaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  primaryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  verifiedBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verifiedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4CAF50',
  },
  bankAccountActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 40,
  },
  editButton: {
    backgroundColor: '#E3F2FD',
  },
  deleteButton: {
    backgroundColor: '#FFE5E5',
  },
  actionButtonText: {
    fontSize: 12,
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
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 32,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 14,
    backgroundColor: colors.primary,
    borderRadius: 24,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});

