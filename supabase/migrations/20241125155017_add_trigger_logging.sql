-- Add logging to the handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER; 