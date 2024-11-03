export interface Idea {
    id: string;
    title: string;
    description: string;
    company: string;
    category: string;
    user_id: string;
    author_name: string;
    is_anonymous: boolean;
    created_at: Date;
    updated_at: Date;
    upvotes: number;
    downvotes: number;
    views: number;
    tags: string[];
    status: 'pending' | 'approved' | 'rejected';
    is_featured: boolean;
  }