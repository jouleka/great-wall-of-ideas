-- Verify that all ideas have been migrated to the new category system
DO $$ 
BEGIN
  -- Check if any ideas have null category_id
  IF EXISTS (SELECT 1 FROM ideas WHERE category_id IS NULL) THEN
    RAISE EXCEPTION 'Migration incomplete: Some ideas have null category_id';
  END IF;
END $$;

-- Remove the old category column
ALTER TABLE ideas DROP COLUMN IF EXISTS category;

-- Create an index on category_id for better performance
CREATE INDEX IF NOT EXISTS idx_ideas_category_id ON ideas(category_id);

-- Create an index on subcategory_id for better performance
CREATE INDEX IF NOT EXISTS idx_ideas_subcategory_id ON ideas(subcategory_id); 