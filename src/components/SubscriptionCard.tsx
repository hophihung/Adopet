import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SubscriptionPlan } from '../../contexts/SubscriptionContext';

interface SubscriptionCardProps {
  plan: {
    id: string;
    name: string;
    price: number;
    originalPrice?: number;
    period: string;
    description: string;
    color: string;
    gradient: string[];
    features: string[];
    limitations: string[];
    petLimit: number;
    imagesPerPet: number;
    popular: boolean;
  };
  isCurrentPlan?: boolean;
  isSelected?: boolean;
  onSelect: (plan: SubscriptionPlan) => void;
  disabled?: boolean;
}

export function SubscriptionCard({
  plan,
  isCurrentPlan = false,
  isSelected = false,
  onSelect,
  disabled = false,
}: SubscriptionCardProps) {
  return (
    <View style={styles.planWrapper}>
      {plan.popular && (
        <View style={styles.popularBadge}>
          <Text style={styles.popularBadgeText}>PHỔ BIẾN NHẤT</Text>
        </View>
      )}
      
      <TouchableOpacity
        style={[
          styles.planCard,
          isCurrentPlan && styles.planCardCurrent,
          isSelected && styles.planCardSelected,
          plan.popular && styles.planCardPopular,
        ]}
        onPress={() => onSelect(plan.id as SubscriptionPlan)}
        disabled={disabled || isCurrentPlan}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={(isCurrentPlan ? ['#34C759', '#30D158'] : plan.gradient) as [string, string, ...string[]]}
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
                  -{Math.round((1 - plan.price / plan.originalPrice) * 100)}%
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
                  <Text style={styles.limitationText}>{limitation}</Text>
                </View>
              ))}
            </>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.selectButton,
            isCurrentPlan && styles.selectButtonDisabled,
            plan.popular && styles.selectButtonPopular,
          ]}
          onPress={() => onSelect(plan.id as SubscriptionPlan)}
          disabled={disabled || isCurrentPlan}
        >
          <Text style={[
            styles.selectButtonText,
            isCurrentPlan && styles.selectButtonTextDisabled,
          ]}>
            {isCurrentPlan
              ? 'Gói hiện tại'
              : `Chọn gói ${plan.name}`}
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
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
});

