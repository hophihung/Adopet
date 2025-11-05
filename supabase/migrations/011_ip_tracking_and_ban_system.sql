/*
  # Hệ thống chống đăng ký nhiều tài khoản từ cùng IP
  
  1. Bảng mới
    - `ip_tracking`: Track IP addresses và số lượng tài khoản từ mỗi IP
    - `banned_ips`: Lưu các IP bị ban
  
  2. Functions
    - `track_user_ip(user_id, ip_address)`: Track IP khi user đăng ký/đăng nhập
    - `check_ip_ban(ip_address)`: Kiểm tra IP có bị ban không
    - `check_ip_account_limit(ip_address, max_accounts)`: Kiểm tra số tài khoản từ IP
    - `ban_ip(ip_address, reason)`: Ban một IP
  
  3. Cấu hình
    - Mặc định cho phép tối đa 3 tài khoản từ cùng IP
    - Có thể điều chỉnh trong code
*/

-- =====================================================
-- TABLE: ip_tracking
-- Track IP addresses và số lượng tài khoản từ mỗi IP
-- =====================================================
CREATE TABLE IF NOT EXISTS public.ip_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_seen_at timestamptz DEFAULT now(),
  last_seen_at timestamptz DEFAULT now(),
  account_count integer DEFAULT 1,
  UNIQUE(ip_address, user_id)
);

-- Index để tìm kiếm nhanh theo IP
CREATE INDEX IF NOT EXISTS idx_ip_tracking_ip ON public.ip_tracking(ip_address);
CREATE INDEX IF NOT EXISTS idx_ip_tracking_user ON public.ip_tracking(user_id);

-- =====================================================
-- TABLE: banned_ips
-- Lưu các IP bị ban
-- =====================================================
CREATE TABLE IF NOT EXISTS public.banned_ips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL UNIQUE,
  banned_at timestamptz DEFAULT now(),
  banned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason text,
  expires_at timestamptz, -- NULL = ban vĩnh viễn
  is_active boolean DEFAULT true
);

-- Index để check ban nhanh
CREATE INDEX IF NOT EXISTS idx_banned_ips_ip ON public.banned_ips(ip_address);
CREATE INDEX IF NOT EXISTS idx_banned_ips_active ON public.banned_ips(is_active, expires_at);

-- =====================================================
-- FUNCTION: Track IP khi user đăng ký/đăng nhập
-- =====================================================
CREATE OR REPLACE FUNCTION public.track_user_ip(
  p_user_id uuid,
  p_ip_address text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_account_count integer;
  v_is_banned boolean;
  v_result jsonb;
BEGIN
  -- Kiểm tra IP có bị ban không
  SELECT EXISTS (
    SELECT 1 FROM public.banned_ips
    WHERE ip_address = p_ip_address
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  ) INTO v_is_banned;

  IF v_is_banned THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'IP_ADDRESS_BANNED',
      'message', 'IP address của bạn đã bị ban'
    );
  END IF;

  -- Cập nhật hoặc insert tracking
  INSERT INTO public.ip_tracking (ip_address, user_id, last_seen_at)
  VALUES (p_ip_address, p_user_id, now())
  ON CONFLICT (ip_address, user_id)
  DO UPDATE SET last_seen_at = now();

  -- Đếm số tài khoản từ IP này
  SELECT COUNT(DISTINCT user_id) INTO v_account_count
  FROM public.ip_tracking
  WHERE ip_address = p_ip_address;

  -- Cập nhật account_count cho tất cả records của IP này
  UPDATE public.ip_tracking
  SET account_count = v_account_count
  WHERE ip_address = p_ip_address;

  RETURN jsonb_build_object(
    'success', true,
    'account_count', v_account_count,
    'ip_address', p_ip_address
  );
END;
$$;

-- =====================================================
-- FUNCTION: Kiểm tra IP có bị ban không
-- =====================================================
CREATE OR REPLACE FUNCTION public.check_ip_ban(
  p_ip_address text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_banned_record record;
BEGIN
  SELECT * INTO v_banned_record
  FROM public.banned_ips
  WHERE ip_address = p_ip_address
  AND is_active = true
  AND (expires_at IS NULL OR expires_at > now())
  LIMIT 1;

  IF v_banned_record IS NULL THEN
    RETURN jsonb_build_object(
      'banned', false
    );
  END IF;

  RETURN jsonb_build_object(
    'banned', true,
    'reason', v_banned_record.reason,
    'banned_at', v_banned_record.banned_at,
    'expires_at', v_banned_record.expires_at
  );
END;
$$;

-- =====================================================
-- FUNCTION: Kiểm tra số tài khoản từ IP và tự động ban nếu vượt quá
-- =====================================================
CREATE OR REPLACE FUNCTION public.check_ip_account_limit(
  p_ip_address text,
  p_max_accounts integer DEFAULT 3
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_account_count integer;
  v_result jsonb;
BEGIN
  -- Đếm số tài khoản từ IP này
  SELECT COUNT(DISTINCT user_id) INTO v_account_count
  FROM public.ip_tracking
  WHERE ip_address = p_ip_address;

  -- Nếu vượt quá giới hạn, tự động ban
  IF v_account_count >= p_max_accounts THEN
    -- Ban IP (không cần banned_by vì đây là auto-ban)
    INSERT INTO public.banned_ips (ip_address, reason, expires_at)
    VALUES (
      p_ip_address,
      format('Tự động ban: %s tài khoản từ cùng IP (giới hạn: %s)', v_account_count, p_max_accounts),
      NULL -- Ban vĩnh viễn
    )
    ON CONFLICT (ip_address)
    DO UPDATE SET
      is_active = true,
      reason = format('Tự động ban: %s tài khoản từ cùng IP (giới hạn: %s)', v_account_count, p_max_accounts),
      expires_at = NULL,
      banned_at = now();

    RETURN jsonb_build_object(
      'success', false,
      'banned', true,
      'account_count', v_account_count,
      'max_accounts', p_max_accounts,
      'error', 'IP_ACCOUNT_LIMIT_EXCEEDED',
      'message', format('IP đã đăng ký quá %s tài khoản và đã bị ban', p_max_accounts)
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'banned', false,
    'account_count', v_account_count,
    'max_accounts', p_max_accounts,
    'remaining', p_max_accounts - v_account_count
  );
END;
$$;

-- =====================================================
-- FUNCTION: Ban một IP (cho admin)
-- =====================================================
CREATE OR REPLACE FUNCTION public.ban_ip(
  p_ip_address text,
  p_reason text DEFAULT NULL,
  p_expires_at timestamptz DEFAULT NULL,
  p_banned_by uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.banned_ips (ip_address, reason, expires_at, banned_by)
  VALUES (p_ip_address, p_reason, p_expires_at, p_banned_by)
  ON CONFLICT (ip_address)
  DO UPDATE SET
    is_active = true,
    reason = COALESCE(p_reason, banned_ips.reason),
    expires_at = COALESCE(p_expires_at, banned_ips.expires_at),
    banned_by = COALESCE(p_banned_by, banned_ips.banned_by),
    banned_at = now();

  RETURN jsonb_build_object(
    'success', true,
    'message', format('IP %s đã bị ban', p_ip_address)
  );
END;
$$;

-- =====================================================
-- FUNCTION: Unban một IP (cho admin)
-- =====================================================
CREATE OR REPLACE FUNCTION public.unban_ip(
  p_ip_address text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.banned_ips
  SET is_active = false
  WHERE ip_address = p_ip_address;

  RETURN jsonb_build_object(
    'success', true,
    'message', format('IP %s đã được gỡ ban', p_ip_address)
  );
END;
$$;

-- =====================================================
-- RLS Policies
-- =====================================================
ALTER TABLE public.ip_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banned_ips ENABLE ROW LEVEL SECURITY;

-- Policy: Users có thể đọc tracking của chính họ
CREATE POLICY "Users can view own IP tracking"
  ON public.ip_tracking
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users có thể insert tracking của chính họ
CREATE POLICY "Users can insert own IP tracking"
  ON public.ip_tracking
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users có thể update tracking của chính họ
CREATE POLICY "Users can update own IP tracking"
  ON public.ip_tracking
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Service role có thể quản lý tất cả tracking
CREATE POLICY "Service can manage all IP tracking"
  ON public.ip_tracking
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Users có thể check xem IP của họ có bị ban không (qua function)
-- Nhưng không thể xem danh sách tất cả banned IPs
CREATE POLICY "Users cannot view banned IPs list"
  ON public.banned_ips
  FOR SELECT
  TO authenticated
  USING (false);

-- Policy: Chỉ service role có thể quản lý banned IPs
CREATE POLICY "Service can manage banned IPs"
  ON public.banned_ips
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- COMMENT
-- =====================================================
COMMENT ON TABLE public.ip_tracking IS 'Track IP addresses và số lượng tài khoản từ mỗi IP';
COMMENT ON TABLE public.banned_ips IS 'Lưu các IP bị ban';
COMMENT ON FUNCTION public.track_user_ip IS 'Track IP khi user đăng ký/đăng nhập';
COMMENT ON FUNCTION public.check_ip_ban IS 'Kiểm tra IP có bị ban không';
COMMENT ON FUNCTION public.check_ip_account_limit IS 'Kiểm tra số tài khoản từ IP và tự động ban nếu vượt quá';
COMMENT ON FUNCTION public.ban_ip IS 'Ban một IP (cho admin)';
COMMENT ON FUNCTION public.unban_ip IS 'Unban một IP (cho admin)';

