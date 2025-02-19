'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { voteService } from '@/lib/services/vote-service'
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

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
}

interface VoteActions {
  initialize: (ideaId: string, userId: string | null) => Promise<void>
  handleVote: (ideaId: string, userId: string, voteType: 'upvote' | 'downvote') => Promise<void>
  setVoteCounts: (ideaId: string, counts: VoteCount) => void
  setUserVote: (ideaId: string, voteType: 'upvote' | 'downvote' | null) => void
  setLoading: (ideaId: string, isLoading: boolean) => void
  setError: (error: Error | null) => void
  subscribeToChanges: (ideaId: string) => () => void
}

interface IdeaVoteUpdate {
  id: string
  upvotes: number
  downvotes: number
}

type IdeaVotePayload = RealtimePostgresChangesPayload<IdeaVoteUpdate>

const CACHE_DURATION = 5 * 60 * 1000
const DEDUPE_DURATION = 2 * 1000

export const useVotesStore = create<VoteState & VoteActions>()(
  persist(
    (set, get) => ({
      votes: {},
      userVotes: {},
      isLoading: {},
      error: null,
      lastFetched: {},
      pendingInitializations: {},

      initialize: async (ideaId: string, userId: string | null) => {
        const state = get()
        const now = Date.now()

        const pendingPromise = state.pendingInitializations[ideaId]
        if (
          pendingPromise &&
          state.lastFetched[ideaId] &&
          now - state.lastFetched[ideaId] < DEDUPE_DURATION
        ) {
          return pendingPromise
        }

        if (
          state.votes[ideaId] &&
          state.lastFetched[ideaId] &&
          now - state.lastFetched[ideaId] < CACHE_DURATION &&
          (userId === null || state.userVotes[ideaId] !== undefined)
        ) {
          return Promise.resolve()
        }

        const promise = (async () => {
          set(state => ({
            isLoading: { ...state.isLoading, [ideaId]: true }
          }))

          try {
            const supabase = createClientComponentClient()
            const [{ data: voteCounts }, userVote] = await Promise.all([
              supabase
                .from('ideas')
                .select('upvotes, downvotes')
                .eq('id', ideaId)
                .single(),
              userId ? voteService.getCurrentVote(ideaId, userId) : Promise.resolve(null)
            ])

            if (voteCounts) {
              set(state => ({
                votes: {
                  ...state.votes,
                  [ideaId]: {
                    upvotes: voteCounts.upvotes || 0,
                    downvotes: voteCounts.downvotes || 0
                  }
                },
                userVotes: {
                  ...state.userVotes,
                  [ideaId]: userVote
                },
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
          } catch (error) {
            set({ error: error instanceof Error ? error : new Error('Failed to load votes') })
          } finally {
            set(state => ({
              isLoading: { ...state.isLoading, [ideaId]: false },
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
        const state = get()
        const currentVote = state.userVotes[ideaId]
        const currentCounts = state.votes[ideaId]

        if (!currentCounts) return

        const newCounts = { ...currentCounts }
        
        if (currentVote) {
          if (currentVote === 'upvote') {
            newCounts.upvotes--
          } else {
            newCounts.downvotes--
          }
        }
        
        // If clicking same vote type, remove it, otherwise add new vote
        if (currentVote === voteType) {
          set(state => ({
            votes: { ...state.votes, [ideaId]: newCounts },
            userVotes: { ...state.userVotes, [ideaId]: null }
          }))
        } else {
          if (voteType === 'upvote') {
            newCounts.upvotes++
          } else {
            newCounts.downvotes++
          }
          set(state => ({
            votes: { ...state.votes, [ideaId]: newCounts },
            userVotes: { ...state.userVotes, [ideaId]: voteType }
          }))
        }

        try {
          const result = await voteService.handleVote(ideaId, userId, voteType)
          if (result) {
            set(state => ({
              votes: {
                ...state.votes,
                [ideaId]: {
                  upvotes: result.upvotes,
                  downvotes: result.downvotes
                }
              },
              userVotes: {
                ...state.userVotes,
                [ideaId]: result.vote_type || null
              },
              lastFetched: {
                ...state.lastFetched,
                [ideaId]: Date.now()
              }
            }))
          }
        } catch (error) {
          set(state => ({
            votes: { ...state.votes, [ideaId]: currentCounts },
            userVotes: { ...state.userVotes, [ideaId]: currentVote },
            error: error instanceof Error ? error : new Error('Failed to update vote')
          }))
        }
      },

      setVoteCounts: (ideaId, counts) => 
        set(state => ({
          votes: { ...state.votes, [ideaId]: counts },
          lastFetched: {
            ...state.lastFetched,
            [ideaId]: Date.now()
          }
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

      subscribeToChanges: (ideaId: string) => {
        const supabase = createClientComponentClient()
        
        const channel = supabase.channel(`idea-votes-${ideaId}`)
          .on(
            'postgres_changes' as const,
            { 
              event: '*', 
              schema: 'public', 
              table: 'ideas',
              filter: `id=eq.${ideaId}`
            },
            (payload: IdeaVotePayload) => {
              const newData = payload.new as IdeaVoteUpdate
              const state = get()
              const now = Date.now()

              if (
                !state.lastFetched[ideaId] ||
                now - state.lastFetched[ideaId] >= CACHE_DURATION
              ) {
                if (newData && 'upvotes' in newData && 'downvotes' in newData) {
                  set(state => ({
                    votes: {
                      ...state.votes,
                      [ideaId]: {
                        upvotes: newData.upvotes || 0,
                        downvotes: newData.downvotes || 0
                      }
                    },
                    lastFetched: {
                      ...state.lastFetched,
                      [ideaId]: now
                    }
                  }))
                }
              }
            }
          )
          .subscribe()

        return () => {
          supabase.removeChannel(channel)
        }
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