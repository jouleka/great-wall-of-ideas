-- ... (keep all your existing SQL code)

-- Add this new function at the end of your existing SQL script

-- Create a function to update idea votes
CREATE OR REPLACE FUNCTION update_idea_votes(p_idea_id UUID)
RETURNS VOID AS $$
DECLARE
  upvotes_count INT;
  downvotes_count INT;
BEGIN
  -- Count upvotes
  SELECT COUNT(*) INTO upvotes_count
  FROM votes
  WHERE idea_id = p_idea_id AND vote_type = 'upvote';

  -- Count downvotes
  SELECT COUNT(*) INTO downvotes_count
  FROM votes
  WHERE idea_id = p_idea_id AND vote_type = 'downvote';

  -- Update the idea
  UPDATE ideas
  SET upvotes = upvotes_count,
      downvotes = downvotes_count
  WHERE id = p_idea_id;
END;
$$ LANGUAGE plpgsql;
