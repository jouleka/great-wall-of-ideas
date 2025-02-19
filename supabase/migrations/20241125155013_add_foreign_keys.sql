-- Add foreign key constraints after all tables exist
do $$ BEGIN
  -- Ideas to Profiles
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ideas_user_id_fkey') THEN
    ALTER TABLE public.ideas
    ADD CONSTRAINT ideas_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  -- Comments to Profiles
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'comments_user_id_fkey') THEN
    ALTER TABLE public.comments
    ADD CONSTRAINT comments_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  -- Votes to Profiles
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'votes_user_id_fkey') THEN
    ALTER TABLE public.votes
    ADD CONSTRAINT votes_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$; 