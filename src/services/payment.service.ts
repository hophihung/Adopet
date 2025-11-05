import { supabase } from '../../lib/supabaseClient';

export interface PaymentMethod {
  id: string;
  type: 'stripe' | 'paypal' | 'momo' | 'zalopay' | 'vnpay';
  name: string;
  icon: string;
  isAvailable: boolean;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  display_name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  color: string;
  icon: string;
  is_popular: boolean;
  features: PlanFeature[];
}

export interface PlanFeature {
  key: string;
  name: string;
  value: string;
  type: 'number' | 'boolean' | 'text' | 'unlimited';
  description: string;
  icon: string;
}

export interface UserPlanInfo {
  plan_id: string;
  plan_name: string;
  plan_display_name: string;
  plan_price_monthly: number;
  plan_price_yearly: number;
  plan_color: string;
  plan_icon: string;
  is_popular: boolean;
  features: PlanFeature[];
  usage_today: Record<string, number>;
}

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'canceled';
  client_secret?: string;
  payment_method?: string;
}

class PaymentService {
  // Payment methods available for Vietnam market
  private paymentMethods: PaymentMethod[] = [
    {
      id: 'stripe',
      type: 'stripe',
      name: 'Credit/Debit Card',
      icon: 'credit-card',
      isAvailable: true
    },
    {
      id: 'momo',
      type: 'momo',
      name: 'MoMo Wallet',
      icon: 'smartphone',
      isAvailable: true
    },
    {
      id: 'zalopay',
      type: 'zalopay',
      name: 'ZaloPay',
      icon: 'smartphone',
      isAvailable: true
    },
    {
      id: 'vnpay',
      type: 'vnpay',
      name: 'VNPay',
      icon: 'smartphone',
      isAvailable: true
    }
  ];

  // Get all available payment methods
  getPaymentMethods(): PaymentMethod[] {
    return this.paymentMethods.filter(method => method.isAvailable);
  }

  // Get all subscription plans
  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select(`
          *,
          plan_features (*)
        `)
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;

      return data.map(plan => ({
        id: plan.id,
        name: plan.name,
        display_name: plan.display_name,
        description: plan.description,
        price_monthly: plan.price_monthly,
        price_yearly: plan.price_yearly,
        currency: plan.currency,
        color: plan.color,
        icon: plan.icon,
        is_popular: plan.is_popular,
        features: plan.plan_features.map((feature: any) => ({
          key: feature.feature_key,
          name: feature.feature_name,
          value: feature.feature_value,
          type: feature.feature_type,
          description: feature.description,
          icon: feature.icon
        }))
      }));
    } catch (error) {
      console.error('Error fetching subscription plans:', error);
      throw error;
    }
  }

  // Get user's current plan info
  async getUserPlanInfo(userId: string): Promise<UserPlanInfo | null> {
    try {
      const { data, error } = await supabase
        .rpc('get_user_plan_info', { user_profile_id: userId });

      if (error) throw error;
      return data[0] || null;
    } catch (error) {
      console.error('Error fetching user plan info:', error);
      throw error;
    }
  }

  // Check if user can perform an action
  async checkFeatureLimit(userId: string, featureKey: string, currentCount: number = 0): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .rpc('check_feature_limit', {
          user_profile_id: userId,
          feature_key: featureKey,
          current_count: currentCount
        });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error checking feature limit:', error);
      return false;
    }
  }

  // Increment usage counter
  async incrementUsage(userId: string, featureKey: string, incrementBy: number = 1): Promise<void> {
    try {
      const { error } = await supabase
        .rpc('increment_usage', {
          user_profile_id: userId,
          feature_key: featureKey,
          increment_by: incrementBy
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error incrementing usage:', error);
      throw error;
    }
  }

  // Create payment intent (Stripe)
  async createPaymentIntent(
    planId: string, 
    billingCycle: 'monthly' | 'yearly',
    paymentMethod: string = 'stripe'
  ): Promise<PaymentIntent> {
    try {
      // Get plan details
      const { data: plan, error: planError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', planId)
        .single();

      if (planError) throw planError;

      const amount = billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly;

      // Create payment intent via your backend API
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
          billingCycle,
          amount,
          currency: plan.currency,
          paymentMethod
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create payment intent');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw error;
    }
  }

  // Create MoMo payment
  async createMoMoPayment(planId: string, billingCycle: 'monthly' | 'yearly'): Promise<{ paymentUrl: string; orderId: string }> {
    try {
      const { data: plan, error: planError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', planId)
        .single();

      if (planError) throw planError;

      const amount = billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly;

      const response = await fetch('/api/create-momo-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
          billingCycle,
          amount,
          planName: plan.display_name
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create MoMo payment');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating MoMo payment:', error);
      throw error;
    }
  }

  // Create ZaloPay payment
  async createZaloPayPayment(planId: string, billingCycle: 'monthly' | 'yearly'): Promise<{ paymentUrl: string; orderId: string }> {
    try {
      const { data: plan, error: planError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', planId)
        .single();

      if (planError) throw planError;

      const amount = billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly;

      const response = await fetch('/api/create-zalopay-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
          billingCycle,
          amount,
          planName: plan.display_name
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create ZaloPay payment');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating ZaloPay payment:', error);
      throw error;
    }
  }

  // Update subscription after successful payment
  async updateSubscription(
    userId: string,
    planId: string,
    billingCycle: 'monthly' | 'yearly',
    paymentMethod: string,
    paymentId: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({
          plan_id: planId,
          billing_cycle: billingCycle,
          payment_method: paymentMethod,
          payment_id: paymentId,
          status: 'active',
          start_date: new Date().toISOString(),
          end_date: billingCycle === 'yearly' 
            ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
        .eq('profile_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating subscription:', error);
      throw error;
    }
  }

  // Cancel subscription
  async cancelSubscription(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({
          status: 'canceled',
          auto_renew: false
        })
        .eq('profile_id', userId)
        .eq('status', 'active');

      if (error) throw error;
    } catch (error) {
      console.error('Error canceling subscription:', error);
      throw error;
    }
  }

  // Get subscription analytics (for admin)
  async getSubscriptionAnalytics(): Promise<any> {
    try {
      const { data, error } = await supabase
        .rpc('admin_get_all_plans');

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching subscription analytics:', error);
      throw error;
    }
  }
}

export const paymentService = new PaymentService();
