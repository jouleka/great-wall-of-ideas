-- Update the existing ideas table
ALTER TABLE ideas
DROP COLUMN votes,
ADD COLUMN author_name TEXT,
ADD COLUMN is_anonymous BOOLEAN DEFAULT false,
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
ADD COLUMN upvotes INT DEFAULT 0,
ADD COLUMN downvotes INT DEFAULT 0,
ADD COLUMN views INT DEFAULT 0,
ADD COLUMN tags TEXT[],
ADD COLUMN status TEXT DEFAULT 'pending',
ADD COLUMN is_featured BOOLEAN DEFAULT false;

-- Change the primary key to UUID
ALTER TABLE ideas
ADD COLUMN new_id UUID DEFAULT uuid_generate_v4();

UPDATE ideas SET new_id = uuid_generate_v4();

ALTER TABLE ideas DROP CONSTRAINT ideas_pkey;
ALTER TABLE ideas DROP COLUMN id;
ALTER TABLE ideas RENAME COLUMN new_id TO id;
ALTER TABLE ideas ADD PRIMARY KEY (id);

-- Ensure RLS is enabled
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;

-- Update policies for the ideas table
DROP POLICY IF EXISTS "Ideas are viewable by everyone." ON ideas;
DROP POLICY IF EXISTS "Users can insert their own ideas." ON ideas;
DROP POLICY IF EXISTS "Users can update votes on ideas." ON ideas;

CREATE POLICY "Ideas are viewable by everyone."
  ON ideas FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own ideas."
  ON ideas FOR INSERT
  WITH CHECK (auth.uid() = user_id OR is_anonymous = true);

CREATE POLICY "Users can update their own ideas."
  ON ideas FOR UPDATE
  USING (auth.uid() = user_id);

-- Add a policy for deleting ideas
CREATE POLICY "Users can delete their own ideas."
  ON ideas FOR DELETE
  USING (auth.uid() = user_id);