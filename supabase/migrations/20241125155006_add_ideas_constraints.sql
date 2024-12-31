-- First, truncate long fields to meet the constraints
UPDATE ideas
SET description = LEFT(description, 2000)
WHERE char_length(description) > 2000;

UPDATE ideas
SET title = LEFT(title, 100)
WHERE char_length(title) > 100;

UPDATE ideas
SET category = LEFT(category, 30)
WHERE char_length(category) > 30;

UPDATE ideas
SET target_audience = LEFT(target_audience, 50)
WHERE char_length(target_audience) > 50;

UPDATE ideas
SET author_name = LEFT(author_name, 50)
WHERE char_length(author_name) > 50;

-- Update tags to meet new constraints
UPDATE ideas
SET tags = CASE 
    WHEN tags IS NULL THEN ARRAY['general']
    WHEN array_length(tags, 1) > 8 THEN (SELECT array_agg(tag) FROM (
        SELECT unnest(tags) as tag LIMIT 8
    ) t)
    ELSE tags
END;

-- Now add the constraints
ALTER TABLE ideas
ADD CONSTRAINT title_length CHECK (char_length(title) <= 100),
ADD CONSTRAINT description_length CHECK (char_length(description) <= 2000),
ADD CONSTRAINT category_length CHECK (char_length(category) <= 30),
ADD CONSTRAINT target_audience_length CHECK (char_length(target_audience) <= 50),
ADD CONSTRAINT author_name_length CHECK (char_length(author_name) <= 50);

-- Add array constraints for tags
ALTER TABLE ideas
ADD CONSTRAINT tags_length CHECK (array_length(tags, 1) <= 8),
ADD CONSTRAINT tags_not_empty CHECK (
    tags IS NOT NULL AND 
    array_length(tags, 1) >= 1
);

-- Add status constraint
UPDATE ideas
SET status = 'pending'
WHERE status NOT IN ('pending', 'approved', 'rejected');

ALTER TABLE ideas
ADD CONSTRAINT status_values CHECK (status IN ('pending', 'approved', 'rejected'));

-- Add constraint to ensure individual tag lengths and minimum length
CREATE OR REPLACE FUNCTION check_tag_lengths(tags text[])
RETURNS boolean AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1
    FROM unnest(tags) tag
    WHERE length(tag) > 15 OR length(tag) < 2
  );
END;
$$ LANGUAGE plpgsql;

-- Update any tags that are too long
UPDATE ideas
SET tags = (
    SELECT array_agg(
        CASE 
            WHEN length(tag) > 15 THEN LEFT(tag, 15)
            WHEN length(tag) < 2 THEN 'general'
            ELSE tag
        END
    )
    FROM unnest(tags) tag
)
WHERE EXISTS (
    SELECT 1
    FROM unnest(tags) tag
    WHERE length(tag) > 15 OR length(tag) < 2
);

ALTER TABLE ideas
ADD CONSTRAINT tags_individual_length 
CHECK (check_tag_lengths(tags));