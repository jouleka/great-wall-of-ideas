export interface Comment {
  id: string
  idea_id: string
  user_id: string
  author_name: string
  author_avatar?: string | null
  content: string
  created_at: string
} 