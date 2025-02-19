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

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone." on public.profiles for
select
  using (true);

create policy "Users can insert their own profile." on public.profiles for insert
with
  check (auth.uid () = id);

create policy "Users can update own profile." on public.profiles
for update
  using (auth.uid () = id);

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