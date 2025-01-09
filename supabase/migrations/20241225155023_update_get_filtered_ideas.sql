-- Drop existing function
DROP FUNCTION IF EXISTS get_filtered_ideas;

-- Create improved function with private ideas handling
CREATE OR REPLACE FUNCTION get_filtered_ideas(
  p_page integer,
  p_limit integer,
  p_sort_type text,
  p_user_id uuid DEFAULT NULL
)
RETURNS SETOF ideas
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Log parameters for debugging
  RAISE NOTICE 'get_filtered_ideas called with: page=%, limit=%, sort_type=%, user_id=%', 
    p_page, p_limit, p_sort_type, p_user_id;

  RETURN QUERY
  WITH vote_counts AS (
    SELECT 
      idea_id,
      COUNT(*) FILTER (WHERE vote_type = 'upvote') as upvotes,
      COUNT(*) FILTER (WHERE vote_type = 'downvote') as downvotes,
      COUNT(*) FILTER (WHERE vote_type = 'upvote' AND voted_at > NOW() - INTERVAL '7 days') as recent_upvotes
    FROM votes
    GROUP BY idea_id
  )
  SELECT i.*
  FROM ideas i
  LEFT JOIN vote_counts vc ON i.id = vc.idea_id
  WHERE 
    CASE 
      WHEN p_sort_type = 'my_ideas' AND p_user_id IS NOT NULL THEN 
        i.user_id = p_user_id
      WHEN p_sort_type = 'my_ideas' AND p_user_id IS NULL THEN
        FALSE  -- Return no results if no user_id provided for my_ideas
      ELSE 
        -- For non-my_ideas queries, only show public ideas or private ideas owned by the user
        (NOT i.is_private OR (i.is_private AND i.user_id = auth.uid()))
    END
  ORDER BY
    CASE p_sort_type
      WHEN 'trending' THEN 
        COALESCE(vc.recent_upvotes, 0) + (i.views * 0.3)
      WHEN 'top' THEN 
        COALESCE(vc.upvotes, 0) - COALESCE(vc.downvotes, 0)
      ELSE 0
    END DESC NULLS LAST,
    CASE 
      WHEN p_sort_type IN ('all', 'my_ideas') THEN i.created_at
      ELSE NULL
    END DESC NULLS LAST,
    i.created_at DESC
  LIMIT p_limit
  OFFSET p_page * p_limit;
END;
$$;

-- Grant execute permission to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION get_filtered_ideas TO authenticated, anon; 