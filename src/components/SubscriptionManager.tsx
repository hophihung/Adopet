import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { SubscriptionCard } from './SubscriptionCard';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: 'Vĩnh viễn',
    description: 'Khám phá thú cưng cơ bản',
    color: '#8E8E93',
    gradient: ['#8E8E93', '#A8A8A8'],
    features: [
      'Tạo tối đa 4 pet objects',
      'Mỗi pet tối đa 4 ảnh',
      'Xem 5 thú cưng mỗi ngày',
      'Liên hệ cơ bản',
    ],
    limitations: [
      'Không có tính năng nổi bật',
      'Không có analytics',
    ],
    petLimit: 4,
    imagesPerPet: 4,
    popular: false,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 99000,
    originalPrice: 149000,
    period: '/tháng',
    description: 'Trải nghiệm nâng cao',
    color: '#007AFF',
    gradient: ['#007AFF', '#5856D6'],
    features: [
      'Tạo tối đa 6 pet objects',
      'Mỗi pet tối đa 4 ảnh',
      'Xem không giới hạn',
      'Liên hệ ưu tiên',
      'Pet nổi bật',
    ],
    limitations: [],
    petLimit: 6,
    imagesPerPet: 4,
    popular: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 299000,
    originalPrice: 399000,
    period: '/tháng',
    description: 'Chuyên nghiệp',
    color: '#FF9500',
    gradient: ['#FF9500', '#FF6B35'],
    features: [
      'Tạo tối đa 9 pet objects',
      'Mỗi pet tối đa 4 ảnh',
      'Mọi tính năng Premium',
      'Analytics chi tiết',
      'Hỗ trợ 24/7',
      'Badge Pro',
    ],
    limitations: [],
    petLimit: 9,
    imagesPerPet: 4,
    popular: false,
  },
];

interface SubscriptionManagerProps {
  onClose?: () => void;
}

export function SubscriptionManager({ onClose }: SubscriptionManagerProps) {
  const router = useRouter();
  const { subscription, loading, upgradeSubscription, cancelSubscription } = useSubscription();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSelectPlan = async (planId: string) => {
    try {
      setIsProcessing(true);

      if (subscription?.status === 'active' && subscription.plan !== planId) {
        await upgradeSubscription(planId as any);
        Alert.alert('Thành công', `Cập nhật gói ${planId} thành công!`);
      }

      if (onClose) {
        onClose();
      }
    } catch (error) {
      Alert.alert(
        'Lỗi',
        error instanceof Error ? error.message : 'Có lỗi xảy ra'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelSubscription = () => {
    Alert.alert(
      'Hủy gói đăng ký',
      'Bạn có chắc muốn hủy gói đăng ký? Bạn sẽ mất quyền truy cập vào các tính năng premium.',
      [
        { text: 'Không', style: 'cancel' },
        {
          text: 'Hủy gói',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelSubscription();
              Alert.alert('Thành công', 'Đã hủy gói đăng ký thành công!');
            } catch (error) {
              Alert.alert('Lỗi', 'Không thể hủy gói đăng ký');
            }
          },
        },
      ]
    );
  };

  const handleManageSubscription = () => {
    router.push('/subscription');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Current Subscription Info */}
      {subscription?.status === 'active' && (
        <View style={styles.currentSubscription}>
          <View style={styles.currentSubscriptionHeader}>
            <Text style={styles.currentSubscriptionTitle}>Gói hiện tại</Text>
            <View style={styles.currentPlanBadge}>
              <Text style={styles.currentPlanText}>
                {subscription.plan.toUpperCase()}
              </Text>
            </View>
          </View>
          
          <View style={styles.currentSubscriptionDetails}>
            <Text style={styles.currentSubscriptionDate}>
              Bắt đầu: {new Date(subscription.start_date).toLocaleDateString('vi-VN')}
            </Text>
            {subscription.end_date && (
              <Text style={styles.currentSubscriptionDate}>
                Kết thúc: {new Date(subscription.end_date).toLocaleDateString('vi-VN')}
              </Text>
            )}
          </View>

          <View style={styles.currentSubscriptionActions}>
            <TouchableOpacity
              style={styles.manageButton}
              onPress={handleManageSubscription}
            >
              <Text style={styles.manageButtonText}>Quản lý gói</Text>
            </TouchableOpacity>
            
            {subscription.plan !== 'free' && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancelSubscription}
              >
                <Text style={styles.cancelButtonText}>Hủy gói</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Available Plans */}
      <View style={styles.plansSection}>
        <Text style={styles.plansTitle}>Các gói có sẵn</Text>
        <ScrollView style={styles.plansContainer} showsVerticalScrollIndicator={false}>
          {PLANS.map((plan) => (
            <SubscriptionCard
              key={plan.id}
              plan={plan}
              isCurrentPlan={subscription?.plan === plan.id}
              onSelect={handleSelectPlan}
              disabled={isProcessing}
            />
          ))}
        </ScrollView>
      </View>

      {/* Benefits */}
      <View style={styles.benefitsSection}>
        <Text style={styles.benefitsTitle}>Lợi ích khi nâng cấp</Text>
        <View style={styles.benefitsList}>
          <View style={styles.benefitItem}>
            <Text style={styles.benefitIcon}>🚀</Text>
            <Text style={styles.benefitText}>Tạo nhiều pet objects hơn</Text>
          </View>
          <View style={styles.benefitItem}>
            <Text style={styles.benefitIcon}>⭐</Text>
            <Text style={styles.benefitText}>Pet nổi bật hơn</Text>
          </View>
          <View style={styles.benefitItem}>
            <Text style={styles.benefitIcon}>📊</Text>
            <Text style={styles.benefitText}>Analytics chi tiết</Text>
          </View>
          <View style={styles.benefitItem}>
            <Text style={styles.benefitIcon}>🎯</Text>
            <Text style={styles.benefitText}>Hỗ trợ ưu tiên</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
  },
  currentSubscription: {
    backgroundColor: '#1C1C1E',
    margin: 20,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  currentSubscriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  currentSubscriptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  currentPlanBadge: {
    backgroundColor: '#34C759',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  currentPlanText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  currentSubscriptionDetails: {
    marginBottom: 16,
  },
  currentSubscriptionDate: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  currentSubscriptionActions: {
    flexDirection: 'row',
    gap: 12,
  },
  manageButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  manageButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#FF3B30',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  plansSection: {
    flex: 1,
    paddingHorizontal: 20,
  },
  plansTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  plansContainer: {
    flex: 1,
  },
  benefitsSection: {
    padding: 20,
    backgroundColor: '#1C1C1E',
    margin: 20,
    borderRadius: 16,
  },
  benefitsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  benefitsList: {
    gap: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  benefitIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  benefitText: {
    fontSize: 14,
    color: '#fff',
    flex: 1,
  },
});

