CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url, updated_at)
  VALUES (
    new.id,
    COALESCE(
      new.raw_user_meta_data->>'username',  -- From email signup
      split_part(new.email, '@', 1)  -- Fallback to email username
    ),
    COALESCE(
      new.raw_user_meta_data->>'full_name',  -- From email signup
      new.raw_user_meta_data->>'name',  -- From OAuth
      split_part(new.email, '@', 1)  -- Final fallback
    ),
    new.raw_user_meta_data->>'avatar_url',
    now()
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
