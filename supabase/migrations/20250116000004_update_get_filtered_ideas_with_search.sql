DROP FUNCTION IF EXISTS get_filtered_ideas;

-- Create improved function with search and category filtering
CREATE OR REPLACE FUNCTION get_filtered_ideas(
  p_page integer,
  p_limit integer,
  p_sort_type text,
  p_user_id uuid DEFAULT NULL,
  p_category_id uuid DEFAULT NULL,
  p_subcategory_id uuid DEFAULT NULL,
  p_search_term text DEFAULT NULL
)
RETURNS SETOF ideas
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RAISE NOTICE 'get_filtered_ideas called with: page=%, limit=%, sort_type=%, user_id=%, category_id=%, subcategory_id=%, search_term=%', 
    p_page, p_limit, p_sort_type, p_user_id, p_category_id, p_subcategory_id, p_search_term;

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
    AND (p_category_id IS NULL OR i.category_id = p_category_id)
    AND (p_subcategory_id IS NULL OR i.subcategory_id = p_subcategory_id)
    AND (
      p_search_term IS NULL 
      OR i.title ILIKE '%' || p_search_term || '%'
      OR i.description ILIKE '%' || p_search_term || '%'
      OR i.target_audience ILIKE '%' || p_search_term || '%'
    )
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

DROP INDEX IF EXISTS idx_ideas_category;
DROP INDEX IF EXISTS idx_ideas_subcategory;
DROP INDEX IF EXISTS idx_ideas_search;

CREATE INDEX idx_ideas_category ON ideas (category_id);
CREATE INDEX idx_ideas_subcategory ON ideas (subcategory_id);
CREATE INDEX idx_ideas_search ON ideas USING gin (
  to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(target_audience, ''))
); 