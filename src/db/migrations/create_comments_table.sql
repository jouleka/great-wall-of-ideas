-- Create the comments table
CREATE TABLE comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  idea_id UUID REFERENCES ideas(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Enable Row Level Security
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Create policies for the comments table
CREATE POLICY "Comments are viewable by everyone."
  ON comments FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own comments."
  ON comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments."
  ON comments FOR UPDATE
  USING (auth.uid() = user_id);

-- Add a policy for deleting comments
CREATE POLICY "Users can delete their own comments."
  ON comments FOR DELETE
  USING (auth.uid() = user_id);