CREATE OR REPLACE FUNCTION increment_idea_views(idea_id_input UUID)
RETURNS INT 
SET search_path = public
AS $$
DECLARE
  new_views INT;
BEGIN
  -- Lock the row to prevent race conditions
  UPDATE ideas 
  SET views = views + 1
  WHERE id = idea_id_input
  RETURNING views INTO new_views;

  RETURN new_views;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION increment_idea_views TO authenticated, anon; 