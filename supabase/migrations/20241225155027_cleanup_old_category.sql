DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM ideas WHERE category_id IS NULL) THEN
  IF EXISTS (SELECT 1 FROM ideas WHERE category_id IS NULL) THEN
    RAISE EXCEPTION 'Migration incomplete: Some ideas have null category_id';
  END IF;
END $$;

ALTER TABLE ideas DROP COLUMN IF EXISTS category;

CREATE INDEX IF NOT EXISTS idx_ideas_category_id ON ideas(category_id);

CREATE INDEX IF NOT EXISTS idx_ideas_subcategory_id ON ideas(subcategory_id); 
CREATE INDEX IF NOT EXISTS idx_ideas_subcategory_id ON ideas(subcategory_id); 