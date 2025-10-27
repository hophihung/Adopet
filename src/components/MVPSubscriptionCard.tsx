import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SubscriptionPlan } from '../services/payment.service';

interface MVPSubscriptionCardProps {
  plan: SubscriptionPlan;
  isSelected?: boolean;
  onSelect: (plan: SubscriptionPlan) => void;
  currentPlan?: string;
  billingCycle: 'monthly' | 'yearly';
}

const { width } = Dimensions.get('window');

export function MVPSubscriptionCard({ 
  plan, 
  isSelected = false, 
  onSelect, 
  currentPlan,
  billingCycle 
}: MVPSubscriptionCardProps) {
  const isCurrentPlan = currentPlan === plan.name;
  const price = billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly;
  const isFree = price === 0;

  const formatPrice = (amount: number) => {
    if (amount === 0) return 'Miễn phí';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getPriceText = () => {
    if (isFree) return 'Miễn phí';
    const monthlyPrice = plan.price_monthly;
    const yearlyPrice = plan.price_yearly;
    const yearlyDiscount = Math.round((1 - yearlyPrice / (monthlyPrice * 12)) * 100);
    
    if (billingCycle === 'yearly' && yearlyDiscount > 0) {
      return `${formatPrice(yearlyPrice)}/năm (Tiết kiệm ${yearlyDiscount}%)`;
    }
    return `${formatPrice(price)}/${billingCycle === 'yearly' ? 'năm' : 'tháng'}`;
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isSelected && styles.selectedContainer,
        isCurrentPlan && styles.currentPlanContainer
      ]}
      onPress={() => onSelect(plan)}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={isSelected ? [plan.color, plan.color + '80'] : ['#1f2937', '#374151']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Ionicons 
              name={plan.icon as any} 
              size={24} 
              color={isSelected ? '#ffffff' : plan.color} 
            />
            <Text style={[styles.title, isSelected && styles.selectedText]}>
              {plan.display_name}
            </Text>
          </View>
          
          {plan.is_popular && (
            <View style={styles.popularBadge}>
              <Text style={styles.popularText}>Phổ biến</Text>
            </View>
          )}
          
          {isCurrentPlan && (
            <View style={styles.currentBadge}>
              <Text style={styles.currentText}>Gói hiện tại</Text>
            </View>
          )}
        </View>

        {/* Price */}
        <View style={styles.priceContainer}>
          <Text style={[styles.price, isSelected && styles.selectedText]}>
            {getPriceText()}
          </Text>
          {plan.description && (
            <Text style={[styles.description, isSelected && styles.selectedSubText]}>
              {plan.description}
            </Text>
          )}
        </View>

        {/* Features */}
        <View style={styles.featuresContainer}>
          {plan.features.slice(0, 4).map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <Ionicons 
                name="checkmark-circle" 
                size={16} 
                color={isSelected ? '#ffffff' : '#10b981'} 
              />
              <Text style={[styles.featureText, isSelected && styles.selectedSubText]}>
                {feature.name}: {feature.value === 'unlimited' ? 'Không giới hạn' : feature.value}
              </Text>
            </View>
          ))}
          
          {plan.features.length > 4 && (
            <Text style={[styles.moreFeatures, isSelected && styles.selectedSubText]}>
              +{plan.features.length - 4} tính năng khác
            </Text>
          )}
        </View>

        {/* Action Button */}
        <View style={styles.actionContainer}>
          {isCurrentPlan ? (
            <View style={[styles.button, styles.currentButton]}>
              <Text style={styles.currentButtonText}>Đang sử dụng</Text>
            </View>
          ) : (
            <View style={[styles.button, isSelected ? styles.selectedButton : styles.defaultButton]}>
              <Text style={[
                styles.buttonText,
                isSelected ? styles.selectedButtonText : styles.defaultButtonText
              ]}>
                {isFree ? 'Bắt đầu miễn phí' : 'Chọn gói này'}
              </Text>
            </View>
          )}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: width * 0.85,
    marginHorizontal: 8,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  selectedContainer: {
    elevation: 8,
    shadowOpacity: 0.2,
    transform: [{ scale: 1.02 }],
  },
  currentPlanContainer: {
    borderWidth: 2,
    borderColor: '#10b981',
  },
  gradient: {
    padding: 20,
    minHeight: 320,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginLeft: 8,
  },
  selectedText: {
    color: '#ffffff',
  },
  popularBadge: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  currentBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  currentText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  priceContainer: {
    marginBottom: 20,
  },
  price: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#d1d5db',
  },
  selectedSubText: {
    color: '#e5e7eb',
  },
  featuresContainer: {
    flex: 1,
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#d1d5db',
    marginLeft: 8,
    flex: 1,
  },
  moreFeatures: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
    marginTop: 4,
  },
  actionContainer: {
    marginTop: 'auto',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  selectedButton: {
    backgroundColor: '#ffffff',
  },
  defaultButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  currentButton: {
    backgroundColor: '#10b981',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  selectedButtonText: {
    color: '#1f2937',
  },
  defaultButtonText: {
    color: '#ffffff',
  },
  currentButtonText: {
    color: '#ffffff',
  },
});
