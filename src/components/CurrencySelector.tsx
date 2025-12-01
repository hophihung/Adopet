import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Check, DollarSign } from 'lucide-react-native';
import { CurrencyConverter, Currency, CURRENCIES } from '@/src/utils/currency';
import { colors } from '@/src/theme/colors';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface CurrencySelectorProps {
  onCurrencyChange?: (currency: Currency) => void;
}

export function CurrencySelector({ onCurrencyChange }: CurrencySelectorProps) {
  const { user } = useAuth();
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>('VND');

  useEffect(() => {
    loadUserCurrency();
  }, [user]);

  const loadUserCurrency = async () => {
    if (!user?.id) return;

    try {
      const { data } = await supabase
        .from('user_preferences')
        .select('preferred_currency')
        .eq('user_id', user.id)
        .single();

      if (data?.preferred_currency) {
        const currency = data.preferred_currency as Currency;
        setSelectedCurrency(currency);
      }
    } catch (error) {
      console.error('Error loading user currency:', error);
    }
  };

  const handleSelectCurrency = async (currency: Currency) => {
    setSelectedCurrency(currency);

    // Save to database
    if (user?.id) {
      try {
        await supabase
          .from('user_preferences')
          .upsert({
            user_id: user.id,
            preferred_currency: currency,
            updated_at: new Date().toISOString(),
          });
      } catch (error) {
        console.error('Error saving currency preference:', error);
      }
    }

    onCurrencyChange?.(currency);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <DollarSign size={20} color={colors.primary} />
        <Text style={styles.title}>Tiền tệ</Text>
      </View>
      <ScrollView style={styles.currenciesList} showsVerticalScrollIndicator={false}>
        {Object.values(CURRENCIES).map((currency) => {
          const isSelected = selectedCurrency === currency.code;
          return (
            <TouchableOpacity
              key={currency.code}
              style={[
                styles.currencyItem,
                isSelected && styles.currencyItemSelected,
              ]}
              onPress={() => handleSelectCurrency(currency.code)}
              activeOpacity={0.7}
            >
              <View style={styles.currencyContent}>
                <Text style={styles.currencySymbol}>{currency.symbol}</Text>
                <View style={styles.currencyInfo}>
                  <Text style={[styles.currencyName, isSelected && styles.currencyNameSelected]}>
                    {currency.name}
                  </Text>
                  <Text style={styles.currencyCode}>{currency.code}</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  currenciesList: {
    maxHeight: 200,
  },
  currencyItem: {
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
  currencyItemSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight + '10',
  },
  currencyContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  currencySymbol: {
    fontSize: 28,
    marginRight: 12,
    fontWeight: '600',
  },
  currencyInfo: {
    flex: 1,
  },
  currencyName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  currencyNameSelected: {
    color: colors.primary,
  },
  currencyCode: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  checkIcon: {
    marginLeft: 12,
  },
});

