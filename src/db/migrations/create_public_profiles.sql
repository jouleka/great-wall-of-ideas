-- Supabase AI is experimental and may produce incorrect answers
-- Always verify the output before executing

-- Create a table for public profiles
create table
  public.profiles (
    id uuid references auth.users on delete cascade not null primary key,
    updated_at timestamp with time zone,
    username text unique,
    full_name text,
    avatar_url text,
    website text,
    bio text,
    constraint username_length check (char_length(username) >= 3)
  );

-- Set up Row Level Security (RLS)
alter table public.profiles enable row level security;

-- Create policies
create policy "Public profiles are viewable by everyone." on public.profiles for
select
  using (true);

create policy "Users can insert their own profile." on public.profiles for insert
with
  check (auth.uid () = id);

create policy "Users can update own profile." on public.profiles
for update
  using (auth.uid () = id);

-- Create a trigger to automatically create a profile for new users
create function public.handle_new_user () returns trigger as $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$ language plpgsql security definer;

create trigger on_auth_user_created
after insert on auth.users for each row
execute function public.handle_new_user ();

-- Update the ideas table to reference the profiles table
do $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ideas_user_id_fkey') THEN
    ALTER TABLE public.ideas
    ADD CONSTRAINT ideas_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Update the comments table to reference the profiles table
do $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'comments_user_id_fkey') THEN
    ALTER TABLE public.comments
    ADD CONSTRAINT comments_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Update the votes table to reference the profiles table
do $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'votes_user_id_fkey') THEN
    ALTER TABLE public.votes
    ADD CONSTRAINT votes_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;