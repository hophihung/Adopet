import { supabase } from '@/lib/supabase';

export type PaymentMethod = 'payos' | 'momo' | 'zalopay' | 'bank_transfer' | 'cod';

export interface PaymentMethodConfig {
  id: PaymentMethod;
  name: string;
  icon: string;
  enabled: boolean;
  description: string;
}

export const PAYMENT_METHODS: PaymentMethodConfig[] = [
  {
    id: 'payos',
    name: 'PayOS',
    icon: '💳',
    enabled: true,
    description: 'Thanh toán qua PayOS',
  },
  {
    id: 'momo',
    name: 'MoMo',
    icon: '📱',
    enabled: false,
    description: 'Thanh toán qua ví MoMo',
  },
  {
    id: 'zalopay',
    name: 'ZaloPay',
    icon: '💸',
    enabled: false,
    description: 'Thanh toán qua ZaloPay',
  },
  {
    id: 'bank_transfer',
    name: 'Chuyển khoản',
    icon: '🏦',
    enabled: true,
    description: 'Chuyển khoản ngân hàng',
  },
  {
    id: 'cod',
    name: 'COD',
    icon: '💰',
    enabled: true,
    description: 'Thanh toán khi nhận hàng',
  },
];

export const PaymentMethodsService = {
  async getAvailableMethods(): Promise<PaymentMethodConfig[]> {
    return PAYMENT_METHODS.filter((method) => method.enabled);
  },

  async getUserPreferredMethod(userId: string): Promise<PaymentMethod | null> {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('preferred_payment_method')
      .eq('user_id', userId)
      .single();

    if (error || !data) return 'payos';
    return (data.preferred_payment_method as PaymentMethod) || 'payos';
  },

  async setUserPreferredMethod(userId: string, method: PaymentMethod): Promise<void> {
    await supabase
      .from('user_preferences')
      .upsert({
        user_id: userId,
        preferred_payment_method: method,
        updated_at: new Date().toISOString(),
      });
  },
};

