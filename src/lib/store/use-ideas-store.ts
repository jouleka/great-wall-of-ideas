import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Idea } from '@/lib/types/idea'
import { IdeaStatus } from '@/lib/types/database'
import { ideaService } from '@/lib/services/idea-service'
import { voteService } from '@/lib/services/vote-service'
import { toast } from 'sonner'
import { createSupabaseClient } from '@/lib/supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'

interface IdeasState {
  ideas: Idea[]
  isLoading: boolean
  isLoadingMore: boolean
  hasMore: boolean
  sortType: 'all' | 'trending' | 'my_ideas' | 'top'
  currentPage: number
  selectedIdeaId: string | null
  selectedCategoryId: string | null
  selectedSubcategoryId: string | null
  searchTerm: string
  error: Error | null
  initialized: boolean
  lastFetch: Record<string, number>
  pendingRequests: Record<string, Promise<void> | undefined>
  realtimeChannels: Record<string, RealtimeChannel>
  activeViewers: Record<string, number>
  featuredIdeas: Idea[]
  subscription: RealtimeChannel | null
}

interface IdeasActions {
  setIdeas: (ideas: Idea[]) => void
  setSortType: (type: IdeasState['sortType']) => void
  setSelectedIdeaId: (id: string | null) => void
  setSelectedCategoryId: (id: string | null) => void
  setSelectedSubcategoryId: (id: string | null) => void
  setSearchTerm: (term: string) => void
  loadIdeas: (page?: number) => Promise<void>
  loadMore: () => Promise<void>
  resetIdeas: () => void
  handleVote: (ideaId: string, voteType: 'upvote' | 'downvote') => Promise<void>
  createIdea: (newIdea: Omit<Idea, "id" | "created_at" | "updated_at" | "upvotes" | "downvotes" | "views">) => Promise<void>
  deleteIdea: (ideaId: string) => Promise<boolean>
  incrementViews: (ideaId: string) => Promise<void>
  subscribeToIdea: (ideaId: string) => void
  unsubscribeFromIdea: (ideaId: string) => void
  updateEngagement: (ideaId: string, data: Partial<Idea>) => void
  updateIdeaStatus: (ideaId: string, status: IdeaStatus) => Promise<void>
  makeIdeaPublic: (ideaId: string) => Promise<void>
  addIdea: (idea: Idea) => void
  updateIdea: (ideaId: string, updatedIdea: Idea) => void
  removeIdea: (ideaId: string) => void
  initialize: (userId: string) => Promise<void>
}

const CACHE_DURATION = 5 * 60 * 1000
const DEDUPE_DURATION = 2 * 1000

export const useIdeasStore = create<IdeasState & IdeasActions>()(
  persist(
    (set, get) => ({
      ideas: [],
      isLoading: false,
      isLoadingMore: false,
      hasMore: true,
      sortType: 'all',
      currentPage: 0,
      selectedIdeaId: null,
      selectedCategoryId: null,
      selectedSubcategoryId: null,
      searchTerm: '',
      error: null,
      initialized: false,
      lastFetch: {},
      pendingRequests: {},
      realtimeChannels: {},
      activeViewers: {},
      featuredIdeas: [],
      subscription: null,

      setIdeas: (ideas) => set({ ideas }),
      setSortType: (sortType) => {
        set({ sortType })
        get().resetIdeas()
      },
      setSelectedIdeaId: (id) => set({ selectedIdeaId: id }),
      setSelectedCategoryId: (id) => set({ selectedCategoryId: id }),
      setSelectedSubcategoryId: (id) => set({ selectedSubcategoryId: id }),
      setSearchTerm: (term) => set({ searchTerm: term }),

      loadIdeas: async (page = 0) => {
        const state = get()
        const now = Date.now()

        const cacheKey = `${state.sortType}-${page}-${state.selectedCategoryId}-${state.selectedSubcategoryId}-${state.searchTerm}`

        // Return existing promise if one is in progress (request deduplication)
        const pendingRequest = state.pendingRequests[cacheKey]
        if (pendingRequest && now - (state.lastFetch[cacheKey] || 0) < DEDUPE_DURATION) {
          return pendingRequest
        }

        if (
          !page && 
          state.initialized && 
          state.lastFetch[cacheKey] && 
          now - state.lastFetch[cacheKey] < CACHE_DURATION &&
          state.ideas.length > 0
        ) {
          return Promise.resolve()
        }

        if (state.isLoading || state.isLoadingMore) return Promise.resolve()

        const promise = (async () => {
          set({ 
            isLoading: page === 0,
            isLoadingMore: page > 0,
            lastFetch: {
              ...state.lastFetch,
              [cacheKey]: now
            }
          })

          try {
            const { data, hasMore } = await ideaService.getIdeas({
              page, 
              sortType: state.sortType,
              categoryId: state.selectedCategoryId,
              subcategoryId: state.selectedSubcategoryId,
              searchTerm: state.searchTerm
            })
            
            set(state => {
              const existingIds = new Set(state.ideas.map((idea: Idea) => idea.id))
              const newIdeas = data.filter((idea: Idea) => !existingIds.has(idea.id))
              
              return {
                ideas: page === 0 ? data : [...state.ideas, ...newIdeas],
                hasMore,
                currentPage: page,
                isLoading: false,
                isLoadingMore: false,
                error: null,
                initialized: true,
                pendingRequests: {
                  ...state.pendingRequests,
                  [cacheKey]: undefined
                }
              }
            })
          } catch (error) {
            console.error('Error loading ideas:', error)
            set({ 
              error: error instanceof Error ? error : new Error('Failed to load ideas'),
              isLoading: false,
              isLoadingMore: false,
              pendingRequests: {
                ...state.pendingRequests,
                [cacheKey]: undefined
              }
            })
            throw error
          }
        })()

        set(state => ({
          pendingRequests: {
            ...state.pendingRequests,
            [cacheKey]: promise
          }
        }))

        return promise
      },

      loadMore: async () => {
        const { currentPage, hasMore, isLoadingMore } = get()
        if (!hasMore || isLoadingMore) return
        await get().loadIdeas(currentPage + 1)
      },

      resetIdeas: () => {
        set({ 
          ideas: [], 
          currentPage: 0, 
          hasMore: true,
          error: null,
          initialized: false,
          lastFetch: {},
          pendingRequests: {}
        })
        get().loadIdeas(0)
      },

      handleVote: async (ideaId, voteType) => {
        const state = get()
        const supabase = createSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          toast.error("Please sign in to vote", {
            action: {
              label: "Sign In",
              onClick: () => window.location.href = '/auth?redirectTo=/ideas'
            }
          })
          return
        }

        const ideaStateBeforeVote = [...state.ideas]
        const idea = state.ideas.find(i => i.id === ideaId)
        if (!idea) return

        try {
          const currentVote = await voteService.getCurrentVote(ideaId, user.id)
          const isRemovingVote = currentVote === voteType
          const isChangingVote = currentVote && currentVote !== voteType

          set(state => ({
            ideas: state.ideas.map(i => {
              if (i.id !== ideaId) return i
              return {
                ...i,
                upvotes: voteType === 'upvote' 
                  ? i.upvotes + (isRemovingVote ? -1 : 1) - (isChangingVote && currentVote === 'upvote' ? 1 : 0)
                  : i.upvotes - (isChangingVote && currentVote === 'upvote' ? 1 : 0),
                downvotes: voteType === 'downvote'
                  ? i.downvotes + (isRemovingVote ? -1 : 1) - (isChangingVote && currentVote === 'downvote' ? 1 : 0)
                  : i.downvotes - (isChangingVote && currentVote === 'downvote' ? 1 : 0)
              }
            })
          }))

          const result = await voteService.handleVote(ideaId, user.id, voteType)
          
          if (!result.success) {
            set({ ideas: ideaStateBeforeVote })
            toast.error(result.message)
            return
          }

          set(state => ({
            ideas: state.ideas.map(i => 
              i.id === ideaId
                ? { ...i, upvotes: result.upvotes, downvotes: result.downvotes }
                : i
            )
          }))

          // Reload ideas if we're in top tab to maintain correct order
          if (state.sortType === 'top') {
            get().resetIdeas()
          }

          const { realtimeChannels } = get()
          if (realtimeChannels[ideaId]) {
            realtimeChannels[ideaId].send({
              type: 'broadcast',
              event: 'engagement',
              payload: {
                last_interaction_at: new Date().toISOString(),
                engagement_score: result.upvotes - result.downvotes
              }
            })
          }

        } catch (error) {
          console.error('Error voting:', error)
          set({ ideas: ideaStateBeforeVote })
          toast.error("Failed to register vote")
        }
      },

      createIdea: async (newIdea) => {
        const supabase = createSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          toast.error("Please sign in to create an idea")
          return
        }

        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', user.id)
            .single()

          await ideaService.createIdea({
            ...newIdea,
            user_id: user.id,
            author_name: newIdea.is_anonymous ? 'Anonymous' : (profile?.username || 'Unknown')
          })

          get().resetIdeas()
          
          toast.success("Idea Launched!", {
            description: "Your brilliant idea is now live on the Great Wall!",
            style: {
              backgroundColor: "hsl(var(--background))",
              color: "hsl(var(--foreground))"
            }
          })
        } catch (error) {
          console.error('Error creating idea:', error)
          if (error instanceof Error) {
            toast.error(error.message || "Failed to create idea")
          }
        }
      },

      deleteIdea: async (ideaId) => {
        const supabase = createSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          toast.error("Please sign in to delete your idea")
          return false
        }

        try {
          const { error } = await supabase
            .from('ideas')
            .delete()
            .eq('id', ideaId)
            .eq('user_id', user.id)

          if (error) throw error

          set(state => ({
            ideas: state.ideas.filter(idea => idea.id !== ideaId)
          }))

          toast.success("Idea deleted successfully")
          return true
        } catch (error) {
          console.error('Error deleting idea:', error)
          toast.error("Failed to delete idea")
          return false
        }
      },

      incrementViews: async (ideaId) => {
        const supabase = createSupabaseClient()
        try {
          const { error: viewError } = await supabase.rpc('increment_idea_views', {
            idea_id_input: ideaId
          })

          if (viewError) throw viewError

          const { error: updateError } = await supabase
            .from('ideas')
            .update({ 
              last_interaction_at: new Date().toISOString()
            })
            .eq('id', ideaId)

          if (updateError) throw updateError

          set(state => ({
            ideas: state.ideas.map(idea => 
              idea.id === ideaId 
                ? { 
                    ...idea, 
                    views: (idea.views || 0) + 1,
                    last_interaction_at: new Date().toISOString()
                  }
                : idea
            )
          }))
        } catch (error) {
          console.error('Error incrementing views:', error)
          throw error
        }
      },

      subscribeToIdea: (ideaId: string) => {
        const { realtimeChannels } = get()
        if (realtimeChannels[ideaId]) return

        const supabase = createSupabaseClient()
        const channel = supabase.channel(`idea:${ideaId}`)
          .on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState()
            const viewerCount = Object.keys(state).length

            set(state => ({
              activeViewers: {
                ...state.activeViewers,
                [ideaId]: viewerCount
              }
            }))

            supabase.rpc('track_idea_viewers', {
              idea_id: ideaId,
              viewer_count: viewerCount
            })
          })
          .on('presence', { event: 'leave' }, () => {
            const state = channel.presenceState()
            const viewerCount = Math.max(0, Object.keys(state).length)

            set(state => ({
              activeViewers: {
                ...state.activeViewers,
                [ideaId]: viewerCount
              }
            }))

            supabase.rpc('track_idea_viewers', {
              idea_id: ideaId,
              viewer_count: viewerCount
            })
          })
          .on('broadcast', { event: 'engagement' }, ({ payload }: { payload: { current_viewers: number; engagement_score: number } }) => {
            get().updateEngagement(ideaId, payload)
          })
          .subscribe(async (status: string) => {
            if (status === 'SUBSCRIBED') {
              await channel.track({
                user_id: (await supabase.auth.getUser()).data.user?.id,
                online_at: new Date().toISOString(),
              })
            }
          })

        set(state => ({
          realtimeChannels: {
            ...state.realtimeChannels,
            [ideaId]: channel
          }
        }))
      },

      unsubscribeFromIdea: async (ideaId: string) => {
        const { realtimeChannels } = get()
        const channel = realtimeChannels[ideaId]
        if (channel) {
          await channel.unsubscribe()
          set(state => {
            const newChannels = { ...state.realtimeChannels }
            delete newChannels[ideaId]
            return { realtimeChannels: newChannels }
          })
        }
      },

      updateEngagement: (ideaId: string, data: Partial<Idea>) => {
        set(state => ({
          ideas: state.ideas.map(idea => 
            idea.id === ideaId 
              ? { ...idea, ...data }
              : idea
          )
        }))
      },

      updateIdeaStatus: async (ideaId: string, status: IdeaStatus) => {
        const state = get()
        const ideaStateBeforeUpdate = [...state.ideas]
        const idea = state.ideas.find(i => i.id === ideaId)
        
        if (!idea) return

        try {
          set(state => ({
            ideas: state.ideas.map(i => 
              i.id === ideaId
                ? { ...i, status, status_updated_at: new Date().toISOString() }
                : i
            )
          }))

          const updatedIdea = await ideaService.updateIdeaStatus(ideaId, status)

          set(state => ({
            ideas: state.ideas.map(i => 
              i.id === ideaId ? updatedIdea : i
            )
          }))

          toast.success('Status updated successfully')

          const { realtimeChannels } = get()
          if (realtimeChannels[ideaId]) {
            realtimeChannels[ideaId].send({
              type: 'broadcast',
              event: 'engagement',
              payload: {
                status,
                status_updated_at: updatedIdea.status_updated_at,
                last_interaction_at: new Date().toISOString()
              }
            })
          }

        } catch (error) {
          console.error('Error updating idea status:', error)
          set({ ideas: ideaStateBeforeUpdate })
          toast.error(error instanceof Error ? error.message : 'Failed to update status')
        }
      },

      makeIdeaPublic: async (ideaId) => {
        const state = get()
        const ideaStateBeforeUpdate = [...state.ideas]
        const idea = state.ideas.find(i => i.id === ideaId)
        
        if (!idea) return

        try {
          set(state => ({
            ideas: state.ideas.map(i => 
              i.id === ideaId
                ? { ...i, is_private: false }
                : i
            )
          }))

          const updatedIdea = await ideaService.makeIdeaPublic(ideaId)

          set(state => ({
            ideas: state.ideas.map(i => 
              i.id === ideaId ? updatedIdea : i
            )
          }))

          toast.success('Idea is now public!')

          const { realtimeChannels } = get()
          if (realtimeChannels[ideaId]) {
            realtimeChannels[ideaId].send({
              type: 'broadcast',
              event: 'engagement',
              payload: {
                is_private: false,
                last_interaction_at: new Date().toISOString()
              }
            })
          }

        } catch (error) {
          console.error('Error making idea public:', error)
          set({ ideas: ideaStateBeforeUpdate })
          toast.error(error instanceof Error ? error.message : 'Failed to update privacy')
        }
      },

      addIdea: (idea: Idea) => {
        set(state => ({
          ideas: [...state.ideas, idea]
        }))
      },

      updateIdea: (ideaId: string, updatedIdea: Idea) => {
        set(state => ({
          ideas: state.ideas.map(idea => 
            idea.id === ideaId ? updatedIdea : idea
          )
        }))
      },

      removeIdea: (ideaId: string) => {
        set(state => ({
          ideas: state.ideas.filter(idea => idea.id !== ideaId)
        }))
      },

      initialize: async (userId: string) => {
        set({ isLoading: true })
        try {
          const { data: ideas } = await ideaService.getIdeas({
            page: 0,
            sortType: 'all'
          })

          const supabase = createSupabaseClient()
          const subscription = supabase
            .channel('ideas')
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'ideas'
              },
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              async (payload: any) => {
                const newIdea = payload.new as Idea
                const oldIdea = payload.old as Idea

                const state = get()
                const isMyIdea = newIdea.user_id === userId
                const isMyIdeasTab = state.sortType === 'my_ideas'
                const shouldShowIdea = !newIdea.is_private || isMyIdea || (isMyIdeasTab && isMyIdea)

                if (shouldShowIdea) {
                  switch (payload.eventType) {
                    case 'INSERT':
                      get().addIdea(newIdea)
                      break
                    case 'UPDATE':
                      get().updateIdea(newIdea.id, newIdea)
                      break
                    case 'DELETE':
                      get().removeIdea(oldIdea.id)
                      break
                  }
                } else {
                  if (oldIdea && !oldIdea.is_private && newIdea.is_private && !isMyIdea) {
                    get().removeIdea(newIdea.id)
                  }
                }
              }
            )
            .subscribe()

          set({
            ideas,
            subscription,
            isLoading: false
          })
        } catch (error) {
          console.error('Error initializing ideas store:', error)
          set({ error: error as Error, isLoading: false })
        }
      }
    }),
    {
      name: 'ideas-storage',
      partialize: (state) => ({
        ideas: state.ideas,
        sortType: state.sortType,
        selectedCategoryId: state.selectedCategoryId,
        selectedSubcategoryId: state.selectedSubcategoryId,
        lastFetch: state.lastFetch,
        activeViewers: state.activeViewers
      })
    }
  )
) 