import { create } from 'zustand'
import { Idea, RemixNode } from '@/lib/types/idea'
import { remixService } from '@/lib/services/remix-service'

interface RemixState {
  isLoading: boolean
  remixHistory: RemixNode[]
  remixCounts: Record<string, number>
  error: Error | null
}

interface RemixActions {
  remixIdea: (originalIdea: Idea, newIdea: Omit<Idea, "id" | "created_at" | "updated_at" | "upvotes" | "downvotes" | "views" | "remixed_from_id">) => Promise<Idea>
  getRemixHistory: (ideaId: string) => Promise<void>
  getRemixCount: (ideaId: string) => Promise<void>
  reset: () => void
}

export const useRemixStore = create<RemixState & RemixActions>((set, get) => ({
  isLoading: false,
  remixHistory: [],
  remixCounts: {},
  error: null,

  remixIdea: async (originalIdea, newIdea) => {
    set({ isLoading: true, error: null })
    try {
      const remixedIdea = await remixService.remixIdea(originalIdea, newIdea)
      
      const currentCount = get().remixCounts[originalIdea.id] || 0
      set(state => ({
        remixCounts: {
          ...state.remixCounts,
          [originalIdea.id]: currentCount + 1
        }
      }))

      return remixedIdea
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remix idea'
      set({ error: new Error(message) })
      throw error
    } finally {
      set({ isLoading: false })
    }
  },

  getRemixHistory: async (ideaId) => {
    set({ isLoading: true, error: null })
    try {
      const history = await remixService.getRemixHistory(ideaId)
      set({ remixHistory: history })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get remix history'
      set({ error: new Error(message) })
      console.error('Error getting remix history:', error)
    } finally {
      set({ isLoading: false })
    }
  },

  getRemixCount: async (ideaId) => {
    try {
      const count = await remixService.getRemixCount(ideaId)
      set(state => ({
        remixCounts: {
          ...state.remixCounts,
          [ideaId]: count
        }
      }))
    } catch (error) {
      console.error('Error getting remix count:', error)
    }
  },

  reset: () => {
    set({
      isLoading: false,
      remixHistory: [],
      remixCounts: {},
      error: null
    })
  }
})) 