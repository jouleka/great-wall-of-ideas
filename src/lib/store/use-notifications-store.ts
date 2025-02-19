'use client'

import { create } from 'zustand'
import { type Notification } from '@/lib/types/notification'
import { notificationService } from '@/lib/services/notification-service'

interface NotificationsState {
  notifications: Notification[]
  unreadCount: number
  isLoading: boolean
  error: Error | null
  subscription: ReturnType<typeof notificationService.subscribeToNotifications> | null
}

interface NotificationsActions {
  initialize: (userId: string) => Promise<void>
  setNotifications: (notifications: Notification[]) => void
  addNotification: (notification: Notification) => void
  setUnreadCount: (count: number) => void
  setLoading: (isLoading: boolean) => void
  setError: (error: Error | null) => void
  markAsRead: (notificationIds: string[]) => Promise<void>
  markAllAsRead: () => Promise<void>
  cleanup: () => void
}

export const useNotificationsStore = create<NotificationsState & NotificationsActions>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: true,
  error: null,
  subscription: null,

  initialize: async (userId: string) => {
    const state = get()
    if (state.subscription) {
      state.cleanup()
    }

    set({ isLoading: true })
    try {
      const [notifications, count] = await Promise.all([
        notificationService.getNotifications(),
        notificationService.getUnreadCount(),
      ])

      const subscription = notificationService.subscribeToNotifications(
        userId,
        (newNotification) => {
          get().addNotification(newNotification)
          set(state => ({ unreadCount: state.unreadCount + 1 }))
        }
      )

      set({
        notifications,
        unreadCount: count,
        subscription,
        error: null
      })
    } catch (error) {
      set({ error: error instanceof Error ? error : new Error('Failed to initialize notifications') })
    } finally {
      set({ isLoading: false })
    }
  },

  setNotifications: (notifications) => set({ notifications }),
  
  addNotification: (notification) => 
    set(state => ({
      notifications: [notification, ...state.notifications]
    })),

  setUnreadCount: (count) => set({ unreadCount: count }),
  
  setLoading: (isLoading) => set({ isLoading }),
  
  setError: (error) => set({ error }),

  markAsRead: async (notificationIds: string[]) => {
    try {
      await notificationService.markAsRead(notificationIds)
      
      set(state => ({
        notifications: state.notifications.map(n =>
          notificationIds.includes(n.id)
            ? { ...n, read_at: new Date().toISOString() }
            : n
        ),
        unreadCount: Math.max(0, state.unreadCount - notificationIds.length)
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error : new Error('Failed to mark notifications as read') })
      throw error
    }
  },

  markAllAsRead: async () => {
    try {
      await notificationService.markAllAsRead()
      
      set(state => ({
        notifications: state.notifications.map(n => ({
          ...n,
          read_at: n.read_at || new Date().toISOString()
        })),
        unreadCount: 0
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error : new Error('Failed to mark all notifications as read') })
      throw error
    }
  },

  cleanup: () => {
    const state = get()
    if (state.subscription) {
      state.subscription.unsubscribe()
    }
    set({
      subscription: null,
      notifications: [],
      unreadCount: 0,
      error: null
    })
  }
})) 