import { useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useNotificationsStore } from '@/lib/store/use-notifications-store'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export function useNotifications() {
  const { user } = useAuth()
  const router = useRouter()
  const {
    notifications,
    unreadCount,
    isLoading,
    initialize,
    cleanup,
    markAsRead,
    markAllAsRead
  } = useNotificationsStore()

  useEffect(() => {
    if (!user) {
      cleanup()
      return
    }

    initialize(user.id).catch(error => {
      console.error('Failed to initialize notifications:', error)
      toast.error('Failed to load notifications')
    })

    return () => {
      cleanup()
    }
  }, [user, initialize, cleanup])

  const handleNotificationClick = async (notificationId: string, link?: string) => {
    if (notifications.find(n => n.id === notificationId && !n.read_at)) {
      try {
        await markAsRead([notificationId])
      } catch (error) {
        console.error('Failed to mark notification as read:', error)
      }
    }
    
    if (link) {
      router.push(link)
    }
  }

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    handleNotificationClick,
  }
} 