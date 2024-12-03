-- Function to get user email by username
create or replace function get_user_email_by_username(username_input text)
returns text
language plpgsql
security definer
as $$
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

-- Grant access to authenticated users
grant execute on function get_user_email_by_username to authenticated; 