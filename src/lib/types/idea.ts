export interface Idea {
  id: string
  title: string
  description: string
  target_audience: string
  category: string
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
  status: string
  is_featured: boolean
}