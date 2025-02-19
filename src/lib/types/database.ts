// Database-specific types
export interface DatabaseUser {
  id: string;
  email?: string;
  created_at: string;
  raw_user_meta_data: {
    username?: string;
    full_name?: string;
    avatar_url?: string;
  };
}

export interface DatabaseProfile {
  id: string;
  updated_at: string | null;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  website: string | null;
  bio: string | null;
}

export type IdeaStatus = 'draft' | 'in_review' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';

export interface DatabaseIdea {
  id: string;
  user_id: string;
  title: string;
  description: string;
  author_name: string | null;
  is_anonymous: boolean;
  created_at: string;
  updated_at: string;
  upvotes: number;
  downvotes: number;
  views: number;
  tags: string[];
  status: IdeaStatus;
  status_updated_at: string;
  status_updated_by: string | null;
  is_featured: boolean;
  target_audience: string;
  category_id: string;
  subcategory_id?: string;
  is_private: boolean;
  current_viewers: number;
  engagement_score: number;
  last_interaction_at: string;
  remixed_from_id: string | null;
}

export interface DatabaseIdeaRemix {
  id: string;
  original_idea_id: string;
  remixed_idea_id: string;
  created_at: string;
  created_by: string;
}

export interface IdeaRemixHistory {
  id: string;
  title: string;
  author_name: string;
  created_at: string;
  is_original: boolean;
  remix_level: number;
}

export interface DatabaseComment {
  id: string;
  idea_id: string;
  user_id: string | null;
  author_name: string | null;
  content: string;
  created_at: string;
}

export interface DatabaseVote {
  id: string;
  idea_id: string;
  user_id: string | null;
  ip_hash: string | null;
  vote_type: 'upvote' | 'downvote';
  voted_at: string;
}

// Helper type for database tables
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: DatabaseProfile;
        Insert: Omit<DatabaseProfile, 'updated_at'>;
        Update: Partial<Omit<DatabaseProfile, 'id'>>;
      };
      ideas: {
        Row: DatabaseIdea;
        Insert: Omit<DatabaseIdea, 'id' | 'created_at' | 'updated_at' | 'upvotes' | 'downvotes' | 'views'>;
        Update: Partial<Omit<DatabaseIdea, 'id' | 'created_at' | 'updated_at'>>;
      };
      idea_remixes: {
        Row: DatabaseIdeaRemix;
        Insert: Omit<DatabaseIdeaRemix, 'id' | 'created_at'>;
        Update: Partial<Omit<DatabaseIdeaRemix, 'id' | 'created_at'>>;
      };
      comments: {
        Row: DatabaseComment;
        Insert: Omit<DatabaseComment, 'id' | 'created_at'>;
        Update: Partial<Omit<DatabaseComment, 'id' | 'created_at'>>;
      };
      votes: {
        Row: DatabaseVote;
        Insert: Omit<DatabaseVote, 'id' | 'voted_at'>;
        Update: Partial<Omit<DatabaseVote, 'id' | 'voted_at'>>;
      };
    };
    Views: {
      [key: string]: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
    };
    Functions: {
      remix_idea: (args: {
        p_original_idea_id: string;
        p_title: string;
        p_description: string;
        p_target_audience: string;
        p_category_id: string;
        p_subcategory_id?: string;
        p_tags?: string[];
      }) => DatabaseIdea;
      get_idea_remix_history: (args: { p_idea_id: string }) => IdeaRemixHistory[];
      update_idea_votes: (p_idea_id: string) => void;
    };
  };
}
