import { supabase } from '@/lib/supabase';

type RateLimitConfig = {
  windowSeconds: number;
  maxCount: number;
  unverifiedMaxCount?: number;
};

const ACTION_CONFIG: Record<string, RateLimitConfig> = {
  create_reel: { windowSeconds: 3600, maxCount: 5, unverifiedMaxCount: 2 },
  create_post: { windowSeconds: 1800, maxCount: 6, unverifiedMaxCount: 3 },
  send_message: { windowSeconds: 300, maxCount: 40, unverifiedMaxCount: 15 },
};

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export const RateLimitService = {
  async enforce(action: keyof typeof ACTION_CONFIG): Promise<void> {
    const config = ACTION_CONFIG[action];
    if (!config) {
      return;
    }

    const { error } = await supabase.rpc('enforce_rate_limit', {
      action_type_param: action,
      window_seconds_param: config.windowSeconds,
      max_count_param: config.maxCount,
      unverified_max_count_param: config.unverifiedMaxCount ?? config.maxCount,
    });

    if (error) {
      if (error.message === 'RATE_LIMIT_VERIFY') {
        throw new RateLimitError(
          'Hoạt động bị giới hạn. Vui lòng xác thực email/OTP để tiếp tục.'
        );
      }
      if (error.message === 'RATE_LIMIT_EXCEEDED') {
        throw new RateLimitError(
          'Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.'
        );
      }
      throw error;
    }
  },
};

