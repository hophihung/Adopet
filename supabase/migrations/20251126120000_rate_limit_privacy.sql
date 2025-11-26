-- =====================================================
-- RATE LIMIT LOG + PET PRIVACY
-- =====================================================

-- 1. User action logs for rate limiting
CREATE TABLE IF NOT EXISTS public.user_action_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_action_logs_user_action_time
  ON public.user_action_logs(user_id, action_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_action_logs_created_at
  ON public.user_action_logs(created_at DESC);

-- 2. Rate limit enforcement function
DROP FUNCTION IF EXISTS public.enforce_rate_limit(text, integer, integer, integer);

CREATE OR REPLACE FUNCTION public.enforce_rate_limit(
  action_type_param text,
  window_seconds_param integer,
  max_count_param integer,
  unverified_max_count_param integer DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email_confirmed timestamptz;
  v_effective_limit integer;
  v_action_count integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  -- Determine email verification status
  SELECT email_confirmed_at
  INTO v_email_confirmed
  FROM auth.users
  WHERE id = v_user_id;

  v_effective_limit := max_count_param;
  IF v_email_confirmed IS NULL AND unverified_max_count_param IS NOT NULL THEN
    v_effective_limit := LEAST(max_count_param, unverified_max_count_param);
  END IF;

  SELECT COUNT(*) INTO v_action_count
  FROM public.user_action_logs
  WHERE user_id = v_user_id
    AND action_type = action_type_param
    AND created_at >= now() - make_interval(secs => window_seconds_param);

  IF v_action_count >= v_effective_limit THEN
    IF v_email_confirmed IS NULL THEN
      RAISE EXCEPTION 'RATE_LIMIT_VERIFY'
        USING DETAIL = 'Need email verification to continue',
              HINT = 'verify_email';
    ELSE
      RAISE EXCEPTION 'RATE_LIMIT_EXCEEDED'
        USING DETAIL = format('Too many %s actions. Try again later.', action_type_param),
              HINT = 'rate_limit';
    END IF;
  END IF;

  INSERT INTO public.user_action_logs(user_id, action_type)
  VALUES (v_user_id, action_type_param);

  RETURN true;
END;
$$;

-- 3. Pet privacy columns
ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS contact_visibility text NOT NULL DEFAULT 'chat_only'
    CHECK (contact_visibility IN ('chat_only', 'public')),
  ADD COLUMN IF NOT EXISTS location_privacy text NOT NULL DEFAULT 'approximate'
    CHECK (location_privacy IN ('approximate', 'precise'));

-- Ensure existing rows default to safe values
UPDATE public.pets
SET contact_visibility = 'chat_only'
WHERE contact_visibility IS NULL;

UPDATE public.pets
SET location_privacy = 'approximate'
WHERE location_privacy IS NULL;

-- =====================================================
-- END
-- =====================================================

