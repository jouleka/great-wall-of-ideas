-- Update the handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url, updated_at)
  VALUES (
    new.id,
    COALESCE(
      new.raw_user_meta_data->>'username',  -- Try to get username first (email signup)
      new.raw_user_meta_data->>'full_name'  -- Fallback to full_name (Google auth)
    ),
    NULL,  -- Always leave full_name empty for user to set later
    new.raw_user_meta_data->>'avatar_url',
    now()
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger is set up correctly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
