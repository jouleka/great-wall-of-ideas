DROP FUNCTION IF EXISTS public.handle_vote(UUID, UUID, TEXT);

CREATE OR REPLACE FUNCTION public.handle_vote(
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
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Unauthorized: User must be authenticated to vote'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM ideas WHERE id = p_idea_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Idea not found'
    );
  END IF;

  -- Lock the votes table for this idea to prevent race conditions
  PERFORM pg_advisory_xact_lock(hashtext('vote_lock'::text || p_idea_id::text));

  SELECT vote_type INTO existing_vote
  FROM votes
  WHERE idea_id = p_idea_id AND user_id = p_user_id;

  IF existing_vote IS NULL THEN
    INSERT INTO votes (idea_id, user_id, vote_type)
    VALUES (p_idea_id, p_user_id, p_vote_type);
    
    SELECT COUNT(*) INTO upvotes_count
    FROM votes
    WHERE idea_id = p_idea_id AND vote_type = 'upvote';

    SELECT COUNT(*) INTO downvotes_count
    FROM votes
    WHERE idea_id = p_idea_id AND vote_type = 'downvote';

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
    DELETE FROM votes
    WHERE idea_id = p_idea_id AND user_id = p_user_id;
    
    SELECT COUNT(*) INTO upvotes_count
    FROM votes
    WHERE idea_id = p_idea_id AND vote_type = 'upvote';

    SELECT COUNT(*) INTO downvotes_count
    FROM votes
    WHERE idea_id = p_idea_id AND vote_type = 'downvote';

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
    UPDATE votes
    SET vote_type = p_vote_type,
        voted_at = TIMEZONE('utc'::text, NOW())
    WHERE idea_id = p_idea_id AND user_id = p_user_id;
    
    SELECT COUNT(*) INTO upvotes_count
    FROM votes
    WHERE idea_id = p_idea_id AND vote_type = 'upvote';

    SELECT COUNT(*) INTO downvotes_count
    FROM votes
    WHERE idea_id = p_idea_id AND vote_type = 'downvote';

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

REVOKE ALL ON FUNCTION public.handle_vote FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_vote TO authenticated;