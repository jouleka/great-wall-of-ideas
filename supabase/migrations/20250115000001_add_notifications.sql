-- Create an enum for notification types
CREATE TYPE notification_type AS ENUM (
  'new_comment',
  'comment_reply',
  'idea_vote',
  'idea_report',
  'comment_report',
  'status_change',
  'idea_featured'
);

CREATE TABLE notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  idea_id UUID REFERENCES ideas(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  read_at TIMESTAMP WITH TIME ZONE,
  email_sent BOOLEAN DEFAULT false
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_read_at ON notifications(read_at);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications."
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications."
  ON notifications FOR INSERT
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type notification_type,
  p_title TEXT,
  p_message TEXT,
  p_link TEXT DEFAULT NULL,
  p_idea_id UUID DEFAULT NULL,
  p_comment_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    link,
    idea_id,
    comment_id
  )
  VALUES (
    p_user_id,
    p_type,
    p_title,
    p_message,
    p_link,
    p_idea_id,
    p_comment_id
  )
  RETURNING id INTO notification_id;

  RETURN notification_id;
END;
$$;

CREATE OR REPLACE FUNCTION handle_new_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  idea_author_id UUID;
  parent_comment_author_id UUID;
  idea_title TEXT;
BEGIN
  SELECT user_id, title INTO idea_author_id, idea_title
  FROM ideas
  WHERE id = NEW.idea_id;

  IF NEW.parent_id IS NOT NULL THEN
    SELECT user_id INTO parent_comment_author_id
    FROM comments
    WHERE id = NEW.parent_id;

    IF parent_comment_author_id != NEW.user_id THEN
      PERFORM create_notification(
        parent_comment_author_id,
        'comment_reply',
        'New reply to your comment',
        format('%s replied to your comment on "%s"', NEW.author_name, idea_title),
        format('/ideas?id=%s', NEW.idea_id),
        NEW.idea_id,
        NEW.id
      );
    END IF;
  ELSE
    IF idea_author_id != NEW.user_id THEN
      PERFORM create_notification(
        idea_author_id,
        'new_comment',
        'New comment on your idea',
        format('%s commented on your idea "%s"', NEW.author_name, idea_title),
        format('/ideas?id=%s', NEW.idea_id),
        NEW.idea_id,
        NEW.id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_comment
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_comment();

DROP TRIGGER IF EXISTS on_vote ON votes;

CREATE OR REPLACE FUNCTION handle_vote()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  idea_author_id UUID;
  idea_title TEXT;
  vote_count INT;
  voter_name TEXT;
BEGIN
  SELECT user_id, title INTO idea_author_id, idea_title
  FROM ideas
  WHERE id = NEW.idea_id;

  SELECT COALESCE(username, full_name, 'Someone') INTO voter_name
  FROM profiles
  WHERE id = NEW.user_id;

  IF idea_author_id != NEW.user_id THEN
    SELECT COUNT(*) INTO vote_count
    FROM votes
    WHERE idea_id = NEW.idea_id 
    AND vote_type = NEW.vote_type 
    AND (
      id = NEW.id 
      OR voted_at < NEW.voted_at
    );

    -- Always notify on first vote
    IF vote_count = 1 THEN
      PERFORM create_notification(
        idea_author_id,
        'idea_vote',
        format('First %s on your idea!', NEW.vote_type),
        format('%s %s your idea "%s"', voter_name, NEW.vote_type || 'd', idea_title),
        format('/ideas?id=%s', NEW.idea_id),
        NEW.idea_id
      );
    -- Notify on milestone votes
    ELSIF vote_count IN (5, 10, 25, 50, 100) THEN
      PERFORM create_notification(
        idea_author_id,
        'idea_vote',
        format('Your idea reached %s %s!', vote_count, NEW.vote_type || 's'),
        format('Your idea "%s" has received %s %s', idea_title, vote_count, NEW.vote_type || 's'),
        format('/ideas?id=%s', NEW.idea_id),
        NEW.idea_id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_vote
  AFTER INSERT ON votes
  FOR EACH ROW
  EXECUTE FUNCTION handle_vote();

CREATE OR REPLACE FUNCTION handle_report()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_ids UUID[];
  admin_id UUID;
BEGIN
  SELECT ARRAY_AGG(id) INTO admin_ids
  FROM auth.users
  WHERE raw_user_meta_data->>'role' = 'admin';

  -- Notify all admins
  FOREACH admin_id IN ARRAY admin_ids
  LOOP
    PERFORM create_notification(
      admin_id,
      CASE
        WHEN NEW.comment_id IS NOT NULL THEN 'comment_report'
        ELSE 'idea_report'
      END,
      'New content report',
      CASE
        WHEN NEW.comment_id IS NOT NULL THEN 'A comment has been reported'
        ELSE 'An idea has been reported'
      END,
      CASE
        WHEN NEW.comment_id IS NOT NULL THEN format('/ideas?id=%s', (SELECT idea_id FROM comments WHERE id = NEW.comment_id))
        ELSE format('/ideas?id=%s', NEW.idea_id)
      END,
      NEW.idea_id,
      NEW.comment_id
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_report
  AFTER INSERT ON reports
  FOR EACH ROW
  EXECUTE FUNCTION handle_report();

ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

CREATE OR REPLACE FUNCTION mark_notifications_as_read(p_notification_ids UUID[])
RETURNS SETOF UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE notifications
  SET read_at = NOW()
  WHERE id = ANY(p_notification_ids)
    AND user_id = auth.uid()
    AND read_at IS NULL
  RETURNING id;
END;
$$;

CREATE OR REPLACE FUNCTION mark_all_notifications_as_read()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE notifications
  SET read_at = NOW()
  WHERE user_id = auth.uid()
  AND read_at IS NULL;
END;
$$; 