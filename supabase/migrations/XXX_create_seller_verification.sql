-- Create seller_verifications table
CREATE TABLE IF NOT EXISTS public.seller_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Verification documents
  identity_document_url text, -- CMND/CCCD
  business_license_url text, -- Business license (optional)
  
  -- Bank account verification
  bank_account_verified boolean DEFAULT false,
  bank_verification_date timestamptz,
  
  -- Status
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'verified', 'rejected')),
  
  -- Admin actions
  verified_by uuid REFERENCES public.profiles(id),
  verified_at timestamptz,
  verification_notes text,
  rejected_reason text,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- One verification per seller
  UNIQUE(seller_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_seller_verifications_status ON public.seller_verifications(status);
CREATE INDEX IF NOT EXISTS idx_seller_verifications_seller_id ON public.seller_verifications(seller_id);

-- Enable RLS
ALTER TABLE public.seller_verifications ENABLE ROW LEVEL SECURITY;

-- Policy: Sellers can view their own verification
CREATE POLICY "Sellers can view own verification"
  ON public.seller_verifications FOR SELECT
  TO authenticated
  USING (seller_id = auth.uid());

-- Policy: Sellers can insert their own verification
CREATE POLICY "Sellers can create own verification"
  ON public.seller_verifications FOR INSERT
  TO authenticated
  WITH CHECK (seller_id = auth.uid());

-- Policy: Sellers can update their own verification (only when pending)
CREATE POLICY "Sellers can update own verification when pending"
  ON public.seller_verifications FOR UPDATE
  TO authenticated
  USING (seller_id = auth.uid() AND status = 'pending');

-- Function to auto-create verification when seller creates profile
CREATE OR REPLACE FUNCTION auto_create_seller_verification()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'seller' THEN
    INSERT INTO public.seller_verifications (seller_id, status)
    VALUES (NEW.id, 'pending')
    ON CONFLICT (seller_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create verification
DROP TRIGGER IF EXISTS trigger_auto_create_seller_verification ON public.profiles;
CREATE TRIGGER trigger_auto_create_seller_verification
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_seller_verification();

