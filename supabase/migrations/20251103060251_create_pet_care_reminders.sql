-- =====================================================
-- PET CARE REMINDERS FEATURE
-- Tables: pet_care_reminders, reminder_logs
-- RLS policies + indexes + triggers
-- =====================================================

-- 1) pet_care_reminders
CREATE TABLE IF NOT EXISTS public.pet_care_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- loại reminder
  type text NOT NULL CHECK (type IN (
    'feeding', 'medicine', 'health_check',
    'bathing', 'vaccination', 'exercise'
  )),

  -- thông tin
  title text NOT NULL,
  description text,

  -- lịch trình
  frequency text NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'custom')),
  time time NOT NULL,
  days_of_week integer[] CHECK (
    days_of_week IS NULL OR (
      array_length(days_of_week, 1) > 0 AND
      days_of_week <@ ARRAY[0,1,2,3,4,5,6]
    )
  ),
  custom_interval integer CHECK (custom_interval IS NULL OR custom_interval > 0),

  -- notification id để cancel (platform-dependent)
  notification_id text,

  -- trạng thái
  is_active boolean DEFAULT true,
  last_reminded_at timestamptz,
  next_reminder_at timestamptz NOT NULL,

  -- metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- constraints ràng buộc theo frequency
  CONSTRAINT valid_weekly_days CHECK (
    frequency <> 'weekly' OR days_of_week IS NOT NULL
  ),
  CONSTRAINT valid_custom_interval CHECK (
    frequency <> 'custom' OR custom_interval IS NOT NULL
  )
);

-- 2) reminder_logs
CREATE TABLE IF NOT EXISTS public.reminder_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_id uuid NOT NULL REFERENCES public.pet_care_reminders(id) ON DELETE CASCADE,

  reminded_at timestamptz DEFAULT now(),
  status text NOT NULL CHECK (status IN ('completed', 'snoozed', 'dismissed')),
  notes text,
  snoozed_until timestamptz,

  created_at timestamptz DEFAULT now()
);

-- 3) Indexes
CREATE INDEX IF NOT EXISTS idx_reminders_user_pet ON public.pet_care_reminders(user_id, pet_id);
CREATE INDEX IF NOT EXISTS idx_reminders_next_active ON public.pet_care_reminders(next_reminder_at) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_reminders_type ON public.pet_care_reminders(type);

CREATE INDEX IF NOT EXISTS idx_logs_reminder ON public.reminder_logs(reminder_id);
CREATE INDEX IF NOT EXISTS idx_logs_date ON public.reminder_logs(reminded_at DESC);

-- 4) Enable RLS
ALTER TABLE public.pet_care_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_logs ENABLE ROW LEVEL SECURITY;

-- 5) RLS policies for pet_care_reminders
DROP POLICY IF EXISTS "Users can view own reminders" ON public.pet_care_reminders;
CREATE POLICY "Users can view own reminders"
  ON public.pet_care_reminders FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own reminders" ON public.pet_care_reminders;
CREATE POLICY "Users can insert own reminders"
  ON public.pet_care_reminders FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own reminders" ON public.pet_care_reminders;
CREATE POLICY "Users can update own reminders"
  ON public.pet_care_reminders FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own reminders" ON public.pet_care_reminders;
CREATE POLICY "Users can delete own reminders"
  ON public.pet_care_reminders FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- 6) RLS policies for reminder_logs (scoped by related reminder.owner)
DROP POLICY IF EXISTS "Users can view logs of own reminders" ON public.reminder_logs;
CREATE POLICY "Users can view logs of own reminders"
  ON public.reminder_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pet_care_reminders r
      WHERE r.id = reminder_id AND r.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert logs for own reminders" ON public.reminder_logs;
CREATE POLICY "Users can insert logs for own reminders"
  ON public.reminder_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pet_care_reminders r
      WHERE r.id = reminder_id AND r.user_id = auth.uid()
    )
  );

-- Optional: allow update (e.g., add notes)
DROP POLICY IF EXISTS "Users can update logs of own reminders" ON public.reminder_logs;
CREATE POLICY "Users can update logs of own reminders"
  ON public.reminder_logs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pet_care_reminders r
      WHERE r.id = reminder_id AND r.user_id = auth.uid()
    )
  );

-- 7) updated_at trigger for pet_care_reminders
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pet_care_reminders_updated_at ON public.pet_care_reminders;
CREATE TRIGGER trg_pet_care_reminders_updated_at
  BEFORE UPDATE ON public.pet_care_reminders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 8) Realtime publications (optional)
ALTER PUBLICATION supabase_realtime ADD TABLE public.pet_care_reminders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reminder_logs;
