export type NotificationType =
  | 'new_comment'
  | 'comment_reply'
  | 'idea_vote'
  | 'idea_report'
  | 'comment_report'
  | 'status_change'
  | 'idea_featured'
  | 'comment_like'
  | 'remix'

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message: string
  link?: string
  idea_id?: string
  comment_id?: string
  actor_id?: string
  created_at: string
  read_at?: string
  email_sent: boolean
} 