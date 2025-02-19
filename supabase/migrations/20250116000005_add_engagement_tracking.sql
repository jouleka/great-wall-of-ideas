-- Add engagement tracking columns to ideas table
ALTER TABLE ideas
ADD COLUMN IF NOT EXISTS current_viewers INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS engagement_score FLOAT DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_interaction_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW());

CREATE INDEX IF NOT EXISTS idx_ideas_engagement ON ideas (engagement_score DESC, last_interaction_at DESC);

-- Enable full realtime for ideas table
ALTER PUBLICATION supabase_realtime DROP TABLE ideas;
ALTER PUBLICATION supabase_realtime ADD TABLE ideas;

CREATE OR REPLACE FUNCTION update_idea_engagement()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate engagement score based on various factors
  NEW.engagement_score := (
    (NEW.upvotes * 2) +           -- Upvotes weight
    (NEW.views * 0.1) +           -- Views weight
    (NEW.current_viewers * 5) +    -- Active viewers weight
    CASE 
      WHEN NEW.last_interaction_at IS NOT NULL THEN
        -- Time decay factor (exponential decay over 24 hours)
        EXP(
          -EXTRACT(EPOCH FROM (NOW() - NEW.last_interaction_at)) / 
          (24 * 60 * 60)
        ) * 10
      ELSE 0
    END
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_idea_engagement_trigger
  BEFORE INSERT OR UPDATE OF upvotes, downvotes, views, current_viewers, last_interaction_at
  ON ideas
  FOR EACH ROW
  EXECUTE FUNCTION update_idea_engagement();

CREATE OR REPLACE FUNCTION track_idea_viewers(
  idea_id UUID,
  viewer_count INT
)
RETURNS void AS $$
BEGIN
  UPDATE ideas
  SET 
    current_viewers = viewer_count,
    last_interaction_at = NOW()
  WHERE id = idea_id;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION track_idea_viewers TO authenticated;
GRANT EXECUTE ON FUNCTION update_idea_engagement TO authenticated; 