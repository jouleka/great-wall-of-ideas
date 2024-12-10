-- Drop existing function first
DROP FUNCTION IF EXISTS public.handle_vote(UUID, UUID, TEXT);

-- Function to handle voting with proper restrictions
CREATE OR REPLACE FUNCTION public.handle_vote(
  p_idea_id UUID,
  p_user_id UUID,
  p_vote_type TEXT
)
RETURNS JSONB 
SET search_path = public
AS $$
DECLARE
  existing_vote TEXT;
  vote_count INT;
  upvotes_count INT;
  downvotes_count INT;
  result JSONB;
BEGIN
  -- Verify user exists and is authenticated
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Unauthorized: User must be authenticated to vote'
    );
  END IF;

  -- Verify idea exists
  IF NOT EXISTS (SELECT 1 FROM ideas WHERE id = p_idea_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Idea not found'
    );
  END IF;

  -- Lock the votes table for this idea to prevent race conditions
  PERFORM pg_advisory_xact_lock(hashtext('vote_lock'::text || p_idea_id::text));

  -- Check for existing vote
  SELECT vote_type INTO existing_vote
  FROM votes
  WHERE idea_id = p_idea_id AND user_id = p_user_id;

  -- Handle the vote based on existing state
  IF existing_vote IS NULL THEN
    -- No existing vote, insert new vote
    INSERT INTO votes (idea_id, user_id, vote_type)
    VALUES (p_idea_id, p_user_id, p_vote_type);
    
    -- Count votes
    SELECT COUNT(*) INTO upvotes_count
    FROM votes
    WHERE idea_id = p_idea_id AND vote_type = 'upvote';

    SELECT COUNT(*) INTO downvotes_count
    FROM votes
    WHERE idea_id = p_idea_id AND vote_type = 'downvote';

    -- Update idea counts
    UPDATE ideas
    SET upvotes = upvotes_count,
        downvotes = downvotes_count
    WHERE id = p_idea_id;
    
    result := jsonb_build_object(
      'success', true,
      'message', 'Vote recorded successfully',
      'action', 'added',
      'vote_type', p_vote_type,
      'upvotes', upvotes_count,
      'downvotes', downvotes_count
    );
  ELSIF existing_vote = p_vote_type THEN
    -- Same vote type, remove the vote (toggle)
    DELETE FROM votes
    WHERE idea_id = p_idea_id AND user_id = p_user_id;
    
    -- Count votes
    SELECT COUNT(*) INTO upvotes_count
    FROM votes
    WHERE idea_id = p_idea_id AND vote_type = 'upvote';

    SELECT COUNT(*) INTO downvotes_count
    FROM votes
    WHERE idea_id = p_idea_id AND vote_type = 'downvote';

    -- Update idea counts
    UPDATE ideas
    SET upvotes = upvotes_count,
        downvotes = downvotes_count
    WHERE id = p_idea_id;
    
    result := jsonb_build_object(
      'success', true,
      'message', 'Vote removed successfully',
      'action', 'removed',
      'vote_type', null,
      'upvotes', upvotes_count,
      'downvotes', downvotes_count
    );
  ELSE
    -- Different vote type, update the vote
    UPDATE votes
    SET vote_type = p_vote_type,
        voted_at = TIMEZONE('utc'::text, NOW())
    WHERE idea_id = p_idea_id AND user_id = p_user_id;
    
    -- Count votes
    SELECT COUNT(*) INTO upvotes_count
    FROM votes
    WHERE idea_id = p_idea_id AND vote_type = 'upvote';

    SELECT COUNT(*) INTO downvotes_count
    FROM votes
    WHERE idea_id = p_idea_id AND vote_type = 'downvote';

    -- Update idea counts
    UPDATE ideas
    SET upvotes = upvotes_count,
        downvotes = downvotes_count
    WHERE id = p_idea_id;
    
    result := jsonb_build_object(
      'success', true,
      'message', 'Vote updated successfully',
      'action', 'updated',
      'vote_type', p_vote_type,
      'upvotes', upvotes_count,
      'downvotes', downvotes_count
    );
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission only to authenticated users
REVOKE ALL ON FUNCTION public.handle_vote FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_vote TO authenticated;