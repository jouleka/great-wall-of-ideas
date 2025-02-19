-- Create comment_likes table
CREATE TABLE comment_likes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  UNIQUE(comment_id, user_id) -- Ensure one like per user per comment
);

CREATE INDEX idx_comment_likes_comment_id ON comment_likes(comment_id);
CREATE INDEX idx_comment_likes_user_id ON comment_likes(user_id);

ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Comment likes are viewable by everyone" ON comment_likes;
DROP POLICY IF EXISTS "Users can insert their own likes" ON comment_likes;
DROP POLICY IF EXISTS "Users can delete their own likes" ON comment_likes;
DROP POLICY IF EXISTS "Users can update their own likes" ON comment_likes;

CREATE POLICY "Comment likes are viewable by everyone"
  ON comment_likes FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own likes"
  ON comment_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own likes"
  ON comment_likes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes"
  ON comment_likes FOR DELETE
  USING (auth.uid() = user_id);

DO $$
BEGIN
  IF NOT EXISTS (
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'comment_likes' 
    AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'RLS is not enabled on comment_likes table';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'comment_likes' 
    AND policyname IN (
      'Comment likes are viewable by everyone',
      'Users can insert their own likes',
      'Users can update their own likes',
      'Users can delete their own likes'
    )
  ) THEN
    RAISE EXCEPTION 'Not all required policies are present on comment_likes table';
  END IF;
END $$; 