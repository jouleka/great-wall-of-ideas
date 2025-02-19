'use client'

import { useEffect, useRef } from 'react'
import { useIdeasStore } from '@/lib/store/use-ideas-store'
import { useCategoriesStore } from '@/lib/store/use-categories-store'
import { useStatsStore } from '@/lib/store/use-stats-store'

export function useInitStore() {
  const initialized = useRef(false)

  const initializeIdeas = useIdeasStore(state => state.resetIdeas)
  const initializeCategories = useCategoriesStore(state => state.initialize)
  const initializeStats = useStatsStore(state => state.initialize)

  const subscribeToCategories = useCategoriesStore(state => state.subscribeToChanges)
  const subscribeToStats = useStatsStore(state => state.subscribeToChanges)

  useEffect(() => {
    if (initialized.current) return

    const initializeStores = async () => {
      try {
        await Promise.all([
          Promise.resolve(initializeCategories()).catch((error: Error) => {
            console.error('[CategoriesStore] Initialization failed:', error)
            throw error
          }),
          Promise.resolve(initializeStats()).catch((error: Error) => {
            console.error('[StatsStore] Initialization failed:', error)
            throw error
          }),
          Promise.resolve(initializeIdeas()).catch((error: Error) => {
            console.error('[IdeasStore] Initialization failed:', error)
            throw error
          })
        ])

        initialized.current = true
      } catch (error) {
        console.error('Store initialization failed:', error)
        throw error
      }
    }

    const cleanupFunctions: Array<() => void> = []
    
    try {
      cleanupFunctions.push(
        subscribeToCategories(),
        subscribeToStats()
      )
    } catch (error) {
      console.error('Failed to set up subscriptions:', error)
    }

    initializeStores()

    return () => {
      cleanupFunctions.forEach(cleanup => cleanup())
    }
  }, [
    initializeIdeas,
    initializeCategories,
    initializeStats,
    subscribeToCategories,
    subscribeToStats
  ])
} 