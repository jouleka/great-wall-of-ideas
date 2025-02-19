CREATE TABLE IF NOT EXISTS ideas (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  target_audience TEXT NOT NULL,
  category TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  author_name TEXT NOT NULL,
  is_anonymous BOOLEAN DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  upvotes INT DEFAULT 0,
  downvotes INT DEFAULT 0,
  views INT DEFAULT 0,
  tags TEXT[],
  status TEXT DEFAULT 'pending',
  is_featured BOOLEAN DEFAULT false
);

ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ideas are viewable by everyone."
  ON ideas FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own ideas."
  ON ideas FOR INSERT
  WITH CHECK (auth.uid() = user_id OR is_anonymous = true);

CREATE POLICY "Users can update their own ideas."
  ON ideas FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ideas."
  ON ideas FOR DELETE
  USING (auth.uid() = user_id);