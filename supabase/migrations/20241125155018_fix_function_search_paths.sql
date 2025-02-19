CREATE OR REPLACE FUNCTION get_user_email_by_username(username_input text)
RETURNS text
SET search_path = public
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
declare
  user_email text;
begin
  select email into user_email
  from auth.users u
  join public.profiles p on u.id = p.id
  where p.username = username_input;
  
  return user_email;
end;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SET search_path = public
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RAISE LOG 'Creating profile for user: %', new.id;
  RAISE LOG 'User metadata: %', new.raw_user_meta_data;
  
  INSERT INTO public.profiles (id, username, full_name, avatar_url, updated_at)
  VALUES (
    new.id,
    COALESCE(
      new.raw_user_meta_data->>'username',
      split_part(new.email, '@', 1)
    ),
    COALESCE(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url',
    now()
  );
  
  RAISE LOG 'Profile created successfully for user: %', new.id;
  RETURN new;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Error creating profile: %', SQLERRM;
  RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION check_tag_lengths(tags text[])
RETURNS boolean 
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1
    FROM unnest(tags) tag
    WHERE length(tag) > 20
  );
END;
$$;

DO $$
DECLARE
  func_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'calculate_trending_score'
  ) INTO func_exists;
  
  IF func_exists THEN
    EXECUTE $func$
      CREATE OR REPLACE FUNCTION calculate_trending_score(
        p_upvotes integer,
        p_downvotes integer,
        p_views integer,
        p_created_at timestamp with time zone
      ) RETURNS float 
      SET search_path = public
      LANGUAGE plpgsql
      AS $inner$
      BEGIN
        RETURN 0.0;
      END;
      $inner$;
    $func$;
  END IF;
END;
$$; 