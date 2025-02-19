-- Add remixed_from_id to ideas table
ALTER TABLE ideas
ADD COLUMN remixed_from_id UUID REFERENCES ideas(id) ON DELETE SET NULL;

-- Create idea_remixes table
CREATE TABLE idea_remixes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    original_idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
    remixed_idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    UNIQUE(original_idea_id, remixed_idea_id)
);

ALTER TABLE idea_remixes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view idea remixes"
    ON idea_remixes FOR SELECT
    USING (true);

CREATE POLICY "Users can create remixes"
    ON idea_remixes FOR INSERT
    WITH CHECK (auth.uid() = created_by);

CREATE OR REPLACE FUNCTION remix_idea(
    p_original_idea_id UUID,
    p_title TEXT,
    p_description TEXT,
    p_target_audience TEXT,
    p_category_id UUID,
    p_subcategory_id UUID DEFAULT NULL,
    p_tags TEXT[] DEFAULT '{}'::TEXT[]
)
RETURNS ideas
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_author_profile RECORD;
    v_remixed_idea ideas;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT username, full_name INTO v_author_profile
    FROM public.profiles
    WHERE id = v_user_id;

    INSERT INTO ideas (
        user_id,
        title,
        description,
        author_name,
        target_audience,
        category_id,
        subcategory_id,
        tags,
        is_private,
        remixed_from_id,
        status
    )
    VALUES (
        v_user_id,
        p_title,
        p_description,
        COALESCE(v_author_profile.username, v_author_profile.full_name, 'Anonymous'),
        p_target_audience,
        p_category_id,
        p_subcategory_id,
        p_tags,
        true, -- Remixed ideas are private by default
        p_original_idea_id,
        'draft'
    )
    RETURNING * INTO v_remixed_idea;

    INSERT INTO idea_remixes (
        original_idea_id,
        remixed_idea_id,
        created_by
    )
    VALUES (
        p_original_idea_id,
        v_remixed_idea.id,
        v_user_id
    );

    RETURN v_remixed_idea;
END;
$$;

CREATE OR REPLACE FUNCTION get_idea_remix_history(p_idea_id UUID)
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
SET search_path = public
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
            FROM ideas i
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
            FROM ideas i
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
        FROM ideas i
        INNER JOIN full_tree ft ON i.remixed_from_id = ft.id
    )
    SELECT 
        ft.id,
        CASE 
            WHEN ft.is_private AND ft.user_id != auth.uid() THEN 'Private Idea'
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

GRANT EXECUTE ON FUNCTION get_idea_remix_history(UUID) TO authenticated, anon; 