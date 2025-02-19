import { IdeaStatus } from './database'

export interface Idea {
  id: string
  title: string
  description: string
  target_audience: string
  category_id: string
  subcategory_id?: string
  user_id: string
  created_at: string
  author_name: string
  is_anonymous: boolean
  is_private: boolean
  updated_at: string
  upvotes: number
  downvotes: number
  views: number
  tags: string[]
  status: IdeaStatus
  status_updated_at: string
  status_updated_by: string | null
  is_featured: boolean
  current_viewers: number
  engagement_score: number
  last_interaction_at: string
  remixed_from_id: string | null
  remix_count?: number
}

export interface IdeaRemix {
  id: string
  original_idea_id: string
  remixed_idea_id: string
  created_at: string
  created_by: string
  original_idea?: Idea
  remixed_idea?: Idea
}

export interface RemixNode {
  id: string
  title: string
  author_name: string
  created_at: string
  is_original: boolean
  remix_level: number
  children?: RemixNode[]
  user_id: string
  is_private: boolean
}