import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  useSubscription,
  SubscriptionPlan,
} from '../contexts/SubscriptionContext';
import { useAuth } from '../contexts/AuthContext';

const { width } = Dimensions.get('window');

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    originalPrice: null,
    period: 'Vĩnh viễn',
    description: 'Khám phá thú cưng cơ bản',
    color: '#8E8E93',
    gradient: ['#8E8E93', '#A8A8A8'],
    features: [
      'Tạo tối đa 4 pet objects',
      'Mỗi pet tối đa 4 ảnh',
      'Xem 5 thú cưng mỗi ngày',
      'Liên hệ cơ bản',
      'Hỗ trợ email',
    ],
    limitations: ['Không có tính năng nổi bật', 'Không có analytics'],
    petLimit: 4,
    imagesPerPet: 4,
    popular: false,
  },
  // Premium plan - hidden for now
  // {
  //   id: 'premium',
  //   name: 'Premium',
  //   price: 99000,
  //   originalPrice: 149000,
  //   period: '/tháng',
  //   description: 'Trải nghiệm nâng cao',
  //   color: '#007AFF',
  //   gradient: ['#007AFF', '#5856D6'],
  //   features: [
  //     'Tạo tối đa 6 pet objects',
  //     'Mỗi pet tối đa 4 ảnh',
  //     'Xem không giới hạn',
  //     'Liên hệ ưu tiên',
  //     'Ẩn số điện thoại',
  //     'Pet nổi bật',
  //     'Hỗ trợ ưu tiên',
  //   ],
  //   limitations: [],
  //   petLimit: 6,
  //   imagesPerPet: 4,
  //   popular: true,
  // },
  {
    id: 'pro',
    name: 'Pro',
    price: 149000,
    originalPrice: 299000,
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
      'Tính năng độc quyền',
      'API access',
    ],
    limitations: [],
    petLimit: 9,
    imagesPerPet: 4,
    popular: true,
  },
];

export default function SubscriptionScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { subscription, loading, createSubscription, upgradeSubscription } =
    useSubscription();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(
    null
  );
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSelectPlan = async (plan: SubscriptionPlan) => {
    if (!user) {
      Alert.alert('Lỗi', 'Vui lòng đăng nhập để đăng ký gói');
      return;
    }

    try {
      setIsProcessing(true);
      setSelectedPlan(plan);

      if (subscription?.status === 'active' && subscription.plan !== plan) {
        // Upgrade hoặc downgrade
        await upgradeSubscription(plan);
        Alert.alert('Thành công', `Cập nhật gói ${plan} thành công!`);
      } else if (!subscription || subscription.status !== 'active') {
        // Tạo mới subscription
        await createSubscription(plan);
        Alert.alert('Thành công', `Đăng ký gói ${plan} thành công!`);
      }

      // Navigate to home
      setTimeout(() => {
        router.replace('/(tabs)/discover/match');
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

  const handleSkip = () => {
    router.replace('/(tabs)/discover/match' as any);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1C1C1E" />

      {/* Header */}
      <LinearGradient colors={['#1C1C1E', '#2C2C2E']} style={styles.header}>
        <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
          <Text style={styles.skipButtonText}>Bỏ qua</Text>
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Nâng cấp tài khoản</Text>
          <Text style={styles.headerSubtitle}>
            Chọn gói dịch vụ phù hợp với nhu cầu của bạn
          </Text>
        </View>
      </LinearGradient>

      {/* Current Subscription */}
      {subscription?.status === 'active' && (
        <View style={styles.currentSubscription}>
          <View style={styles.currentSubscriptionContent}>
            <Text style={styles.currentLabel}>Gói hiện tại:</Text>
            <Text style={styles.currentPlan}>
              {subscription.plan.toUpperCase()}
            </Text>
            <Text style={styles.currentDate}>
              Từ:{' '}
              {new Date(subscription.start_date).toLocaleDateString('vi-VN')}
            </Text>
          </View>
        </View>
      )}

      {/* Plans */}
      <ScrollView
        style={styles.plansContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.plansContent}
      >
        {PLANS.map((plan, index) => {
          const isCurrentPlan = subscription?.plan === plan.id;
          const isSelected = selectedPlan === plan.id;
          const isPopular = plan.popular;

          return (
            <View key={plan.id} style={styles.planWrapper}>
              {isPopular && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularBadgeText}>PHỔ BIẾN NHẤT</Text>
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.planCard,
                  isCurrentPlan && styles.planCardCurrent,
                  isSelected && styles.planCardSelected,
                  isPopular && styles.planCardPopular,
                ]}
                onPress={() => handleSelectPlan(plan.id as SubscriptionPlan)}
                disabled={isProcessing || isCurrentPlan}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={
                    isCurrentPlan
                      ? (['#34C759', '#30D158'] as const)
                      : (plan.gradient as any)
                  }
                  style={styles.planGradient}
                >
                  <View style={styles.planHeader}>
                    <Text style={styles.planName}>{plan.name}</Text>
                    {isCurrentPlan && (
                      <View style={styles.currentBadge}>
                        <Text style={styles.currentBadgeText}>Hiện tại</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.priceContainer}>
                    <Text style={styles.price}>
                      {plan.price.toLocaleString('vi-VN')}
                    </Text>
                    <Text style={styles.priceCurrency}>đ</Text>
                    <Text style={styles.pricePeriod}>{plan.period}</Text>
                  </View>

                  {plan.originalPrice && (
                    <View style={styles.originalPriceContainer}>
                      <Text style={styles.originalPrice}>
                        {plan.originalPrice.toLocaleString('vi-VN')}đ
                      </Text>
                      <View style={styles.discountBadge}>
                        <Text style={styles.discountText}>
                          -
                          {Math.round(
                            (1 - plan.price / plan.originalPrice) * 100
                          )}
                          %
                        </Text>
                      </View>
                    </View>
                  )}

                  <Text style={styles.planDescription}>{plan.description}</Text>
                </LinearGradient>

                <View style={styles.featuresContainer}>
                  <Text style={styles.featuresTitle}>Tính năng bao gồm:</Text>
                  {plan.features.map((feature, idx) => (
                    <View key={idx} style={styles.featureItem}>
                      <Text style={styles.featureCheckmark}>✓</Text>
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}

                  {plan.limitations.length > 0 && (
                    <>
                      <Text style={styles.limitationsTitle}>Hạn chế:</Text>
                      {plan.limitations.map((limitation, idx) => (
                        <View key={idx} style={styles.limitationItem}>
                          <Text style={styles.limitationIcon}>✗</Text>
                          <Text style={styles.limitationText}>
                            {limitation}
                          </Text>
                        </View>
                      ))}
                    </>
                  )}
                </View>

                <TouchableOpacity
                  style={[
                    styles.selectButton,
                    isCurrentPlan && styles.selectButtonDisabled,
                    isPopular && styles.selectButtonPopular,
                  ]}
                  onPress={() => handleSelectPlan(plan.id as SubscriptionPlan)}
                  disabled={isProcessing || isCurrentPlan}
                >
                  {isProcessing && selectedPlan === plan.id ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text
                      style={[
                        styles.selectButtonText,
                        isCurrentPlan && styles.selectButtonTextDisabled,
                      ]}
                    >
                      {isCurrentPlan
                        ? 'Gói hiện tại'
                        : subscription?.status === 'active'
                        ? `Nâng cấp lên ${plan.name}`
                        : `Chọn gói ${plan.name}`}
                    </Text>
                  )}
                </TouchableOpacity>
              </TouchableOpacity>
            </View>
          );
        })}

        {/* Benefits Section */}
        <View style={styles.benefitsSection}>
          <Text style={styles.benefitsTitle}>Tại sao nên nâng cấp?</Text>
          <View style={styles.benefitsGrid}>
            <View style={styles.benefitItem}>
              <Text style={styles.benefitIcon}>🚀</Text>
              <Text style={styles.benefitTitle}>Tăng hiệu quả</Text>
              <Text style={styles.benefitDescription}>
                Tạo nhiều pet objects hơn để tăng cơ hội bán
              </Text>
            </View>
            <View style={styles.benefitItem}>
              <Text style={styles.benefitIcon}>⭐</Text>
              <Text style={styles.benefitTitle}>Nổi bật hơn</Text>
              <Text style={styles.benefitDescription}>
                Pet của bạn sẽ được ưu tiên hiển thị
              </Text>
            </View>
            <View style={styles.benefitItem}>
              <Text style={styles.benefitIcon}>📊</Text>
              <Text style={styles.benefitTitle}>Analytics</Text>
              <Text style={styles.benefitDescription}>
                Theo dõi hiệu suất và lượt xem
              </Text>
            </View>
            <View style={styles.benefitItem}>
              <Text style={styles.benefitIcon}>🎯</Text>
              <Text style={styles.benefitTitle}>Mục tiêu</Text>
              <Text style={styles.benefitDescription}>
                Đạt được mục tiêu bán pet nhanh hơn
              </Text>
            </View>
          </View>
        </View>

        {/* FAQ Section */}
        <View style={styles.faqSection}>
          <Text style={styles.faqTitle}>Câu hỏi thường gặp</Text>
          <View style={styles.faqItems}>
            <View style={styles.faqItem}>
              <Text style={styles.faqQuestion}>
                Có thể hủy gói bất cứ lúc nào không?
              </Text>
              <Text style={styles.faqAnswer}>
                Có, bạn có thể hủy gói subscription bất cứ lúc nào. Gói sẽ hết
                hạn vào cuối chu kỳ thanh toán.
              </Text>
            </View>
            <View style={styles.faqItem}>
              <Text style={styles.faqQuestion}>Có được hoàn tiền không?</Text>
              <Text style={styles.faqAnswer}>
                Chúng tôi cung cấp chính sách hoàn tiền trong vòng 7 ngày đầu
                tiên.
              </Text>
            </View>
            <View style={styles.faqItem}>
              <Text style={styles.faqQuestion}>
                Có thể nâng cấp/giảm cấp gói không?
              </Text>
              <Text style={styles.faqAnswer}>
                Có, bạn có thể thay đổi gói bất cứ lúc nào. Thay đổi sẽ có hiệu
                lực ngay lập tức.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Bạn có thể thay đổi hoặc hủy gói bất cứ lúc nào
        </Text>
        <Text style={styles.footerSubtext}>Thanh toán an toàn và bảo mật</Text>
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
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  skipButton: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipButtonText: {
    color: '#8E8E93',
    fontSize: 16,
    fontWeight: '500',
  },
  headerContent: {
    alignItems: 'center',
    marginTop: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
  },
  currentSubscription: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.3)',
  },
  currentSubscriptionContent: {
    padding: 16,
    alignItems: 'center',
  },
  currentLabel: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  currentPlan: {
    fontSize: 20,
    fontWeight: '700',
    color: '#34C759',
    marginTop: 4,
  },
  currentDate: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
  },
  plansContainer: {
    flex: 1,
  },
  plansContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  planWrapper: {
    marginBottom: 24,
    position: 'relative',
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    left: 20,
    right: 20,
    backgroundColor: '#FF3B30',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
    zIndex: 1,
  },
  popularBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  planCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#2C2C2E',
  },
  planCardCurrent: {
    borderColor: '#34C759',
  },
  planCardSelected: {
    borderColor: '#007AFF',
  },
  planCardPopular: {
    borderColor: '#007AFF',
  },
  planGradient: {
    padding: 24,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  planName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  currentBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  currentBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  price: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
  },
  priceCurrency: {
    fontSize: 20,
    color: '#fff',
    marginLeft: 4,
  },
  pricePeriod: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    marginLeft: 8,
  },
  originalPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  originalPrice: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.5)',
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  discountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  planDescription: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 24,
  },
  featuresContainer: {
    padding: 24,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureCheckmark: {
    fontSize: 16,
    color: '#34C759',
    marginRight: 12,
    fontWeight: '600',
  },
  featureText: {
    fontSize: 14,
    color: '#fff',
    flex: 1,
    lineHeight: 20,
  },
  limitationsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
    marginTop: 16,
    marginBottom: 12,
  },
  limitationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  limitationIcon: {
    fontSize: 16,
    color: '#FF3B30',
    marginRight: 12,
    fontWeight: '600',
  },
  limitationText: {
    fontSize: 14,
    color: '#8E8E93',
    flex: 1,
    lineHeight: 20,
  },
  selectButton: {
    margin: 24,
    marginTop: 0,
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  selectButtonDisabled: {
    backgroundColor: '#2C2C2E',
  },
  selectButtonPopular: {
    backgroundColor: '#007AFF',
  },
  selectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  selectButtonTextDisabled: {
    color: '#8E8E93',
  },
  benefitsSection: {
    marginTop: 40,
    marginBottom: 32,
  },
  benefitsTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 24,
  },
  benefitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  benefitItem: {
    width: (width - 60) / 2,
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  benefitIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  benefitDescription: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 18,
  },
  faqSection: {
    marginTop: 32,
  },
  faqTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 24,
  },
  faqItems: {
    gap: 16,
  },
  faqItem: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 20,
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1C1C1E',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#2C2C2E',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
  },
});
