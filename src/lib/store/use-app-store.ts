'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User } from '@supabase/supabase-js'
import * as authService from '@/lib/services/auth'
import { Database } from '@/lib/types/database'
import { createSupabaseClient } from '@/lib/supabase/client'
import { ActivityData } from '@/hooks/use-activity-data'

// Extend the User type to include profile information
type UserWithProfile = User & {
  profile?: Database['public']['Tables']['profiles']['Row']
}

interface AppState {
  user: UserWithProfile | null
  loading: boolean
  activityData: ActivityData[]
  activityLoading: boolean
  activityError: Error | null
  initialized: boolean
}

interface AppActions {
  setUser: (user: UserWithProfile | null) => void
  setLoading: (loading: boolean) => void
  refreshSession: () => Promise<void>
  signIn: (emailOrUsername: string, password: string) => Promise<void>
  signUp: (email: string, password: string, username: string) => Promise<{ user: UserWithProfile | null; error: unknown | null }>
  signOut: () => Promise<void>
  signInWithGoogle: () => Promise<void>
  fetchActivityData: (userId: string) => Promise<void>
  setInitialized: (initialized: boolean) => void
}

export const useAppStore = create<AppState & AppActions>()(
  persist(
    (set, get) => ({
      user: null,
      loading: false,
      activityData: [],
      activityLoading: false,
      activityError: null,
      initialized: false,

      setInitialized: (initialized) => set({ initialized }),

      setUser: (user) => {
        if (user?.id !== get().user?.id) {
          set({ user, loading: false })
        }
      },

      setLoading: (loading) => {
        set({ loading })
      },

      refreshSession: async () => {
        const supabase = createSupabaseClient()
        try {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession()
          if (sessionError) throw sessionError

          if (!session?.user) {
            set({ user: null, loading: false })
            return
          }

          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()

          const userWithProfile = {
            ...session.user,
            profile: profile || undefined
          }
          
          set({ user: userWithProfile, loading: false })
        } catch (error) {
          console.error('Error refreshing session:', error)
          set({ user: null, loading: false })
        }
      },

      signIn: async (emailOrUsername, password) => {
        try {
          const { error } = await authService.signInWithEmailOrUsername(emailOrUsername, password)
          if (error) throw error
          await get().refreshSession()
        } catch (error) {
          console.error('Store: Error signing in:', error)
          throw error
        }
      },

      signUp: async (email, password, username) => {
        try {
          const result = await authService.signUp(email, password, username)
          if (result.user) {
            await get().refreshSession()
          }
          return result
        } catch (error) {
          console.error('Store: Error signing up:', error)
          return { user: null, error: error instanceof Error ? error : new Error('An unknown error occurred') }
        }
      },

      signOut: async () => {
        try {
          await authService.signOut()
          set({ user: null, activityData: [], initialized: false })
        } catch (error) {
          console.error('Store: Error signing out:', error)
          throw error
        }
      },

      signInWithGoogle: async () => {
        try {
          const { error } = await authService.signInWithGoogle()
          if (error) throw error
        } catch (error) {
          console.error('Store: Error signing in with Google:', error)
          throw error
        }
      },

      fetchActivityData: async (userId: string) => {
        if (!userId) return

        const state = get()
        
        // If we already have data and we're not force refreshing, return
        if (state.activityData.length > 0) {
          return
        }

        set({ activityLoading: true, activityError: null })
        try {
          const supabase = createSupabaseClient()
          const thirtyDaysAgo = new Date()
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
          
          const [ideasRes, commentsRes, votesRes] = await Promise.all([
            supabase
              .from('ideas')
              .select('created_at')
              .eq('user_id', userId)
              .gte('created_at', thirtyDaysAgo.toISOString()),
            
            supabase
              .from('comments')
              .select('created_at')
              .eq('user_id', userId)
              .gte('created_at', thirtyDaysAgo.toISOString()),
            
            supabase
              .from('votes')
              .select('voted_at')
              .eq('user_id', userId)
              .gte('voted_at', thirtyDaysAgo.toISOString())
          ])

          const activityMap = new Map<string, ActivityData>()
          
          for (let i = 0; i < 30; i++) {
            const date = new Date()
            date.setDate(date.getDate() - i)
            const dateStr = date.toISOString().split('T')[0]
            activityMap.set(dateStr, {
              date: dateStr,
              ideas: 0,
              comments: 0,
              votes: 0,
              total: 0
            })
          }

          ideasRes.data?.forEach((idea: { created_at: string }) => {
            const date = new Date(idea.created_at).toISOString().split('T')[0]
            const data = activityMap.get(date)
            if (data) {
              data.ideas++
              data.total++
            }
          })

          commentsRes.data?.forEach((comment: { created_at: string }) => {
            const date = new Date(comment.created_at).toISOString().split('T')[0]
            const data = activityMap.get(date)
            if (data) {
              data.comments++
              data.total++
            }
          })

          votesRes.data?.forEach((vote: { voted_at: string }) => {
            const date = new Date(vote.voted_at).toISOString().split('T')[0]
            const data = activityMap.get(date)
            if (data) {
              data.votes++
              data.total++
            }
          })

          const sortedData = Array.from(activityMap.values())
            .sort((a, b) => a.date.localeCompare(b.date))

          set({ activityData: sortedData, activityLoading: false })
        } catch (err) {
          set({ 
            activityError: err instanceof Error ? err : new Error('Failed to fetch activity data'),
            activityLoading: false 
          })
        }
      }
    }),
    {
      name: 'app-store',
      partialize: (state) => ({ 
        user: state.user,
        activityData: state.activityData,
        initialized: state.initialized
      })
    }
  )
) 