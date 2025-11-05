-- =====================================================
-- CREATE VIRTUAL PETS TABLE
-- Bảng quản lý virtual pet (Tamagotchi-style) cho mỗi user
-- =====================================================

-- Tạo bảng virtual_pets
CREATE TABLE IF NOT EXISTS public.virtual_pets (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  pet_type text CHECK (pet_type IN ('cat', 'dog', 'bird')) NOT NULL,
  name text NOT NULL DEFAULT 'My Pet',
  
  -- Game stats
  level integer NOT NULL DEFAULT 1,
  exp integer NOT NULL DEFAULT 0,
  exp_to_next_level integer NOT NULL DEFAULT 100,
  mood integer NOT NULL DEFAULT 100 CHECK (mood >= 0 AND mood <= 100),
  
  -- Check-in tracking
  last_checkin_date date,
  streak_days integer NOT NULL DEFAULT 0,
  
  -- Customization (for future expansion)
  skin_id text DEFAULT 'default',
  background_id text DEFAULT 'default',
  
  -- Timestamps
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  -- Mỗi user chỉ có 1 virtual pet
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE public.virtual_pets ENABLE ROW LEVEL SECURITY;

-- Policy: Users chỉ có thể xem virtual pet của chính họ
CREATE POLICY "Users can view own virtual pet"
  ON public.virtual_pets FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users có thể tạo virtual pet của chính họ
CREATE POLICY "Users can create own virtual pet"
  ON public.virtual_pets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users có thể update virtual pet của chính họ
CREATE POLICY "Users can update own virtual pet"
  ON public.virtual_pets FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users có thể delete virtual pet của chính họ
CREATE POLICY "Users can delete own virtual pet"
  ON public.virtual_pets FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger để tự động update updated_at
CREATE TRIGGER on_virtual_pet_updated
  BEFORE UPDATE ON public.virtual_pets
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Indexes để tối ưu performance
CREATE INDEX IF NOT EXISTS idx_virtual_pets_user_id ON public.virtual_pets(user_id);
CREATE INDEX IF NOT EXISTS idx_virtual_pets_pet_type ON public.virtual_pets(pet_type);
CREATE INDEX IF NOT EXISTS idx_virtual_pets_last_checkin ON public.virtual_pets(last_checkin_date);

-- =====================================================
-- FUNCTION: Calculate exp required for next level
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_exp_to_next_level(current_level integer)
RETURNS integer AS $$
BEGIN
  -- Formula: 100 * (level ^ 1.5)
  -- Level 1 -> 100 exp
  -- Level 2 -> ~283 exp
  -- Level 3 -> ~520 exp
  -- Level 5 -> ~1118 exp
  RETURN ROUND(100 * POWER(current_level, 1.5))::integer;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- FUNCTION: Level up virtual pet
-- =====================================================
CREATE OR REPLACE FUNCTION level_up_virtual_pet(pet_id uuid)
RETURNS boolean AS $$
DECLARE
  current_level integer;
  current_exp integer;
  exp_needed integer;
  new_level integer;
BEGIN
  -- Lấy thông tin hiện tại
  SELECT level, exp INTO current_level, current_exp
  FROM public.virtual_pets
  WHERE id = pet_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Tính exp cần cho level tiếp theo
  exp_needed := calculate_exp_to_next_level(current_level);
  
  -- Kiểm tra xem có đủ exp để level up không
  IF current_exp >= exp_needed THEN
    new_level := current_level + 1;
    
    -- Update level và reset exp (trừ đi exp đã dùng)
    UPDATE public.virtual_pets
    SET 
      level = new_level,
      exp = current_exp - exp_needed,
      exp_to_next_level = calculate_exp_to_next_level(new_level),
      updated_at = now()
    WHERE id = pet_id;
    
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION: Daily check-in với logic mood decay
-- =====================================================
CREATE OR REPLACE FUNCTION daily_checkin_virtual_pet(pet_id uuid)
RETURNS jsonb AS $$
DECLARE
  pet_record RECORD;
  today_date date;
  last_checkin date;
  days_since_checkin integer;
  exp_gain integer := 50;
  mood_gain integer := 10;
  mood_loss integer := 20;
  level_up_occurred boolean := false;
  result jsonb;
BEGIN
  today_date := CURRENT_DATE;
  
  -- Lấy thông tin pet
  SELECT * INTO pet_record
  FROM public.virtual_pets
  WHERE id = pet_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pet not found');
  END IF;
  
  last_checkin := pet_record.last_checkin_date;
  days_since_checkin := COALESCE(today_date - last_checkin, 999);
  
  -- Nếu đã check-in hôm nay rồi
  IF last_checkin = today_date THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Already checked in today',
      'pet', row_to_json(pet_record)::jsonb
    );
  END IF;
  
  -- Tính toán mood decay nếu không check-in > 2 ngày
  IF days_since_checkin > 2 THEN
    mood_loss := mood_loss * (days_since_checkin - 2);
  ELSE
    -- Nếu check-in trong vòng 2 ngày, tăng streak
    IF days_since_checkin = 1 THEN
      -- Streak tiếp tục
    ELSE
      -- Reset streak nếu cách > 1 ngày
      UPDATE public.virtual_pets
      SET streak_days = 0
      WHERE id = pet_id;
    END IF;
  END IF;
  
  -- Update pet với check-in
  UPDATE public.virtual_pets
  SET 
    exp = exp + exp_gain,
    mood = LEAST(100, GREATEST(0, mood + mood_gain - CASE WHEN days_since_checkin > 2 THEN mood_loss ELSE 0 END)),
    last_checkin_date = today_date,
    streak_days = CASE 
      WHEN days_since_checkin = 1 THEN streak_days + 1
      WHEN days_since_checkin > 1 THEN 1
      ELSE streak_days + 1
    END,
    updated_at = now()
  WHERE id = pet_id
  RETURNING * INTO pet_record;
  
  -- Kiểm tra level up
  level_up_occurred := level_up_virtual_pet(pet_id);
  
  -- Nếu level up, lấy lại thông tin pet
  IF level_up_occurred THEN
    SELECT * INTO pet_record
    FROM public.virtual_pets
    WHERE id = pet_id;
  END IF;
  
  -- Return result
  result := jsonb_build_object(
    'success', true,
    'exp_gain', exp_gain,
    'mood_gain', mood_gain,
    'level_up', level_up_occurred,
    'pet', row_to_json(pet_record)::jsonb
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: Decay mood cho pet chưa được chăm sóc
-- Chạy hàng ngày (có thể setup cron job hoặc trigger)
-- =====================================================
CREATE OR REPLACE FUNCTION decay_mood_for_inactive_pets()
RETURNS void AS $$
BEGIN
  UPDATE public.virtual_pets
  SET 
    mood = GREATEST(0, mood - 5),
    updated_at = now()
  WHERE 
    last_checkin_date IS NULL 
    OR last_checkin_date < CURRENT_DATE - INTERVAL '2 days';
END;
$$ LANGUAGE plpgsql;

