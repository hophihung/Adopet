import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Percent, TrendingUp, Award } from 'lucide-react-native';
import { CommissionService, SellerCommissionInfo } from '../services/commission.service';
import { colors } from '@/src/theme/colors';
import { LinearGradient } from 'expo-linear-gradient';

interface CommissionTierCardProps {
  reputationPoints: number;
  showNextTier?: boolean;
}

export function CommissionTierCard({
  reputationPoints,
  showNextTier = true,
}: CommissionTierCardProps) {
  const [commissionInfo, setCommissionInfo] = useState<SellerCommissionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCommissionInfo();
  }, [reputationPoints]);

  const loadCommissionInfo = async () => {
    try {
      setLoading(true);
      const info = await CommissionService.getSellerCommissionInfo(reputationPoints);
      setCommissionInfo(info);
    } catch (error) {
      console.error('Error loading commission info:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (!commissionInfo) {
    return null;
  }

  const { current_tier, next_tier, points_to_next_tier, total_commission_rate } = commissionInfo;

  const getTierColor = (tierName: string) => {
    switch (tierName.toLowerCase()) {
      case 'diamond':
        return ['#00BCD4', '#0097A7'];
      case 'platinum':
        return ['#E0E0E0', '#BDBDBD'];
      case 'gold':
        return ['#FFD700', '#FFA000'];
      case 'silver':
        return ['#C0C0C0', '#808080'];
      case 'bronze':
        return ['#CD7F32', '#8B4513'];
      default:
        return ['#9E9E9E', '#757575'];
    }
  };

  const getTierLabel = (tierName: string) => {
    switch (tierName.toLowerCase()) {
      case 'diamond':
        return 'Kim Cương';
      case 'platinum':
        return 'Bạch Kim';
      case 'gold':
        return 'Vàng';
      case 'silver':
        return 'Bạc';
      case 'bronze':
        return 'Đồng';
      default:
        return 'Mặc định';
    }
  };

  const progressPercentage = next_tier
    ? Math.min(
        100,
        (reputationPoints / next_tier.min_reputation_points) * 100
      )
    : 100;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={getTierColor(current_tier.tier_name)}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Award size={24} color="#fff" />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.tierLabel}>
                Hạng {getTierLabel(current_tier.tier_name)}
              </Text>
              <Text style={styles.tierName}>{current_tier.tier_name}</Text>
            </View>
          </View>

          <View style={styles.commissionInfo}>
            <View style={styles.commissionRow}>
              <Percent size={18} color="#fff" />
              <Text style={styles.commissionLabel}>Phí hoa hồng:</Text>
              <Text style={styles.commissionValue}>
                {current_tier.commission_rate}%
              </Text>
            </View>
            <View style={styles.commissionRow}>
              <TrendingUp size={18} color="#fff" />
              <Text style={styles.commissionLabel}>Phí xử lý:</Text>
              <Text style={styles.commissionValue}>
                {current_tier.processing_fee_rate}%
              </Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tổng phí:</Text>
              <Text style={styles.totalValue}>{total_commission_rate}%</Text>
            </View>
          </View>

          {showNextTier && next_tier && (
            <View style={styles.nextTierContainer}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>
                  Đến hạng {getTierLabel(next_tier.tier_name)} còn:
                </Text>
                <Text style={styles.progressPoints}>
                  {points_to_next_tier} điểm
                </Text>
              </View>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${progressPercentage}%` },
                  ]}
                />
              </View>
              <Text style={styles.nextTierInfo}>
                Hạng tiếp theo: {next_tier.commission_rate}% +{' '}
                {next_tier.processing_fee_rate}% ={' '}
                {next_tier.commission_rate + next_tier.processing_fee_rate}%
              </Text>
            </View>
          )}
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  gradient: {
    padding: 16,
  },
  content: {
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  tierLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  tierName: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  commissionInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  commissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  commissionLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    flex: 1,
  },
  commissionValue: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '700',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  totalLabel: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '700',
  },
  nextTierContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  progressPoints: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '700',
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 3,
  },
  nextTierInfo: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
});

