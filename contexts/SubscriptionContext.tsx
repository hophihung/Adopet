import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import { PayOSSubscriptionService } from '../src/services/payos-subscription.service';
import { Linking, Alert } from 'react-native';

export type SubscriptionPlan = 'free' | 'premium' | 'pro';
export type SubscriptionStatus = 'active' | 'canceled' | 'expired';

export interface Subscription {
  id: string;
  profile_id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  start_date: string;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

interface SubscriptionContextType {
  subscription: Subscription | null;
  loading: boolean;
  error: string | null;
  createSubscription: (plan: SubscriptionPlan) => Promise<void>;
  cancelSubscription: () => Promise<void>;
  upgradeSubscription: (newPlan: SubscriptionPlan) => Promise<void>;
  refreshSubscription: () => Promise<void>;
  getPetLimit: (plan?: SubscriptionPlan) => number;
  getImagesPerPetLimit: () => number;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(
  undefined
);

export function SubscriptionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchSubscription();
    } else {
      setSubscription(null);
      setLoading(false);
    }
  }, [user]);

  const fetchSubscription = async () => {
    try {
      setLoading(true);
      setError(null);

      // Query subscription
      const { data, error: fetchError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('profile_id', user!.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      // Nếu có data, đảm bảo có cả plan (text) và plan_id
      if (data) {
        // Nếu có plan_id nhưng không có plan (text), lấy từ subscription_plans
        if (data.plan_id && !data.plan) {
          const { data: planData } = await supabase
            .from('subscription_plans')
            .select('name')
            .eq('id', data.plan_id)
            .maybeSingle();
          if (planData) {
            data.plan = planData.name as SubscriptionPlan;
          }
        }
        // Nếu có plan (text) nhưng không có plan_id, lấy từ subscription_plans
        if (data.plan && !data.plan_id) {
          const { data: planData } = await supabase
            .from('subscription_plans')
            .select('id')
            .eq('name', data.plan)
            .eq('is_active', true)
            .maybeSingle();
          if (planData) {
            data.plan_id = planData.id;
            // Cập nhật subscription với plan_id
            await supabase
              .from('subscriptions')
              .update({ plan_id: planData.id })
              .eq('id', data.id);
          }
        }
      }

      setSubscription(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch subscription';
      setError(message);
      console.error('Error fetching subscription:', err);
    } finally {
      setLoading(false);
    }
  };

  const createSubscription = async (plan: SubscriptionPlan) => {
    try {
      setLoading(true);
      setError(null);

      // Kiểm tra xem user đã có subscription chưa
      if (subscription && subscription.status === 'active') {
        throw new Error('You already have an active subscription');
      }

      // Free plan - create directly without payment
      if (plan === 'free') {
        console.log('🔵 Creating free subscription for user:', user!.id);
        
        // Lấy plan_id từ subscription_plans
        const { data: planData, error: planError } = await supabase
          .from('subscription_plans')
          .select('id')
          .eq('name', plan)
          .eq('is_active', true)
          .maybeSingle();

        if (planError) {
          console.error('🔴 Error fetching plan:', planError);
          throw planError;
        }

        if (!planData) {
          throw new Error('Free plan not found in database');
        }

        const planId = planData.id;
        console.log('🔵 Found plan_id:', planId);
        
        // Kiểm tra xem đã có subscription chưa
        const { data: existingSub, error: checkError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('profile_id', user!.id)
          .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') {
          console.error('🔴 Error checking existing subscription:', checkError);
          throw checkError;
        }

        // Nếu đã có subscription, update nó
        if (existingSub) {
          console.log('🔵 Updating existing subscription to free plan');
          const { data, error: updateError } = await supabase
            .from('subscriptions')
            .update({
              plan,
              plan_id: planId,
              status: 'active',
              start_date: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('profile_id', user!.id)
            .select()
            .single();

          if (updateError) {
            console.error('🔴 Error updating subscription:', updateError);
            throw updateError;
          }
          
          console.log('✅ Subscription updated successfully:', data);
          setSubscription(data);
          // Refresh để đảm bảo data được sync
          await fetchSubscription();
          return;
        }

        // Nếu chưa có, tạo mới
        const { data, error: insertError } = await supabase
          .from('subscriptions')
          .insert({
            profile_id: user!.id,
            plan,
            plan_id: planId,
            status: 'active',
            start_date: new Date().toISOString(),
          })
          .select()
          .single();

        if (insertError) {
          console.error('🔴 Error inserting subscription:', insertError);
          throw insertError;
        }
        
        console.log('✅ Subscription created successfully:', data);
        setSubscription(data);
        // Refresh để đảm bảo data được sync
        await fetchSubscription();
        return;
      }

      // Paid plans - process PayOS payment
      // Lấy plan_id từ subscription_plans
      const { data: planData, error: planError } = await supabase
        .from('subscription_plans')
        .select('id')
        .eq('name', plan)
        .eq('is_active', true)
        .maybeSingle();

      if (planError) {
        console.error('🔴 Error fetching plan:', planError);
        throw planError;
      }

      if (!planData) {
        throw new Error(`Plan ${plan} not found in database`);
      }

      const planId = planData.id;

      // First create a temporary subscription record
      const { data: tempSubscription, error: insertError } = await supabase
        .from('subscriptions')
        .insert({
          profile_id: user!.id,
          plan,
          plan_id: planId,
          status: 'pending', // Will be updated to 'active' after payment
          start_date: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Get plan price
      const planPrices: Record<SubscriptionPlan, number> = {
        free: 0,
        premium: 99000,
        pro: 149000,
      };
      const amount = planPrices[plan] || 0;

      if (amount <= 0) {
        throw new Error('Invalid plan price');
      }

      // Create PayOS payment link
      const paymentLink = await PayOSSubscriptionService.createSubscriptionPaymentLink(
        tempSubscription.id,
        plan,
        amount,
        'monthly' // Default to monthly
      );

      // Open payment link
      const canOpen = await Linking.canOpenURL(paymentLink.payment_url);
      if (canOpen) {
        await Linking.openURL(paymentLink.payment_url);
        Alert.alert(
          'Thanh toán',
          'Vui lòng hoàn tất thanh toán. Subscription sẽ được kích hoạt sau khi thanh toán thành công.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Refresh subscription after a delay to check payment status
                setTimeout(() => {
                  fetchSubscription();
                }, 2000);
              }
            }
          ]
        );
      } else {
        throw new Error('Không thể mở payment link');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create subscription';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const cancelSubscription = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!subscription) {
        throw new Error('No active subscription to cancel');
      }

      const { data, error: updateError } = await supabase
        .from('subscriptions')
        .update({
          status: 'canceled',
          end_date: new Date().toISOString(),
        })
        .eq('id', subscription.id)
        .select()
        .single();

      if (updateError) throw updateError;

      setSubscription(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to cancel subscription';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const upgradeSubscription = async (newPlan: SubscriptionPlan) => {
    try {
      setLoading(true);
      setError(null);

      if (!subscription) {
        await createSubscription(newPlan);
        return;
      }

      // Downgrade to free - no payment needed
      if (newPlan === 'free') {
        console.log('🔵 Downgrading to free plan');
        
        // Lấy plan_id từ subscription_plans
        const { data: planData, error: planError } = await supabase
          .from('subscription_plans')
          .select('id')
          .eq('name', newPlan)
          .eq('is_active', true)
          .maybeSingle();

        if (planError) {
          console.error('🔴 Error fetching plan:', planError);
          throw planError;
        }

        if (!planData) {
          throw new Error('Free plan not found in database');
        }

        const planId = planData.id;

        const { data, error: updateError } = await supabase
          .from('subscriptions')
          .update({
            plan: newPlan,
            plan_id: planId,
            status: 'active',
            updated_at: new Date().toISOString(),
          })
          .eq('id', subscription.id)
          .select()
          .single();

        if (updateError) {
          console.error('🔴 Error updating subscription:', updateError);
          throw updateError;
        }
        
        console.log('✅ Subscription downgraded to free:', data);
        setSubscription(data);
        await fetchSubscription();
        return;
      }

      // Upgrade to paid plan - process PayOS payment
      // Get plan price
      const planPrices: Record<SubscriptionPlan, number> = {
        free: 0,
        premium: 99000,
        pro: 149000,
      };
      const amount = planPrices[newPlan] || 0;

      if (amount <= 0) {
        throw new Error('Invalid plan price');
      }

      // Create PayOS payment link
      const paymentLink = await PayOSSubscriptionService.createSubscriptionPaymentLink(
        subscription.id,
        newPlan,
        amount,
        'monthly' // Default to monthly
      );

      // Open payment link
      const canOpen = await Linking.canOpenURL(paymentLink.payment_url);
      if (canOpen) {
        await Linking.openURL(paymentLink.payment_url);
        Alert.alert(
          'Thanh toán',
          'Vui lòng hoàn tất thanh toán. Subscription sẽ được cập nhật sau khi thanh toán thành công.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Refresh subscription after a delay to check payment status
                setTimeout(() => {
                  fetchSubscription();
                }, 2000);
              }
            }
          ]
        );
      } else {
        throw new Error('Không thể mở payment link');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to upgrade subscription';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const refreshSubscription = async () => {
    if (user) {
      await fetchSubscription();
    }
  };

  const getPetLimit = (plan?: SubscriptionPlan): number => {
    // Nếu subscription bị canceled hoặc không có, treat như free plan
    const currentPlan = (subscription?.status === 'active') ? 
      (plan || subscription?.plan || 'free') : 'free';
    const limits = {
      'free': 4,
      'premium': 6,
      'pro': 9,
    };
    return limits[currentPlan] || 4;
  };

  const getImagesPerPetLimit = (): number => {
    return 4; // Tất cả gói đều có giới hạn 4 ảnh/pet
  };

  const value = {
    subscription,
    loading,
    error,
    createSubscription,
    cancelSubscription,
    upgradeSubscription,
    refreshSubscription,
    getPetLimit,
    getImagesPerPetLimit,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}

