-- Function to increment idea views
CREATE OR REPLACE FUNCTION increment_idea_views(idea_id_input UUID)
RETURNS INT AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION increment_idea_views TO authenticated, anon; 