-- Create content_reports table
CREATE TABLE IF NOT EXISTS public.content_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Target of report
  target_type text NOT NULL CHECK (target_type IN ('post', 'reel', 'user', 'product', 'pet')),
  target_id uuid NOT NULL,
  
  -- Report details
  report_type text NOT NULL CHECK (report_type IN ('spam', 'inappropriate', 'harassment', 'fake', 'other')),
  reason text NOT NULL,
  evidence_urls text[],
  
  -- Status
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  
  -- Admin actions
  reviewed_by uuid REFERENCES public.profiles(id),
  reviewed_at timestamptz,
  admin_notes text,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_content_reports_reporter ON public.content_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_target ON public.content_reports(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_status ON public.content_reports(status);

-- Enable RLS
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

-- Policy: Users can create reports
CREATE POLICY "Users can create reports"
  ON public.content_reports FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = auth.uid());

-- Policy: Users can view their own reports
CREATE POLICY "Users can view own reports"
  ON public.content_reports FOR SELECT
  TO authenticated
  USING (reporter_id = auth.uid());

-- Policy: Admins can view all reports
CREATE POLICY "Admins can view all reports"
  ON public.content_reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

