import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { paymentService, UserPlanInfo, SubscriptionPlan } from '../services/payment.service';

export interface UseSubscriptionReturn {
  // Data
  userPlan: UserPlanInfo | null;
  availablePlans: SubscriptionPlan[];
  isLoading: boolean;
  error: string | null;

  // Actions
  refreshPlan: () => Promise<void>;
  checkFeatureLimit: (featureKey: string, currentCount?: number) => Promise<boolean>;
  incrementUsage: (featureKey: string, incrementBy?: number) => Promise<void>;
  upgradePlan: (planId: string, billingCycle: 'monthly' | 'yearly', paymentMethod: string) => Promise<void>;
  cancelSubscription: () => Promise<void>;

  // Computed
  isFreePlan: boolean;
  isPremiumPlan: boolean;
  isProPlan: boolean;
  canAddPet: boolean;
  canMakeMatch: boolean;
  canPostReel: boolean;
  hasFeaturedPets: boolean;
  hasAnalytics: boolean;
  hasPrioritySupport: boolean;
}

export function useSubscription(): UseSubscriptionReturn {
  const { user } = useAuth();
  const [userPlan, setUserPlan] = useState<UserPlanInfo | null>(null);
  const [availablePlans, setAvailablePlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load user plan and available plans
  const loadData = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const [planData, plansData] = await Promise.all([
        paymentService.getUserPlanInfo(user.id),
        paymentService.getSubscriptionPlans()
      ]);

      setUserPlan(planData);
      setAvailablePlans(plansData);
    } catch (err) {
      console.error('Error loading subscription data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load subscription data');
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh plan data
  const refreshPlan = async () => {
    if (!user) return;
    
    try {
      const planData = await paymentService.getUserPlanInfo(user.id);
      setUserPlan(planData);
    } catch (err) {
      console.error('Error refreshing plan:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh plan');
    }
  };

  // Check feature limit
  const checkFeatureLimit = async (featureKey: string, currentCount: number = 0): Promise<boolean> => {
    if (!user) return false;
    
    try {
      return await paymentService.checkFeatureLimit(user.id, featureKey, currentCount);
    } catch (err) {
      console.error('Error checking feature limit:', err);
      return false;
    }
  };

  // Increment usage
  const incrementUsage = async (featureKey: string, incrementBy: number = 1): Promise<void> => {
    if (!user) return;
    
    try {
      await paymentService.incrementUsage(user.id, featureKey, incrementBy);
      // Refresh plan to update usage data
      await refreshPlan();
    } catch (err) {
      console.error('Error incrementing usage:', err);
      throw err;
    }
  };

  // Upgrade plan
  const upgradePlan = async (
    planId: string, 
    billingCycle: 'monthly' | 'yearly', 
    paymentMethod: string
  ): Promise<void> => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      setError(null);

      let paymentResult;
      
      switch (paymentMethod) {
        case 'stripe':
          paymentResult = await paymentService.createPaymentIntent(planId, billingCycle, 'stripe');
          // Handle Stripe payment flow
          break;
        case 'momo':
          paymentResult = await paymentService.createMoMoPayment(planId, billingCycle);
          // Handle MoMo payment flow
          break;
        case 'zalopay':
          paymentResult = await paymentService.createZaloPayPayment(planId, billingCycle);
          // Handle ZaloPay payment flow
          break;
        default:
          throw new Error('Unsupported payment method');
      }

      // Update subscription after successful payment
      await paymentService.updateSubscription(
        user.id,
        planId,
        billingCycle,
        paymentMethod,
        paymentResult.id || paymentResult.orderId
      );

      // Refresh plan data
      await refreshPlan();
    } catch (err) {
      console.error('Error upgrading plan:', err);
      setError(err instanceof Error ? err.message : 'Failed to upgrade plan');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Cancel subscription
  const cancelSubscription = async (): Promise<void> => {
    if (!user) return;
    
    try {
      await paymentService.cancelSubscription(user.id);
      await refreshPlan();
    } catch (err) {
      console.error('Error canceling subscription:', err);
      setError(err instanceof Error ? err.message : 'Failed to cancel subscription');
      throw err;
    }
  };

  // Load data on mount and when user changes
  useEffect(() => {
    loadData();
  }, [user]);

  // Computed properties
  const isFreePlan = userPlan?.plan_name === 'free';
  const isPremiumPlan = userPlan?.plan_name === 'premium';
  const isProPlan = userPlan?.plan_name === 'pro';

  // Feature checks (synchronous based on current plan data)
  const canAddPet = userPlan ? 
    (userPlan.features.find(f => f.key === 'pet_limit')?.value === 'unlimited' || 
     parseInt(userPlan.features.find(f => f.key === 'pet_limit')?.value || '0') > (userPlan.usage_today.pet_created || 0)) : 
    false;

  const canMakeMatch = userPlan ? 
    (userPlan.features.find(f => f.key === 'daily_matches')?.value === 'unlimited' || 
     parseInt(userPlan.features.find(f => f.key === 'daily_matches')?.value || '0') > (userPlan.usage_today.daily_matches || 0)) : 
    false;

  const canPostReel = userPlan ? 
    (userPlan.features.find(f => f.key === 'reel_posts')?.value === 'unlimited' || 
     parseInt(userPlan.features.find(f => f.key === 'reel_posts')?.value || '0') > (userPlan.usage_today.reel_posts || 0)) : 
    false;

  const hasFeaturedPets = userPlan?.features.find(f => f.key === 'featured_pets')?.value === 'true';
  const hasAnalytics = userPlan?.features.find(f => f.key === 'analytics')?.value === 'true';
  const hasPrioritySupport = userPlan?.features.find(f => f.key === 'priority_support')?.value === 'true';

  return {
    // Data
    userPlan,
    availablePlans,
    isLoading,
    error,

    // Actions
    refreshPlan,
    checkFeatureLimit,
    incrementUsage,
    upgradePlan,
    cancelSubscription,

    // Computed
    isFreePlan,
    isPremiumPlan,
    isProPlan,
    canAddPet,
    canMakeMatch,
    canPostReel,
    hasFeaturedPets,
    hasAnalytics,
    hasPrioritySupport
  };
}
