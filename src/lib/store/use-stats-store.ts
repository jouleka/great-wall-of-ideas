'use client'

import { create } from 'zustand'
import { createSupabaseClient } from '@/lib/supabase/client'

interface Stats {
  totalIdeas: number
  activeUsers: number
  successStories: number
  trendingNow: number
}

interface StatsState {
  stats: Stats
  previousStats: Stats
  isLoading: boolean
  error: Error | null
}

interface StatsActions {
  initialize: () => Promise<void>
  setStats: (stats: Stats) => void
  setPreviousStats: (stats: Stats) => void
  setLoading: (isLoading: boolean) => void
  setError: (error: Error | null) => void
  subscribeToChanges: () => () => void
}

const DEFAULT_STATS: Stats = {
  totalIdeas: 0,
  activeUsers: 0,
  successStories: 0,
  trendingNow: 0
}

export const useStatsStore = create<StatsState & StatsActions>((set) => ({
  stats: DEFAULT_STATS,
  previousStats: DEFAULT_STATS,
  isLoading: true,
  error: null,

  initialize: async () => {
    set({ isLoading: true })
    try {
      const supabase = createSupabaseClient()
      const [
        { count: totalIdeas },
        { count: activeUsers },
        { count: successStories },
        { count: trendingNow }
      ] = await Promise.all([
        supabase
          .from('ideas')
          .select('*', { count: 'exact', head: true })
          .throwOnError(),
        
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .throwOnError(),
        
        supabase
          .from('ideas')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'completed')
          .throwOnError(),
        
        supabase
          .from('ideas')
          .select('*', { count: 'exact', head: true })
          .gt('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .throwOnError()
      ])

      const newStats = {
        totalIdeas: totalIdeas || 0,
        activeUsers: activeUsers || 0,
        successStories: successStories || 0,
        trendingNow: trendingNow || 0
      }

      set(state => ({
        previousStats: state.stats,
        stats: newStats,
        error: null
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error : new Error('Failed to load stats') })
    } finally {
      set({ isLoading: false })
    }
  },

  setStats: (stats) => set({ stats }),
  setPreviousStats: (previousStats) => set({ previousStats }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  subscribeToChanges: () => {
    const supabase = createSupabaseClient()
    
    const channel = supabase.channel('hero-stats')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'ideas' 
      }, () => {
        set(state => ({
          previousStats: state.stats,
          stats: {
            ...state.stats,
            totalIdeas: state.stats.totalIdeas + 1,
            trendingNow: state.stats.trendingNow + 1
          }
        }))
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'ideas',
        filter: 'status=eq.completed'
      }, () => {
        set(state => ({
          previousStats: state.stats,
          stats: {
            ...state.stats,
            successStories: state.stats.successStories + 1
          }
        }))
      })
      .on('postgres_changes', { 
        event: 'DELETE', 
        schema: 'public', 
        table: 'ideas' 
      }, () => {
        set(state => ({
          previousStats: state.stats,
          stats: {
            ...state.stats,
            totalIdeas: Math.max(0, state.stats.totalIdeas - 1),
            trendingNow: Math.max(0, state.stats.trendingNow - 1)
          }
        }))
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }
})) 