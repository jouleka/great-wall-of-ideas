-- Add 'remix' to notification_type enum if it doesn't exist
DO $$ BEGIN
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'remix';
END $$;

ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS actor_id UUID REFERENCES auth.users(id);

CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type notification_type,
  p_title TEXT,
  p_message TEXT,
  p_link TEXT DEFAULT NULL,
  p_idea_id UUID DEFAULT NULL,
  p_comment_id UUID DEFAULT NULL,
  p_actor_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    link,
    idea_id,
    comment_id,
    actor_id
  )
  VALUES (
    p_user_id,
    p_type,
    COALESCE(p_title, 'New Notification'),  -- Ensure title is never null
    p_message,
    p_link,
    p_idea_id,
    p_comment_id,
    p_actor_id
  )
  RETURNING id INTO notification_id;

  RETURN notification_id;
END;
$$;

CREATE OR REPLACE FUNCTION remix_idea(
    p_original_idea_id UUID,
    p_user_id UUID,
    p_title TEXT,
    p_description TEXT,
    p_target_audience TEXT,
    p_category_id UUID,
    p_subcategory_id UUID DEFAULT NULL,
    p_tags TEXT[] DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_remixed_idea_id UUID;
    v_original_author_id UUID;
    v_original_title TEXT;
    v_remixer_name TEXT;
    v_notification_title TEXT;
    v_notification_message TEXT;
BEGIN
    SELECT user_id, title INTO v_original_author_id, v_original_title
    FROM ideas
    WHERE id = p_original_idea_id;

    BEGIN
        SELECT COALESCE(username, 'Someone')
        INTO v_remixer_name
        FROM profiles
        WHERE id = p_user_id;
    EXCEPTION WHEN OTHERS THEN
        v_remixer_name := 'Someone';
    END;

    v_notification_title := format('%s remixed your idea', COALESCE(v_remixer_name, 'Someone'));
    v_notification_message := format('Your idea "%s" was remixed', COALESCE(v_original_title, 'Untitled'));

    INSERT INTO ideas (
        title,
        description,
        target_audience,
        category_id,
        subcategory_id,
        tags,
        user_id,
        remixed_from_id,
        is_private
    )
    VALUES (
        p_title,
        p_description,
        p_target_audience,
        p_category_id,
        p_subcategory_id,
        p_tags,
        p_user_id,
        p_original_idea_id,
        true  -- Remixed ideas are private by default
    )
    RETURNING id INTO v_remixed_idea_id;

    INSERT INTO idea_remixes (
        original_idea_id,
        remixed_idea_id,
        created_by
    )
    VALUES (
        p_original_idea_id,
        v_remixed_idea_id,
        p_user_id
    );

    IF v_original_author_id != p_user_id THEN
        PERFORM create_notification(
            v_original_author_id,
            'remix',
            v_notification_title,  -- Using prepared title
            v_notification_message,  -- Using prepared message
            format('/ideas?id=%s', v_remixed_idea_id),
            p_original_idea_id,
            NULL,
            p_user_id
        );
    END IF;

    RETURN v_remixed_idea_id;
END;
$$; 