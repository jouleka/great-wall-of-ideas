-- Create categories enum for predefined categories
CREATE TYPE category_type AS ENUM (
  'technology', 'business', 'creative', 'social_impact',
  'education', 'health', 'entertainment', 'other'
);

CREATE TABLE categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  type category_type NOT NULL,
  is_custom BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  parent_id UUID REFERENCES categories(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  idea_count INT DEFAULT 0
);

CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_type ON categories(type);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categories are viewable by everyone"
  ON categories FOR SELECT
  USING (true);

CREATE POLICY "Only authenticated users can create custom categories"
  ON categories FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND is_custom = true);

CREATE POLICY "Users can update their own custom categories"
  ON categories FOR UPDATE
  USING (auth.uid() = created_by AND is_custom = true);

CREATE OR REPLACE FUNCTION update_category_idea_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE categories 
    SET idea_count = idea_count + 1
    WHERE id = NEW.category_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE categories 
    SET idea_count = idea_count - 1
    WHERE id = OLD.category_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_category_count
  AFTER INSERT OR DELETE ON ideas
  FOR EACH ROW
  EXECUTE FUNCTION update_category_idea_count();

ALTER TABLE ideas 
ADD COLUMN category_id UUID REFERENCES categories(id),
ADD COLUMN subcategory_id UUID REFERENCES categories(id); 