-- Add missing indexes to match development
CREATE INDEX IF NOT EXISTS ideas_votes_created_idx ON ideas (upvotes DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ideas_views ON ideas (views DESC);
CREATE INDEX IF NOT EXISTS idx_ideas_votes ON ideas ((upvotes + downvotes) DESC); 