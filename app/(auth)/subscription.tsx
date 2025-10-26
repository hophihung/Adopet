import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSubscription, SubscriptionPlan } from '../../contexts/SubscriptionContext';
import { router } from 'expo-router';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    description: 'Nhập môn, khám phá thú cưng',
    features: [
      'Xem 5 thú cưng mỗi ngày',
      'Tạo tối đa 4 pet objects',
      'Mỗi pet tối đa 4 ảnh',
      'Liên hệ cơ bản',
    ],
    petLimit: 4,
    imagesPerPet: 4,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 99000,
    description: '/tháng - Trải nghiệm nâng cao',
    features: [
      'Xem không giới hạn',
      'Tạo tối đa 6 pet objects',
      'Mỗi pet tối đa 4 ảnh',
      'Liên hệ ưu tiên',
      'Ẩn số điện thoại',
    ],
    petLimit: 6,
    imagesPerPet: 4,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 299000,
    description: '/tháng - Chuyên nghiệp',
    features: [
      'Mọi tính năng Premium',
      'Tạo tối đa 9 pet objects',
      'Mỗi pet tối đa 4 ảnh',
      'Hỗ trợ ưu tiên 24/7',
      'Badge Pro',
      'Analytics chi tiết',
    ],
    petLimit: 9,
    imagesPerPet: 4,
  },
];

export default function SubscriptionScreen() {
  const { subscription, loading, createSubscription, upgradeSubscription } =
    useSubscription();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSelectPlan = async (plan: SubscriptionPlan) => {
    try {
      setIsProcessing(true);
      setSelectedPlan(plan);

      if (subscription?.status === 'active' && subscription.plan !== plan) {
        // Upgrade hoặc downgrade
        await upgradeSubscription(plan);
        Alert.alert('Thành công', `Cập nhật gói ${plan} thành công!`);
      } else if (!subscription) {
        // Tạo mới subscription
        await createSubscription(plan);
        Alert.alert('Thành công', `Đăng ký gói ${plan} thành công!`);
      }

      // Navigate to home
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 1000);
    } catch (error) {
      Alert.alert(
        'Lỗi',
        error instanceof Error ? error.message : 'Có lỗi xảy ra'
      );
    } finally {
      setIsProcessing(false);
      setSelectedPlan(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Nâng cấp tài khoản</Text>
        <Text style={styles.subtitle}>
          Chọn gói dịch vụ phù hợp với nhu cầu của bạn
        </Text>
      </View>

      {/* Current Subscription */}
      {subscription?.status === 'active' && (
        <View style={styles.currentSubscription}>
          <Text style={styles.currentLabel}>Gói hiện tại:</Text>
          <Text style={styles.currentPlan}>{subscription.plan.toUpperCase()}</Text>
          <Text style={styles.currentDate}>
            Từ: {new Date(subscription.start_date).toLocaleDateString('vi-VN')}
          </Text>
        </View>
      )}

      {/* Plans */}
      <View style={styles.plansContainer}>
        {PLANS.map((plan) => {
          const isCurrentPlan = subscription?.plan === plan.id;
          const isSelected = selectedPlan === plan.id;

          return (
            <TouchableOpacity
              key={plan.id}
              style={[
                styles.planCard,
                isCurrentPlan && styles.planCardCurrent,
                isSelected && styles.planCardSelected,
              ]}
              onPress={() => handleSelectPlan(plan.id as SubscriptionPlan)}
              disabled={isProcessing || isCurrentPlan}
              activeOpacity={0.7}
            >
              {isCurrentPlan && (
                <View style={styles.currentBadge}>
                  <Text style={styles.currentBadgeText}>Hiện tại</Text>
                </View>
              )}

              <Text style={styles.planName}>{plan.name}</Text>

              <View style={styles.priceContainer}>
                <Text style={styles.price}>
                  {plan.price.toLocaleString('vi-VN')}
                </Text>
                <Text style={styles.priceCurrency}>đ</Text>
              </View>

              <Text style={styles.priceDescription}>{plan.description}</Text>

              <View style={styles.featuresContainer}>
                {plan.features.map((feature, idx) => (
                  <View key={idx} style={styles.featureItem}>
                    <Text style={styles.featureCheckmark}>✓</Text>
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[
                  styles.selectButton,
                  isCurrentPlan && styles.selectButtonDisabled,
                ]}
                onPress={() => handleSelectPlan(plan.id as SubscriptionPlan)}
                disabled={isProcessing || isCurrentPlan}
              >
                {isProcessing && selectedPlan === plan.id ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.selectButtonText}>
                    {isCurrentPlan
                      ? 'Gói hiện tại'
                      : subscription?.status === 'active'
                      ? `Nâng cấp lên ${plan.name}`
                      : `Chọn gói ${plan.name}`}
                  </Text>
                )}
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Skip Button */}
      <TouchableOpacity
        style={styles.skipButton}
        onPress={() => router.replace('/(tabs)')}
      >
        <Text style={styles.skipButtonText}>Bỏ qua bây giờ</Text>
      </TouchableOpacity>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Bạn có thể thay đổi hoặc hủy gói bất cứ lúc nào
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  currentSubscription: {
    backgroundColor: '#e8f4f8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  currentLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  currentPlan: {
    fontSize: 20,
    fontWeight: '700',
    color: '#007AFF',
    marginTop: 4,
  },
  currentDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  plansContainer: {
    marginBottom: 24,
    gap: 16,
  },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  planCardCurrent: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f7ff',
  },
  planCardSelected: {
    borderColor: '#34C759',
  },
  currentBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  currentBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  planName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  price: {
    fontSize: 32,
    fontWeight: '700',
    color: '#007AFF',
  },
  priceCurrency: {
    fontSize: 16,
    color: '#007AFF',
    marginLeft: 4,
  },
  priceDescription: {
    fontSize: 12,
    color: '#999',
    marginBottom: 16,
  },
  featuresContainer: {
    marginBottom: 16,
    gap: 10,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureCheckmark: {
    fontSize: 16,
    color: '#34C759',
    marginRight: 10,
  },
  featureText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  selectButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  selectButtonDisabled: {
    backgroundColor: '#ccc',
  },
  selectButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 24,
  },
  skipButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    marginBottom: 32,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});

