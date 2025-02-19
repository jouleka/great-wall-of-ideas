export interface Comment {
  id: string
  idea_id: string
  user_id: string
  parent_id: string | null
  author_name: string
  author_avatar?: string | null
  content: string
  created_at: string
  replies?: Comment[]
  depth?: number
  like_count?: number
  is_liked?: boolean
} 