-- Bind privileged idea RPC access to the verified caller, preserving signatures and ACLs.
-- CREATE OR REPLACE retains existing ownership and execute grants.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_filtered_ideas(
  p_page INTEGER DEFAULT 0,
  p_limit INTEGER DEFAULT 10,
  p_sort_type TEXT DEFAULT 'all',
  p_user_id UUID DEFAULT NULL,
  p_category_id UUID DEFAULT NULL,
  p_subcategory_id UUID DEFAULT NULL,
  p_search_term TEXT DEFAULT NULL,
  p_status public.idea_status DEFAULT NULL
)
RETURNS SETOF public.ideas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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
          i.user_id = p_user_id AND p_user_id = auth.uid()
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

CREATE OR REPLACE FUNCTION public.get_idea_remix_history(p_idea_id UUID)
RETURNS TABLE (
    id UUID,
    title TEXT,
    author_name TEXT,
    created_at TIMESTAMPTZ,
    is_original BOOLEAN,
    remix_level INTEGER,
    is_private BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE full_tree AS (
        -- First find the original idea by following remixed_from_id up
        WITH RECURSIVE original_path AS (
            -- Start from the current idea
            SELECT 
                i.id,
                i.title,
                i.author_name,
                i.created_at,
                i.remixed_from_id,
                i.is_private,
                i.user_id,
                0 as up_level
            FROM public.ideas i
            WHERE i.id = p_idea_id

            UNION ALL

            -- Recursively get parent ideas
            SELECT 
                i.id,
                i.title,
                i.author_name,
                i.created_at,
                i.remixed_from_id,
                i.is_private,
                i.user_id,
                op.up_level + 1
            FROM public.ideas i
            INNER JOIN original_path op ON i.id = op.remixed_from_id
        )
        -- Get the original idea (highest up_level)
        SELECT 
            op.id,
            op.title,
            op.author_name,
            op.created_at,
            true as is_original,
            0 as level,
            op.is_private,
            op.user_id
        FROM original_path op
        WHERE op.remixed_from_id IS NULL

        UNION ALL

        -- Then find all remixes by following remixed_from_id down
        SELECT 
            i.id,
            i.title,
            i.author_name,
            i.created_at,
            false as is_original,
            ft.level + 1,
            i.is_private,
            i.user_id
        FROM public.ideas i
        INNER JOIN full_tree ft ON i.remixed_from_id = ft.id
    )
    SELECT 
        ft.id,
        CASE 
            WHEN ft.is_private AND (auth.uid() IS NULL OR ft.user_id IS DISTINCT FROM auth.uid()) THEN 'Private Idea'
            ELSE ft.title
        END as title,
        ft.author_name,
        ft.created_at,
        ft.is_original,
        ft.level as remix_level,
        ft.is_private
    FROM full_tree ft
    ORDER BY ft.level, ft.created_at;
END;
$$;

-- Preserve the intended status RPC contract without replaying duplicated historical declarations.
CREATE OR REPLACE FUNCTION public.update_idea_status(
  p_idea_id UUID,
  p_status public.idea_status,
  p_user_id UUID
)
RETURNS public.ideas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_idea public.ideas;
  v_user_name TEXT;
BEGIN
  SELECT * INTO v_idea
  FROM public.ideas
  WHERE id = p_idea_id
  FOR UPDATE;

  IF v_idea IS NULL THEN
    RAISE EXCEPTION 'Idea not found';
  END IF;

  -- Caller-supplied IDs cannot confer the function owner's authority.
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid()
     OR v_idea.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized to update idea status';
  END IF;

  SELECT COALESCE(username, full_name, 'Someone') INTO v_user_name
  FROM public.profiles
  WHERE id = p_user_id;

  UPDATE public.ideas
  SET 
    status = p_status,
    status_updated_at = now(),
    status_updated_by = p_user_id,
    updated_at = now()
  WHERE id = p_idea_id
  RETURNING * INTO v_idea;

  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    idea_id,
    link
  )
  VALUES (
    v_idea.user_id,
    'status_change'::public.notification_type,
    'Idea Status Updated',
    format('Your idea "%s" status has been updated to %s', v_idea.title, p_status),
    v_idea.id,
    format('/ideas?id=%s', v_idea.id)
  );

  RETURN v_idea;
END;
$$;

COMMIT;
