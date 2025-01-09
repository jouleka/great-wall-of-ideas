-- Add is_private column to ideas table
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;

-- Create index for is_private column
CREATE INDEX IF NOT EXISTS idx_ideas_is_private ON ideas(is_private);

-- Drop existing select policy
DROP POLICY IF EXISTS "Ideas are viewable by everyone." ON ideas;

-- Create new select policy that handles private ideas
CREATE POLICY "Ideas are viewable by everyone except private ones"
  ON ideas FOR SELECT
  USING (
    CASE 
      WHEN is_private = true THEN auth.uid() = user_id
      ELSE true
    END
  );

-- Update insert policy to allow private ideas
DROP POLICY IF EXISTS "Users can insert their own ideas." ON ideas;
CREATE POLICY "Users can insert their own ideas."
  ON ideas FOR INSERT
  WITH CHECK (auth.uid() = user_id OR is_anonymous = true);

-- Update existing ideas to have is_private = false
UPDATE ideas SET is_private = false WHERE is_private IS NULL;

-- Add NOT NULL constraint after setting default values
ALTER TABLE ideas ALTER COLUMN is_private SET NOT NULL; 