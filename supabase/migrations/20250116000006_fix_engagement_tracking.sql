DROP TRIGGER IF EXISTS update_idea_engagement_trigger ON ideas;
DROP FUNCTION IF EXISTS update_idea_engagement();
DROP FUNCTION IF EXISTS track_idea_viewers(UUID, INT);

ALTER PUBLICATION supabase_realtime DROP TABLE ideas;
ALTER PUBLICATION supabase_realtime ADD TABLE ideas;

CREATE OR REPLACE FUNCTION update_idea_engagement()
RETURNS TRIGGER AS $$
BEGIN
  NEW.engagement_score := (
    (NEW.upvotes * 2) +
    (NEW.views * 0.1) +
    (NEW.current_viewers * 5) +
    CASE 
      WHEN NEW.last_interaction_at IS NOT NULL THEN
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

UPDATE ideas 
SET last_interaction_at = NOW()
WHERE last_interaction_at IS NULL; 