-- Create reports table
CREATE TABLE IF NOT EXISTS reports (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  notes TEXT
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create reports"
  ON reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view their own reports"
  ON reports FOR SELECT
  USING (auth.uid() = reporter_id);

CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_comment_id ON reports(comment_id);

CREATE OR REPLACE FUNCTION check_duplicate_report()
RETURNS TRIGGER 
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM reports 
    WHERE comment_id = NEW.comment_id 
    AND reporter_id = NEW.reporter_id
    AND status NOT IN ('resolved', 'dismissed')
  ) THEN
    RAISE EXCEPTION 'You have already reported this comment';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_duplicate_reports
  BEFORE INSERT ON reports
  FOR EACH ROW
  EXECUTE FUNCTION check_duplicate_report(); 