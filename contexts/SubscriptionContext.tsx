import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import { processSubscriptionPayment } from '../lib/stripe';

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

      const { data, error: fetchError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('profile_id', user!.id)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
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
        const { data, error: insertError } = await supabase
          .from('subscriptions')
          .insert({
            profile_id: user!.id,
            plan,
            status: 'active',
            start_date: new Date().toISOString(),
          })
          .select()
          .single();

        if (insertError) throw insertError;
        setSubscription(data);
        return;
      }

      // Paid plans - process Stripe payment
      const paymentResult = await processSubscriptionPayment({
        plan,
        profileId: user!.id,
      });

      if (!paymentResult.success) {
        throw new Error(paymentResult.error || 'Payment failed');
      }

      // Payment successful - webhook will create subscription
      // Refresh subscription to get the updated data
      await fetchSubscription();
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
        const { data, error: updateError } = await supabase
          .from('subscriptions')
          .update({
            plan: newPlan,
            updated_at: new Date().toISOString(),
          })
          .eq('id', subscription.id)
          .select()
          .single();

        if (updateError) throw updateError;
        setSubscription(data);
        return;
      }

      // Upgrade to paid plan - process payment
      const paymentResult = await processSubscriptionPayment({
        plan: newPlan,
        profileId: user!.id,
      });

      if (!paymentResult.success) {
        throw new Error(paymentResult.error || 'Payment failed');
      }

      // Payment successful - webhook will update subscription
      await fetchSubscription();
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

