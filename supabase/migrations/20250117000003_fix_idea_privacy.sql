DROP FUNCTION IF EXISTS public.get_filtered_ideas(integer, integer, text, uuid, uuid, uuid, text, idea_status);

-- Create new get_filtered_ideas function with proper privacy handling
CREATE OR REPLACE FUNCTION public.get_filtered_ideas(
  p_page INTEGER DEFAULT 0,
  p_limit INTEGER DEFAULT 10,
  p_sort_type TEXT DEFAULT 'all',
  p_user_id UUID DEFAULT NULL,
  p_category_id UUID DEFAULT NULL,
  p_subcategory_id UUID DEFAULT NULL,
  p_search_term TEXT DEFAULT NULL,
  p_status idea_status DEFAULT NULL
)
RETURNS SETOF public.ideas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH filtered_ideas AS (
    SELECT i.*
    FROM public.ideas i
    WHERE
      -- Privacy handling: Only show ideas that are either:
      -- 1. Public ideas
      -- 2. Private ideas owned by the current user
      -- 3. All ideas owned by the user in 'my_ideas' view
      CASE 
        WHEN p_sort_type = 'my_ideas' AND p_user_id IS NOT NULL THEN 
          i.user_id = p_user_id
        WHEN p_sort_type = 'my_ideas' AND p_user_id IS NULL THEN
          FALSE  -- Return no results if no user_id provided for my_ideas
        ELSE 
          -- For non-my_ideas queries, only show public ideas or private ideas owned by the user
          (NOT i.is_private OR (i.is_private AND i.user_id = auth.uid()))
      END
      -- Additional filters
      AND (p_category_id IS NULL OR i.category_id = p_category_id)
      AND (p_subcategory_id IS NULL OR i.subcategory_id = p_subcategory_id)
      AND (p_status IS NULL OR i.status = p_status)
      AND (
        p_search_term IS NULL OR
        i.title ILIKE '%' || p_search_term || '%' OR
        i.description ILIKE '%' || p_search_term || '%' OR
        i.target_audience ILIKE '%' || p_search_term || '%'
      )
  )
  SELECT *
  FROM filtered_ideas
  ORDER BY
    CASE p_sort_type 
      WHEN 'trending' THEN engagement_score 
      WHEN 'top' THEN (upvotes - downvotes)
      ELSE 0
    END DESC NULLS LAST,
    created_at DESC
  OFFSET p_page * p_limit
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION get_filtered_ideas TO authenticated, anon; 