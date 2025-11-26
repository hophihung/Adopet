import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Gift, Coins, TrendingUp, History } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { RewardService, UserReward, RewardTransaction } from '@/src/features/rewards/services/reward.service';
import { colors } from '@/src/theme/colors';

export default function RewardsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [reward, setReward] = useState<UserReward | null>(null);
  const [transactions, setTransactions] = useState<RewardTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user?.id]);

  const loadData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const [rewardData, transactionsData] = await Promise.all([
        RewardService.getUserReward(user.id),
        RewardService.getTransactions(user.id, 20),
      ]);
      setReward(rewardData);
      setTransactions(transactionsData || []);
    } catch (error: any) {
      console.error('Error loading rewards:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  };

  const getTransactionIcon = (type: RewardTransaction['transaction_type']) => {
    switch (type) {
      case 'earn':
      case 'cashback_earn':
        return <TrendingUp size={20} color="#4CAF50" />;
      case 'spend':
      case 'cashback_use':
        return <Coins size={20} color="#FF9500" />;
      default:
        return <History size={20} color="#999" />;
    }
  };

  const getTransactionText = (transaction: RewardTransaction) => {
    switch (transaction.transaction_type) {
      case 'earn':
        return `+${transaction.points_amount.toFixed(0)} điểm`;
      case 'cashback_earn':
        return `+${formatPrice(transaction.cashback_amount)} cashback`;
      case 'spend':
        return `-${transaction.points_amount.toFixed(0)} điểm`;
      case 'cashback_use':
        return `-${formatPrice(transaction.cashback_amount)} cashback`;
      default:
        return transaction.description || 'Giao dịch';
    }
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
          <Text style={styles.headerTitle}>Điểm thưởng</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 20 },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadData} />
        }
      >
        {/* Reward Summary */}
        {reward && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Gift size={32} color={colors.primary} />
                <Text style={styles.summaryLabel}>Điểm hiện tại</Text>
                <Text style={styles.summaryValue}>
                  {reward.points.toFixed(0)}
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Coins size={32} color="#FF9500" />
                <Text style={styles.summaryLabel}>Cashback</Text>
                <Text style={styles.summaryValue}>
                  {formatPrice(reward.cashback_balance)}
                </Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Tổng điểm đã tích</Text>
                <Text style={styles.statValue}>
                  {reward.total_points_earned.toFixed(0)}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Tổng cashback</Text>
                <Text style={styles.statValue}>
                  {formatPrice(reward.total_cashback_earned)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Transactions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lịch sử giao dịch</Text>
          {transactions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <History size={48} color="#ccc" />
              <Text style={styles.emptyText}>Chưa có giao dịch nào</Text>
            </View>
          ) : (
            transactions.map((transaction) => (
              <View key={transaction.id} style={styles.transactionCard}>
                <View style={styles.transactionIcon}>
                  {getTransactionIcon(transaction)}
                </View>
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionDescription}>
                    {transaction.description || 'Giao dịch điểm thưởng'}
                  </Text>
                  <Text style={styles.transactionDate}>
                    {new Date(transaction.created_at).toLocaleString('vi-VN')}
                  </Text>
                </View>
                <View style={styles.transactionAmount}>
                  <Text
                    style={[
                      styles.transactionAmountText,
                      {
                        color:
                          transaction.transaction_type === 'earn' ||
                          transaction.transaction_type === 'cashback_earn'
                            ? '#4CAF50'
                            : '#FF9500',
                      },
                    ]}
                  >
                    {getTransactionText(transaction)}
                  </Text>
                </View>
              </View>
            ))
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
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 20,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryDivider: {
    width: 1,
    height: 60,
    backgroundColor: '#E4E7EB',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  section: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
  transactionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  transactionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5F7FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: '#999',
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  transactionAmountText: {
    fontSize: 16,
    fontWeight: '700',
  },
});

