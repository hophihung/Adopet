import React, { useState } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Button, Text } from 'react-native-paper';
// TODO: Install @stripe/stripe-react-native
// import { useStripe, CardField } from '@stripe/stripe-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { paymentService } from '../services/payment.service';
import { useAuth } from '@/contexts/AuthContext';

interface StripePaymentSheetProps {
  planId: string;
  planName: string;
  amount: number;
  billingCycle: 'monthly' | 'yearly';
  onSuccess: () => void;
  onCancel: () => void;
}

export function StripePaymentSheet({
  planId,
  planName,
  amount,
  billingCycle,
  onSuccess,
  onCancel,
}: StripePaymentSheetProps) {
  // TODO: Uncomment when Stripe is installed
  // const { confirmPayment } = useStripe();
  const confirmPayment = null as any;
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);

  const handlePayment = async () => {
    if (!cardComplete) {
      Alert.alert('Error', 'Please enter complete card details');
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    try {
      setLoading(true);

      // Create payment intent
      const paymentIntent = await paymentService.createPaymentIntent(
        planId,
        billingCycle,
        'stripe'
      );

      if (!paymentIntent.client_secret) {
        throw new Error('Failed to create payment intent');
      }

      // Confirm payment with Stripe
      const { error, paymentIntent: confirmedPayment } = await confirmPayment(
        paymentIntent.client_secret,
        {
          paymentMethodType: 'Card',
        }
      );

      if (error) {
        console.error('Payment confirmation error:', error);
        Alert.alert('Payment Failed', error.message);
        return;
      }

      if (confirmedPayment?.status === 'Succeeded') {
        // Payment successful - webhook will handle subscription update
        Alert.alert(
          'Payment Successful! 🎉',
          `You've successfully subscribed to ${planName}. Your subscription is now active.`,
          [{ text: 'OK', onPress: onSuccess }]
        );
      } else {
        Alert.alert(
          'Payment Processing',
          'Your payment is being processed. You will be notified once complete.'
        );
        // Still call onSuccess to close modal, subscription will activate when webhook fires
        setTimeout(onSuccess, 2000);
      }
    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert(
        'Payment Error',
        error instanceof Error ? error.message : 'An unexpected error occurred'
      );
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amt: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
    }).format(amt);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FF6B6B', '#FF8E53']}
        style={styles.header}
      >
        <Text variant="headlineSmall" style={styles.headerTitle}>
          Complete Payment
        </Text>
        <Text variant="bodyLarge" style={styles.headerSubtitle}>
          {planName} - {billingCycle === 'yearly' ? 'Yearly' : 'Monthly'}
        </Text>
        <Text variant="titleLarge" style={styles.amount}>
          {formatAmount(amount)}
        </Text>
      </LinearGradient>

      <View style={styles.content}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Card Information
        </Text>
        
        {/* TODO: Uncomment when Stripe is installed */}
        {/* <CardField
          postalCodeEnabled={false}
          placeholders={{
            number: '4242 4242 4242 4242',
          }}
          cardStyle={styles.card}
          style={styles.cardField}
          onCardChange={(cardDetails: any) => {
            setCardComplete(cardDetails.complete);
          }}
        /> */}
        <Text>Stripe payment integration pending</Text>

        <Text variant="bodySmall" style={styles.helperText}>
          💳 Test card: 4242 4242 4242 4242 (any future date, any CVC)
        </Text>

        <View style={styles.securityBadge}>
          <Text variant="bodySmall" style={styles.securityText}>
            🔒 Secured by Stripe • Your payment info is encrypted
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={handlePayment}
            disabled={!cardComplete || loading}
            loading={loading}
            style={styles.payButton}
            contentStyle={styles.payButtonContent}
          >
            {loading ? 'Processing...' : `Pay ${formatAmount(amount)}`}
          </Button>

          <Button
            mode="outlined"
            onPress={onCancel}
            disabled={loading}
            style={styles.cancelButton}
          >
            Cancel
          </Button>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 24,
    paddingTop: 48,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontWeight: '700',
    marginBottom: 8,
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 12,
  },
  amount: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 32,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  sectionTitle: {
    marginBottom: 16,
    fontWeight: '600',
    color: '#333',
  },
  cardField: {
    width: '100%',
    height: 50,
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  helperText: {
    color: '#666',
    marginBottom: 24,
    fontStyle: 'italic',
  },
  securityBadge: {
    backgroundColor: '#F0F9FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  securityText: {
    color: '#1E40AF',
    textAlign: 'center',
  },
  buttonContainer: {
    gap: 12,
  },
  payButton: {
    borderRadius: 12,
    backgroundColor: '#FF6B6B',
  },
  payButtonContent: {
    paddingVertical: 8,
  },
  cancelButton: {
    borderRadius: 12,
    borderColor: '#E0E0E0',
  },
});

