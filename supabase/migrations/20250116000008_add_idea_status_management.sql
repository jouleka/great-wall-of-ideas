-- Create enum type for idea statuses
CREATE TYPE public.idea_status AS ENUM (
  'draft',
  'in_review',
  'in_progress',
  'completed',
  'cancelled',
  'on_hold'
);

-- Create audit_logs table first
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.ideas 
  ADD COLUMN new_status idea_status;

ALTER TABLE public.ideas 
  ADD COLUMN status_updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ADD COLUMN status_updated_by UUID REFERENCES auth.users(id);

UPDATE public.ideas
SET new_status = CASE 
  WHEN status = 'pending' THEN 'in_review'::idea_status
  WHEN status = 'approved' THEN 'in_progress'::idea_status
  WHEN status = 'rejected' THEN 'cancelled'::idea_status
  WHEN status = 'implemented' THEN 'completed'::idea_status
  ELSE 'draft'::idea_status
END;

ALTER TABLE public.ideas DROP COLUMN status;

ALTER TABLE public.ideas ALTER COLUMN new_status SET NOT NULL;

ALTER TABLE public.ideas ALTER COLUMN new_status SET DEFAULT 'in_review'::idea_status;

ALTER TABLE public.ideas RENAME COLUMN new_status TO status;

CREATE OR REPLACE FUNCTION public.update_idea_status(
CREATE OR REPLACE FUNCTION public.update_idea_status(
  p_idea_id UUID,
  p_status idea_status,
  p_user_id UUID
)
RETURNS public.ideas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_idea public.ideas;
  v_user_name TEXT;
BEGIN
  SELECT * INTO v_idea
  FROM public.ideas
  WHERE id = p_idea_id;

  IF v_idea IS NULL THEN
    RAISE EXCEPTION 'Idea not found';
  END IF;

  -- Only allow status updates by:
  -- 1. The idea owner
  -- 2. Admins/Moderators
  IF v_idea.user_id != p_user_id THEN
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
    'status_change'::notification_type,
    'Idea Status Updated',
    format('Your idea "%s" status has been updated to %s', v_idea.title, p_status),
    v_idea.id,
    format('/ideas?id=%s', v_idea.id)
  );

  RETURN v_idea;
END;
$$;

CREATE POLICY "Enable status updates for idea owners"
  ON public.ideas
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.handle_status_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF OLD.status != NEW.status THEN
    INSERT INTO public.audit_logs (
      table_name,
      record_id,
      user_id,
      action,
      old_data,
      new_data
    ) VALUES (
      'ideas',
      NEW.id,
      auth.uid(),
      'status_update',
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_status_update
  BEFORE UPDATE OF status
  ON public.ideas
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_status_update();

CREATE INDEX IF NOT EXISTS ideas_status_idx ON public.ideas (status);
CREATE INDEX IF NOT EXISTS ideas_status_updated_at_idx ON public.ideas (status_updated_at);

DROP FUNCTION IF EXISTS public.get_filtered_ideas(integer, integer, text, uuid, uuid, uuid, text);
DROP FUNCTION IF EXISTS public.get_filtered_ideas(integer, integer, text, uuid, uuid, uuid, text, idea_status);

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
      (p_user_id IS NULL OR i.user_id = p_user_id) AND
      (p_category_id IS NULL OR i.category_id = p_category_id) AND
      (p_subcategory_id IS NULL OR i.subcategory_id = p_subcategory_id) AND
      (p_status IS NULL OR i.status = p_status) AND
      (
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