import { createSupabaseClient } from '@/lib/supabase/client'
import { type Notification, type NotificationType } from '@/lib/types/notification'
import { type RealtimePostgresChangesPayload } from '@supabase/supabase-js'

const supabase = createSupabaseClient()

const VALID_NOTIFICATION_TYPES: NotificationType[] = [
  'new_comment',
  'comment_reply',
  'idea_vote',
  'idea_report',
  'comment_report',
  'status_change',
  'idea_featured',
  'comment_like'
]

function isValidNotification(obj: unknown): obj is Notification {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as Notification).id === 'string' &&
    typeof (obj as Notification).user_id === 'string' &&
    typeof (obj as Notification).type === 'string' &&
    VALID_NOTIFICATION_TYPES.includes((obj as Notification).type as NotificationType) &&
    typeof (obj as Notification).title === 'string' &&
    typeof (obj as Notification).message === 'string' &&
    typeof (obj as Notification).created_at === 'string' &&
    typeof (obj as Notification).email_sent === 'boolean'
  )
}

export const notificationService = {
  async getNotifications(): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error
    return data as Notification[]
  },

  async getUnreadCount(): Promise<number> {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .is('read_at', null)

    if (error) throw error
    return count ?? 0
  },

  async markAsRead(notificationIds: string[]): Promise<void> {
    const { error } = await supabase
      .rpc('mark_notifications_as_read', {
        p_notification_ids: notificationIds,
      })

    if (error) throw error
  },

  async markAllAsRead(): Promise<void> {
    const { error } = await supabase
      .rpc('mark_all_notifications_as_read')

    if (error) throw error
  },

  subscribeToNotifications(userId: string, callback: (notification: Notification) => void) {
    return supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload: RealtimePostgresChangesPayload<Notification>) => {
          if (isValidNotification(payload.new)) {
            callback(payload.new)
          } else {
            console.error('Received invalid notification payload:', payload.new)
          }
        }
      )
      .subscribe()
  },
} 