import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { X } from 'lucide-react-native';
import {
  useSubscription,
  SubscriptionPlan,
} from '../../contexts/SubscriptionContext';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../theme/colors';

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
      'Ẩn số điện thoại',
      'Pet nổi bật',
      'Hỗ trợ ưu tiên',
    ],
    limitations: [],
    petLimit: 6,
    imagesPerPet: 4,
    popular: true,
  },
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

interface SubscriptionModalProps {
  visible: boolean;
  onClose: () => void;
}

export function SubscriptionModal({ visible, onClose }: SubscriptionModalProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { subscription, loading, createSubscription, upgradeSubscription, refreshSubscription } =
    useSubscription();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSelectPlan = async (plan: SubscriptionPlan) => {
    if (!user) {
      Alert.alert('Lỗi', 'Vui lòng đăng nhập để đăng ký gói');
      return;
    }

    try {
      setIsProcessing(true);
      setSelectedPlan(plan);

      // Free plan - create directly without payment
      if (plan === 'free') {
        // Nếu đang có subscription active và không phải free, hỏi xác nhận
        if (subscription?.status === 'active' && subscription.plan !== 'free') {
          Alert.alert(
            'Xác nhận hủy gói',
            `Bạn đang sử dụng gói ${subscription.plan.toUpperCase()}. Bạn có chắc chắn muốn hủy và chuyển sang gói Free không?`,
            [
              {
                text: 'Hủy',
                style: 'cancel',
                onPress: () => {
                  setIsProcessing(false);
                  setSelectedPlan(null);
                }
              },
              {
                text: 'Xác nhận',
                style: 'destructive',
                onPress: async () => {
                  try {
                    await upgradeSubscription(plan);
                    // Refresh subscription để đảm bảo state được cập nhật
                    await refreshSubscription();
                    Alert.alert('Thành công', 'Đã chuyển sang gói Free thành công!');
                    setTimeout(() => {
                      onClose();
                    }, 500);
                  } catch (error) {
                    Alert.alert(
                      'Lỗi',
                      error instanceof Error ? error.message : 'Có lỗi xảy ra'
                    );
                  } finally {
                    setIsProcessing(false);
                    setSelectedPlan(null);
                  }
                }
              }
            ]
          );
          return;
        } else if (!subscription || subscription.status !== 'active') {
          console.log('🔵 Creating new free subscription...');
          await createSubscription(plan);
          console.log('✅ Free subscription created');
          // Refresh subscription để đảm bảo state được cập nhật
          await refreshSubscription();
          Alert.alert('Thành công', 'Đăng ký gói Free thành công!');
          setTimeout(() => {
            onClose();
          }, 500);
        } else {
          // Đã có free subscription active
          Alert.alert('Thông báo', 'Bạn đã có gói Free đang hoạt động');
          onClose();
        }
        return;
      }

      // Paid plans - process PayOS payment
      if (subscription?.status === 'active' && subscription.plan !== plan) {
        // Upgrade hoặc downgrade
        await upgradeSubscription(plan);
        // Don't show success alert here, PayOS will handle it
        return;
      } else if (!subscription || subscription.status !== 'active') {
        // Tạo mới subscription
        await createSubscription(plan);
        // Don't show success alert here, PayOS will handle it
        return;
      }
    } catch (error) {
      console.error('Error selecting plan:', error);
      Alert.alert(
        'Lỗi',
        error instanceof Error ? error.message : 'Có lỗi xảy ra khi đăng ký gói'
      );
    } finally {
      setIsProcessing(false);
      setSelectedPlan(null);
    }
  };

  const formatPrice = (amount: number) => {
    if (amount === 0) return 'Miễn phí';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Chọn gói subscription</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Plans */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {PLANS.map((plan) => {
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
                            ? `Chuyển sang ${plan.name}`
                            : `Chọn gói ${plan.name}`}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 40,
    zIndex: 1001,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  planWrapper: {
    marginBottom: 20,
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
    backgroundColor: colors.surface,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.border,
  },
  planCardCurrent: {
    borderColor: '#34C759',
  },
  planCardSelected: {
    borderColor: colors.primary,
  },
  planCardPopular: {
    borderColor: colors.primary,
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
    color: colors.text,
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
    color: colors.text,
    flex: 1,
    lineHeight: 20,
  },
  selectButton: {
    margin: 24,
    marginTop: 0,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  selectButtonDisabled: {
    backgroundColor: colors.backgroundSecondary,
  },
  selectButtonPopular: {
    backgroundColor: colors.primary,
  },
  selectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  selectButtonTextDisabled: {
    color: colors.textSecondary,
  },
});

