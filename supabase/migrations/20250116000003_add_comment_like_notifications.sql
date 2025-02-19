-- Add comment_like to notification_type enum if it doesn't exist
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
        CREATE TYPE notification_type AS ENUM (
            'new_comment',
            'comment_reply',
            'idea_vote',
            'idea_report',
            'comment_report',
            'status_change',
            'idea_featured',
            'comment_like'
        );
    ELSE
        ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'comment_like';
    END IF;
END $$;

CREATE OR REPLACE FUNCTION strip_html_tags(text)
RETURNS text AS $$
BEGIN
    -- Replace common HTML tags and entities
    RETURN regexp_replace(
        regexp_replace(
            regexp_replace($1, 
                E'<[^>]+>', '', 'g'
            ),
            E'&nbsp;', ' ', 'g'
        ),
        E'\\s+', ' ', 'g'
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

create or replace function handle_comment_like_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_comment_author_id uuid;
  v_comment_content text;
  v_idea_id uuid;
  v_liker_name text;
begin
  select user_id, content, idea_id
  into v_comment_author_id, v_comment_content, v_idea_id
  from comments
  where id = new.comment_id;

  if v_comment_author_id = new.user_id then
    return new;
  end if;

  select coalesce(username, 'Someone')
  into v_liker_name
  from profiles
  where id = new.user_id;

  -- Create notification with stripped HTML content
  insert into notifications (
    user_id,
    type,
    title,
    message,
    link,
    idea_id,
    comment_id,
    email_sent
  ) values (
    v_comment_author_id,
    'comment_like',
    v_liker_name || ' liked your comment',
    substring(strip_html_tags(v_comment_content) from 1 for 100) || case when length(strip_html_tags(v_comment_content)) > 100 then '...' else '' end,
    '/ideas?id=' || v_idea_id,
    v_idea_id,
    new.comment_id,
    false
  );

  return new;
end;
$$;

create trigger on_comment_like_added
  after insert on comment_likes
  for each row
  execute function handle_comment_like_notification();

-- Remove notification when like is removed
create or replace function handle_comment_like_notification_removal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from notifications
  where type = 'comment_like'
    and comment_id = old.comment_id
    and user_id = (select user_id from comments where id = old.comment_id)
    and created_at >= (now() - interval '1 day');  -- Only delete recent notifications to avoid removing historical ones

  return old;
end;
$$;

create trigger on_comment_like_removed
  after delete on comment_likes
  for each row
  execute function handle_comment_like_notification_removal();