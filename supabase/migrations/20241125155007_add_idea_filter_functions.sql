-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_trending_ideas(integer, integer);
DROP FUNCTION IF EXISTS get_top_rated_ideas(integer, integer);

-- Function to get trending ideas (based on views in last 7 days)
CREATE OR REPLACE FUNCTION get_trending_ideas(
  p_limit integer,
  p_offset integer
) RETURNS SETOF ideas 
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM ideas
  WHERE created_at >= NOW() - INTERVAL '30 days'
  ORDER BY 
    views DESC,
    created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Function to get top rated ideas
CREATE OR REPLACE FUNCTION get_top_rated_ideas(
  p_limit integer,
  p_offset integer
) RETURNS SETOF ideas 
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM ideas
  ORDER BY 
    CASE 
      WHEN upvotes + downvotes = 0 THEN 0
      ELSE CAST(upvotes AS FLOAT) / NULLIF(upvotes + downvotes, 0)
    END DESC,
    upvotes DESC,
    created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_trending_ideas(integer, integer) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_top_rated_ideas(integer, integer) TO authenticated, anon;

-- Create indexes to optimize queries
CREATE INDEX IF NOT EXISTS idx_ideas_views_created_at 
ON ideas (views DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ideas_votes_created_at 
ON ideas (upvotes DESC, downvotes, created_at DESC);

-- Add index for votes timestamp to improve trending calculation
CREATE INDEX IF NOT EXISTS idx_votes_voted_at 
ON votes (voted_at DESC); 