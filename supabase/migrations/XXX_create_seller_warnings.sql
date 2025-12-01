-- =====================================================
-- CREATE SELLER WARNINGS TABLE
-- Hệ thống cảnh cáo seller khi vi phạm
-- =====================================================

CREATE TABLE IF NOT EXISTS public.seller_warnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Warning details
  warning_type text NOT NULL CHECK (warning_type IN ('content_violation', 'spam', 'inappropriate_content', 'fake_listing', 'harassment', 'other')),
  reason text NOT NULL,
  description text,
  
  -- Related content
  related_report_id uuid REFERENCES public.content_reports(id) ON DELETE SET NULL,
  related_content_type text, -- 'pet', 'product', 'post', 'reel'
  related_content_id uuid,
  
  -- Admin who issued warning
  issued_by uuid NOT NULL REFERENCES public.profiles(id),
  issued_at timestamptz DEFAULT now(),
  
  -- Warning status
  status text DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved', 'expired')),
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  
  -- Severity
  severity text DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_seller_warnings_seller_id ON public.seller_warnings(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_warnings_status ON public.seller_warnings(status);
CREATE INDEX IF NOT EXISTS idx_seller_warnings_issued_at ON public.seller_warnings(issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_seller_warnings_related_report ON public.seller_warnings(related_report_id);

-- Enable RLS
ALTER TABLE public.seller_warnings ENABLE ROW LEVEL SECURITY;

-- Policy: Sellers can view their own warnings
CREATE POLICY "Sellers can view own warnings"
  ON public.seller_warnings FOR SELECT
  TO authenticated
  USING (seller_id = auth.uid());

-- Policy: Admins can view all warnings
CREATE POLICY "Admins can view all warnings"
  ON public.seller_warnings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Admins can create warnings
CREATE POLICY "Admins can create warnings"
  ON public.seller_warnings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Admins can update warnings
CREATE POLICY "Admins can update warnings"
  ON public.seller_warnings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Function to create notification when warning is issued
CREATE OR REPLACE FUNCTION notify_seller_warning()
RETURNS TRIGGER AS $$
BEGIN
  -- Create notification for seller
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    body,
    data
  )
  VALUES (
    NEW.seller_id,
    'seller_warning',
    'Bạn đã nhận cảnh cáo từ admin',
    CASE 
      WHEN NEW.severity = 'critical' THEN 'Cảnh cáo nghiêm trọng: ' || NEW.reason
      WHEN NEW.severity = 'high' THEN 'Cảnh cáo: ' || NEW.reason
      ELSE 'Thông báo: ' || NEW.reason
    END,
    jsonb_build_object(
      'warning_id', NEW.id,
      'warning_type', NEW.warning_type,
      'severity', NEW.severity,
      'reason', NEW.reason
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create notification
DROP TRIGGER IF EXISTS trigger_notify_seller_warning ON public.seller_warnings;
CREATE TRIGGER trigger_notify_seller_warning
  AFTER INSERT ON public.seller_warnings
  FOR EACH ROW
  EXECUTE FUNCTION notify_seller_warning();

-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_seller_warnings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS on_seller_warnings_updated ON public.seller_warnings;
CREATE TRIGGER on_seller_warnings_updated
  BEFORE UPDATE ON public.seller_warnings
  FOR EACH ROW
  EXECUTE FUNCTION update_seller_warnings_updated_at();

