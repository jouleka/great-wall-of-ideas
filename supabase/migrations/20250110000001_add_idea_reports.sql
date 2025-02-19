ALTER TABLE reports
ADD COLUMN idea_id UUID REFERENCES ideas(id) ON DELETE CASCADE;

ALTER TABLE reports
ADD CONSTRAINT report_target_check CHECK (
  (comment_id IS NOT NULL AND idea_id IS NULL) OR
  (comment_id IS NULL AND idea_id IS NOT NULL)
);

CREATE OR REPLACE FUNCTION check_duplicate_report()
RETURNS TRIGGER 
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.comment_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM reports 
    WHERE comment_id = NEW.comment_id 
    AND reporter_id = NEW.reporter_id
    AND status NOT IN ('resolved', 'dismissed')
  ) THEN
    RAISE EXCEPTION 'You have already reported this comment';
  END IF;

  IF NEW.idea_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM reports 
    WHERE idea_id = NEW.idea_id 
    AND reporter_id = NEW.reporter_id
    AND status NOT IN ('resolved', 'dismissed')
  ) THEN
    RAISE EXCEPTION 'You have already reported this idea';
  END IF;

  RETURN NEW;
END;
$$;

CREATE INDEX idx_reports_idea_id ON reports(idea_id);

DROP POLICY IF EXISTS "Users can create reports" ON reports;
DROP POLICY IF EXISTS "Users can view their own reports" ON reports;

CREATE POLICY "Users can create comment reports"
  ON reports FOR INSERT
  WITH CHECK (
    auth.uid() = reporter_id 
    AND comment_id IS NOT NULL 
    AND NOT EXISTS (
      SELECT 1 FROM comments c
      WHERE c.id = comment_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create idea reports"
  ON reports FOR INSERT
  WITH CHECK (
    auth.uid() = reporter_id 
    AND idea_id IS NOT NULL 
    AND NOT EXISTS (
      SELECT 1 FROM ideas i
      WHERE i.id = idea_id AND i.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their own reports"
  ON reports FOR SELECT
  USING (auth.uid() = reporter_id); 