import { User } from '@supabase/auth-helpers-nextjs'

export interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  website: string | null;
  bio: string | null;
}

export interface ExtendedUser extends User {
  profile?: Profile;
}

export interface SafeCachedUser {
  id: string;
  username?: string | null;
  avatar_url?: string | null;
  display_name?: string | null;
  email?: string;
  profile?: {
    username: string | null;
    avatar_url: string | null;
    full_name: string | null;
  }
}

export interface CachedData {
  user: SafeCachedUser;
  timestamp: number;
}
