export type CategoryType = 
  | 'technology'
  | 'business'
  | 'creative'
  | 'social_impact'
  | 'education'
  | 'health'
  | 'entertainment'
  | 'other';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  type: CategoryType;
  is_custom: boolean;
  created_by?: string;
  parent_id?: string;
  created_at: string;
  updated_at: string;
  idea_count: number;
}

export interface CategoryWithSubcategories extends Category {
  subcategories?: Category[];
} 