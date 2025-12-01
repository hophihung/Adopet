import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Check } from 'lucide-react-native';
import { PaymentMethodsService, PaymentMethodConfig } from '@/src/features/payment/services/paymentMethods.service';
import { colors } from '@/src/theme/colors';

interface PaymentMethodSelectorProps {
  selectedMethod?: string;
  onSelect: (method: PaymentMethodConfig) => void;
  disabled?: boolean;
}

export function PaymentMethodSelector({
  selectedMethod,
  onSelect,
  disabled = false,
}: PaymentMethodSelectorProps) {
  const [methods, setMethods] = useState<PaymentMethodConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMethods();
  }, []);

  const loadMethods = async () => {
    try {
      const availableMethods = await PaymentMethodsService.getAvailableMethods();
      setMethods(availableMethods);
      // Auto-select first method if none selected
      if (!selectedMethod && availableMethods.length > 0) {
        onSelect(availableMethods[0]);
      }
    } catch (error) {
      console.error('Error loading payment methods:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Đang tải phương thức thanh toán...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Phương thức thanh toán</Text>
      <ScrollView style={styles.methodsList} showsVerticalScrollIndicator={false}>
        {methods.map((method) => {
          const isSelected = selectedMethod === method.id;
          return (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.methodItem,
                isSelected && styles.methodItemSelected,
                disabled && styles.methodItemDisabled,
              ]}
              onPress={() => !disabled && onSelect(method)}
              disabled={disabled}
              activeOpacity={0.7}
            >
              <View style={styles.methodContent}>
                <Text style={styles.methodIcon}>{method.icon}</Text>
                <View style={styles.methodInfo}>
                  <Text style={[styles.methodName, isSelected && styles.methodNameSelected]}>
                    {method.name}
                  </Text>
                  <Text style={styles.methodDescription}>{method.description}</Text>
                </View>
              </View>
              {isSelected && (
                <View style={styles.checkIcon}>
                  <Check size={20} color={colors.primary} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    padding: 20,
  },
  methodsList: {
    maxHeight: 300,
  },
  methodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.borderLight,
    marginBottom: 12,
  },
  methodItemSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight + '10',
  },
  methodItemDisabled: {
    opacity: 0.5,
  },
  methodContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  methodIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  methodNameSelected: {
    color: colors.primary,
  },
  methodDescription: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  checkIcon: {
    marginLeft: 12,
  },
});


