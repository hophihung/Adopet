-- Create commission_tiers table
CREATE TABLE IF NOT EXISTS public.commission_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_name text NOT NULL UNIQUE,
  min_reputation_points integer NOT NULL DEFAULT 0,
  max_reputation_points integer, -- NULL means no upper limit
  commission_rate decimal(5, 2) NOT NULL CHECK (commission_rate >= 0 AND commission_rate <= 100),
  processing_fee_rate decimal(5, 2) NOT NULL DEFAULT 1.00 CHECK (processing_fee_rate >= 0 AND processing_fee_rate <= 100),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert default tiers
INSERT INTO public.commission_tiers (tier_name, min_reputation_points, max_reputation_points, commission_rate, processing_fee_rate) VALUES
  ('Default', 0, 49, 6.00, 1.00),
  ('Bronze', 50, 99, 5.50, 1.00),
  ('Silver', 100, 199, 5.00, 1.00),
  ('Gold', 200, 499, 4.50, 1.00),
  ('Platinum', 500, 999, 4.00, 1.00),
  ('Diamond', 1000, NULL, 3.50, 1.00)
ON CONFLICT (tier_name) DO NOTHING;

-- Function to get commission tier by reputation points
CREATE OR REPLACE FUNCTION get_commission_tier_by_reputation(reputation_points integer)
RETURNS TABLE (
  tier_name text,
  commission_rate decimal,
  processing_fee_rate decimal
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ct.tier_name,
    ct.commission_rate,
    ct.processing_fee_rate
  FROM public.commission_tiers ct
  WHERE ct.is_active = true
    AND ct.min_reputation_points <= reputation_points
    AND (ct.max_reputation_points IS NULL OR ct.max_reputation_points >= reputation_points)
  ORDER BY ct.min_reputation_points DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Enable RLS
ALTER TABLE public.commission_tiers ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read active tiers
CREATE POLICY "Anyone can view active commission tiers"
  ON public.commission_tiers FOR SELECT
  TO authenticated
  USING (is_active = true);

