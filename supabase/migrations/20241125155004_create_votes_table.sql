drop table if exists votes;

create table
  votes (
    id uuid default uuid_generate_v4 () primary key,
    idea_id uuid references ideas (id) on delete cascade,
    user_id uuid references auth.users (id) on delete set null,
    ip_hash text,
    vote_type text check (vote_type in ('upvote', 'downvote')),
    voted_at timestamp with time zone default TIMEZONE ('utc'::text, now())
  );

alter table votes enable row level security;

create policy "Users can view all votes." on votes for
select
  using (true);

create policy "Users can insert their own votes." on votes for insert
with
  check (
    auth.uid () = user_id
    or ip_hash is not null
  );

create policy "Users can update their own votes." on votes
for update
  using (auth.uid () = user_id);

create policy "Users can delete their own votes." on votes for delete using (auth.uid () = user_id);

create
or replace function update_idea_votes (p_idea_id uuid) returns VOID 
SET search_path = public
AS $$
DECLARE
  upvotes_count INT;
  downvotes_count INT;
BEGIN
  -- Count upvotes
  SELECT COUNT(*) INTO upvotes_count
  FROM votes
  WHERE idea_id = p_idea_id AND vote_type = 'upvote';

  -- Count downvotes
  SELECT COUNT(*) INTO downvotes_count
  FROM votes
  WHERE idea_id = p_idea_id AND vote_type = 'downvote';

  UPDATE ideas
  SET upvotes = upvotes_count,
      downvotes = downvotes_count
  WHERE id = p_idea_id;
END;
$$ language plpgsql;