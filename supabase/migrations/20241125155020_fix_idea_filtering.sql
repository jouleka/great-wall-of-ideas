DROP FUNCTION IF EXISTS get_filtered_ideas;

CREATE OR REPLACE FUNCTION get_filtered_ideas(
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
  RETURN QUERY
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
        FALSE
      ELSE 
        TRUE 
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

GRANT EXECUTE ON FUNCTION get_filtered_ideas TO authenticated, anon;

DROP INDEX IF EXISTS idx_ideas_votes_created;
DROP INDEX IF EXISTS idx_ideas_views_created;
DROP INDEX IF EXISTS idx_votes_recent;
DROP INDEX IF EXISTS idx_ideas_user_created;

CREATE INDEX idx_ideas_votes_created ON ideas (upvotes DESC, created_at DESC);
CREATE INDEX idx_ideas_views_created ON ideas (views DESC, created_at DESC);
CREATE INDEX idx_votes_recent ON votes (idea_id, vote_type, voted_at);
CREATE INDEX idx_ideas_user_created ON ideas (user_id, created_at DESC);

COMMENT ON FUNCTION get_filtered_ideas IS 
'Retrieves filtered and properly ordered ideas based on sort type:
- all: ordered by creation date
- trending: ordered by recent activity (views and votes in last 7 days)
- top: ordered by vote score (upvotes - downvotes)
- my_ideas: user''s ideas ordered by creation date';