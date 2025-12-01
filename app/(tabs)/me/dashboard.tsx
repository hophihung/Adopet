import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { SellerAnalyticsService, SellerAnalytics } from '@/src/features/seller/services/analytics.service';
import { DollarSign, Package, TrendingUp, CreditCard } from 'lucide-react-native';
import { colors } from '@/src/theme/colors';
import { useRouter } from 'expo-router';
import { CurrencyConverter } from '@/src/utils/currency';

export default function SellerDashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<SellerAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, [user]);

  const loadAnalytics = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const data = await SellerAnalyticsService.getSellerAnalytics(user.id);
      setAnalytics(data);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAnalytics();
  };

  const formatCurrency = (amount: number) => {
    return CurrencyConverter.format(amount, 'VND');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!analytics) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Không có dữ liệu</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Thống kê bán hàng</Text>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <DollarSign size={24} color={colors.primary} />
            <Text style={styles.statValue}>{formatCurrency(analytics.total_revenue)}</Text>
            <Text style={styles.statLabel}>Tổng doanh thu</Text>
          </View>

          <View style={styles.statCard}>
            <Package size={24} color={colors.success} />
            <Text style={styles.statValue}>{analytics.total_orders}</Text>
            <Text style={styles.statLabel}>Tổng đơn hàng</Text>
          </View>

          <View style={styles.statCard}>
            <TrendingUp size={24} color={colors.warning} />
            <Text style={styles.statValue}>{formatCurrency(analytics.average_order_value)}</Text>
            <Text style={styles.statLabel}>Giá trị TB/đơn</Text>
          </View>

          <View style={styles.statCard}>
            <CreditCard size={24} color={colors.error} />
            <Text style={styles.statValue}>{formatCurrency(analytics.total_commission_paid)}</Text>
            <Text style={styles.statLabel}>Phí đã trả</Text>
          </View>
        </View>

        {/* Order Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trạng thái đơn hàng</Text>
          <View style={styles.statusRow}>
            <View style={styles.statusItem}>
              <Text style={styles.statusValue}>{analytics.completed_orders}</Text>
              <Text style={styles.statusLabel}>Đã hoàn thành</Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusValue}>{analytics.pending_orders}</Text>
              <Text style={styles.statusLabel}>Đang xử lý</Text>
            </View>
          </View>
        </View>

        {/* Payouts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thanh toán</Text>
          <View style={styles.statusRow}>
            <View style={styles.statusItem}>
              <Text style={styles.statusValue}>{formatCurrency(analytics.pending_payouts)}</Text>
              <Text style={styles.statusLabel}>Đang chờ</Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusValue}>{formatCurrency(analytics.completed_payouts)}</Text>
              <Text style={styles.statusLabel}>Đã nhận</Text>
            </View>
          </View>
        </View>

        {/* Top Products */}
        {analytics.top_products.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sản phẩm bán chạy</Text>
            {analytics.top_products.map((product, index) => (
              <View key={product.id} style={styles.productItem}>
                <View style={styles.productRank}>
                  <Text style={styles.rankText}>#{index + 1}</Text>
                </View>
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{product.name}</Text>
                  <Text style={styles.productStats}>
                    {product.sales} đơn • {formatCurrency(product.revenue)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  statCard: {
    width: '47%',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  section: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statusItem: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
  },
  statusValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  statusLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.background,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  productRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryLight + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  productStats: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});

