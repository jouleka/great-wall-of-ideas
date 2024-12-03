-- Add foreign key constraint to link comments with auth.users
ALTER TABLE public.comments
ADD CONSTRAINT comments_user_id_auth_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE SET NULL; 