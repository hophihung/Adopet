-- =====================================================
-- ENHANCE REVIEWS SYSTEM
-- Add image uploads, review reports, and filtering support
-- =====================================================

-- 1. Add image_urls to product_reviews
ALTER TABLE public.product_reviews
  ADD COLUMN IF NOT EXISTS image_urls text[] DEFAULT '{}';

-- 2. Create review_reports table for moderation
CREATE TABLE IF NOT EXISTS public.review_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.product_reviews(id) ON DELETE CASCADE,
  reported_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Report details
  reason text NOT NULL CHECK (reason IN ('spam', 'inappropriate', 'fake', 'offensive', 'other')),
  description text,
  
  -- Status
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  reviewed_by uuid REFERENCES public.profiles(id),
  reviewed_at timestamptz,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- One report per user per review
  UNIQUE(review_id, reported_by)
);

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_review_reports_review_id ON public.review_reports(review_id);
CREATE INDEX IF NOT EXISTS idx_review_reports_reported_by ON public.review_reports(reported_by);
CREATE INDEX IF NOT EXISTS idx_review_reports_status ON public.review_reports(status);
CREATE INDEX IF NOT EXISTS idx_product_reviews_rating ON public.product_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_product_reviews_helpful_count ON public.product_reviews(helpful_count DESC);

-- 4. Enable RLS
ALTER TABLE public.review_reports ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for review_reports
DROP POLICY IF EXISTS "Users can view all reports" ON public.review_reports;
CREATE POLICY "Users can view all reports"
  ON public.review_reports FOR SELECT
  TO authenticated
  USING (true); -- All authenticated users can view reports

DROP POLICY IF EXISTS "Users can create reports" ON public.review_reports;
CREATE POLICY "Users can create reports"
  ON public.review_reports FOR INSERT
  TO authenticated
  WITH CHECK (reported_by = auth.uid());

DROP POLICY IF EXISTS "Admins can update reports" ON public.review_reports;
CREATE POLICY "Admins can update reports"
  ON public.review_reports FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 6. Function to update review status when reported
CREATE OR REPLACE FUNCTION auto_hide_review_on_multiple_reports()
RETURNS TRIGGER AS $$
DECLARE
  report_count integer;
BEGIN
  -- Count pending/reviewed reports for this review
  SELECT COUNT(*) INTO report_count
  FROM public.review_reports
  WHERE review_id = NEW.review_id
    AND status IN ('pending', 'reviewed');
  
  -- If 3 or more reports, auto-hide review
  IF report_count >= 3 THEN
    UPDATE public.product_reviews
    SET status = 'hidden'
    WHERE id = NEW.review_id AND status = 'active';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Trigger to auto-hide on multiple reports
DROP TRIGGER IF EXISTS trigger_auto_hide_review_on_reports ON public.review_reports;
CREATE TRIGGER trigger_auto_hide_review_on_reports
  AFTER INSERT ON public.review_reports
  FOR EACH ROW
  EXECUTE FUNCTION auto_hide_review_on_multiple_reports();

-- 8. Enable realtime for review_reports
ALTER PUBLICATION supabase_realtime ADD TABLE public.review_reports;

-- =====================================================
-- COMPLETED! 🎉
-- Reviews system enhanced with images, reports, and filtering
-- =====================================================

