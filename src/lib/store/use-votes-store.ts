'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createSupabaseClient } from '@/lib/supabase/client'
import { voteService } from '@/lib/services/vote-service'
import { toast } from 'sonner'
import { useIdeasStore } from './use-ideas-store'

interface VoteCount {
  upvotes: number
  downvotes: number
}

interface VoteState {
  votes: Record<string, VoteCount>
  userVotes: Record<string, 'upvote' | 'downvote' | null>
  isLoading: Record<string, boolean>
  error: Error | null
  lastFetched: Record<string, number>
  pendingInitializations: Record<string, Promise<void> | undefined>
  globalSubscription: (() => void) | null
}

interface VoteActions {
  initializeForIdea: (ideaId: string, userId: string | null) => Promise<void>
  handleVote: (ideaId: string, userId: string, voteType: 'upvote' | 'downvote') => Promise<void>
  setVoteCounts: (ideaId: string, counts: VoteCount) => void
  setUserVote: (ideaId: string, voteType: 'upvote' | 'downvote' | null) => void
  setLoading: (ideaId: string, isLoading: boolean) => void
  setError: (error: Error | null) => void
  // Single global subscription for all vote changes
  subscribeToVoteChanges: () => () => void
  syncFromIdea: (ideaId: string, upvotes: number, downvotes: number) => void
}

const CACHE_DURATION = 5 * 60 * 1000

export const useVotesStore = create<VoteState & VoteActions>()(
  persist(
    (set, get) => ({
      votes: {},
      userVotes: {},
      isLoading: {},
      error: null,
      lastFetched: {},
      pendingInitializations: {},
      globalSubscription: null,

      // Sync vote counts from idea data (used when ideas are loaded)
      syncFromIdea: (ideaId: string, upvotes: number, downvotes: number) => {
        set(state => ({
          votes: {
            ...state.votes,
            [ideaId]: { upvotes, downvotes }
          }
        }))
      },

      initializeForIdea: async (ideaId: string, userId: string | null) => {
        const state = get()
        const now = Date.now()

        // Check for pending initialization - just return existing promise
        const pendingPromise = state.pendingInitializations[ideaId]
        if (pendingPromise) {
          return pendingPromise
        }

        // Sync vote counts from ideas store if not already present
        // This handles the race condition where syncVotesToStore hasn't completed yet
        if (!state.votes[ideaId]) {
          const idea = useIdeasStore.getState().ideas.find(i => i.id === ideaId)
          if (idea) {
            set(state => ({
              votes: {
                ...state.votes,
                [ideaId]: { upvotes: idea.upvotes || 0, downvotes: idea.downvotes || 0 }
              }
            }))
          }
        }

        // Return cached if fresh (re-check state after potential sync)
        const currentState = get()
        if (
          currentState.votes[ideaId] &&
          currentState.lastFetched[ideaId] &&
          now - currentState.lastFetched[ideaId] < CACHE_DURATION &&
          (userId === null || currentState.userVotes[ideaId] !== undefined)
        ) {
          return Promise.resolve()
        }

        const promise = (async () => {
          set(state => ({
            isLoading: { ...state.isLoading, [ideaId]: true }
          }))

          try {
            // Only fetch user's vote - vote counts come from ideas data
            if (userId) {
              const userVote = await voteService.getCurrentVote(ideaId, userId)
              set(state => ({
                userVotes: {
                  ...state.userVotes,
                  [ideaId]: userVote
                }
              }))
            }
          } catch (error) {
            set({ error: error instanceof Error ? error : new Error('Failed to load vote') })
          } finally {
            // Always update lastFetched and cleanup, regardless of userId
            set(state => ({
              isLoading: { ...state.isLoading, [ideaId]: false },
              lastFetched: {
                ...state.lastFetched,
                [ideaId]: now
              },
              pendingInitializations: {
                ...state.pendingInitializations,
                [ideaId]: undefined
              }
            }))
          }
        })()

        set(state => ({
          pendingInitializations: {
            ...state.pendingInitializations,
            [ideaId]: promise
          }
        }))

        return promise
      },

      handleVote: async (ideaId: string, userId: string, voteType: 'upvote' | 'downvote') => {
        if (!userId) {
          toast.error("Please sign in to vote", {
            action: {
              label: "Sign In",
              onClick: () => window.location.href = '/auth?redirectTo=/ideas'
            }
          })
          return
        }

        const state = get()
        const currentVote = state.userVotes[ideaId]
        const currentCounts = state.votes[ideaId] || { upvotes: 0, downvotes: 0 }

        // Optimistic update
        const newCounts = { ...currentCounts }
        let newUserVote: 'upvote' | 'downvote' | null = voteType

        if (currentVote) {
          if (currentVote === 'upvote') {
            newCounts.upvotes--
          } else {
            newCounts.downvotes--
          }
        }

        if (currentVote === voteType) {
          // Toggle off
          newUserVote = null
        } else {
          if (voteType === 'upvote') {
            newCounts.upvotes++
          } else {
            newCounts.downvotes++
          }
        }

        // Update votes store
        set(state => ({
          votes: { ...state.votes, [ideaId]: newCounts },
          userVotes: { ...state.userVotes, [ideaId]: newUserVote }
        }))

        // Sync to ideas store
        useIdeasStore.getState().updateEngagement(ideaId, {
          upvotes: newCounts.upvotes,
          downvotes: newCounts.downvotes
        })

        try {
          const result = await voteService.handleVote(ideaId, userId, voteType)
          if (result) {
            const finalCounts = {
              upvotes: result.upvotes,
              downvotes: result.downvotes
            }

            set(state => ({
              votes: { ...state.votes, [ideaId]: finalCounts },
              userVotes: { ...state.userVotes, [ideaId]: result.vote_type || null },
              lastFetched: { ...state.lastFetched, [ideaId]: Date.now() }
            }))

            // Sync final counts to ideas store
            useIdeasStore.getState().updateEngagement(ideaId, finalCounts)

            // If in 'top' sort, refresh the list
            const ideasState = useIdeasStore.getState()
            if (ideasState.sortType === 'top') {
              ideasState.resetIdeas()
            }
          }
        } catch (error) {
          // Rollback on error
          set(state => ({
            votes: { ...state.votes, [ideaId]: currentCounts },
            userVotes: { ...state.userVotes, [ideaId]: currentVote },
            error: error instanceof Error ? error : new Error('Failed to update vote')
          }))
          useIdeasStore.getState().updateEngagement(ideaId, currentCounts)
          toast.error("Failed to register vote")
        }
      },

      setVoteCounts: (ideaId, counts) =>
        set(state => ({
          votes: { ...state.votes, [ideaId]: counts },
          lastFetched: { ...state.lastFetched, [ideaId]: Date.now() }
        })),

      setUserVote: (ideaId, voteType) =>
        set(state => ({
          userVotes: { ...state.userVotes, [ideaId]: voteType }
        })),

      setLoading: (ideaId, isLoading) =>
        set(state => ({
          isLoading: { ...state.isLoading, [ideaId]: isLoading }
        })),

      setError: (error) => set({ error }),

      // Single subscription for ALL vote changes on ideas table
      subscribeToVoteChanges: () => {
        const state = get()
        
        // Already subscribed
        if (state.globalSubscription) {
          return state.globalSubscription
        }

        const supabase = createSupabaseClient()

        const channel = supabase.channel('global-vote-changes')
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'ideas'
            },
            (payload: { new: Record<string, unknown> }) => {
              const newData = payload.new as { id: string; upvotes: number; downvotes: number }
              if (newData && 'upvotes' in newData && 'downvotes' in newData) {
                const ideaId = newData.id
                const counts = {
                  upvotes: newData.upvotes || 0,
                  downvotes: newData.downvotes || 0
                }

                set(state => ({
                  votes: { ...state.votes, [ideaId]: counts }
                }))

                // Sync to ideas store
                useIdeasStore.getState().updateEngagement(ideaId, counts)
              }
            }
          )
          .subscribe()

        const unsubscribe = () => {
          supabase.removeChannel(channel)
          set({ globalSubscription: null })
        }

        set({ globalSubscription: unsubscribe })
        return unsubscribe
      }
    }),
    {
      name: 'votes-storage',
      partialize: (state) => ({
        votes: state.votes,
        userVotes: state.userVotes,
        lastFetched: state.lastFetched
      })
    }
  )
)
