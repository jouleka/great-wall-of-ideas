import { useState, useCallback, useRef, useEffect } from "react"
import { Idea } from "../lib/types/idea"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { toast } from "sonner"
import { ideaService } from '../lib/services/idea-service'
import { voteService } from '../lib/services/vote-service'

export function useIdeas() {
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [sortType, setSortType] = useState<'all' | 'trending' | 'my_ideas' | 'top'>('all')
  const pageRef = useRef(0)
  const isFetchingRef = useRef(false)
  const currentSortTypeRef = useRef(sortType)
  const supabase = createClientComponentClient()

  const loadIdeas = useCallback(async (page: number) => {
    if (isFetchingRef.current) return
    
    isFetchingRef.current = true
    if (page === 0) {
      setIsLoading(true)
      setIdeas([]) // Clear existing ideas when switching tabs
    } else {
      setIsLoadingMore(true)
    }

    try {
      const { data, hasMore: moreAvailable } = await ideaService.getIdeas(page, currentSortTypeRef.current)
      
      setIdeas(prev => {
        const newIdeas = page === 0 ? data : [...prev, ...data]
        const uniqueIdeas = Array.from(
          new Map(newIdeas.map((item: Idea) => [item.id, item])).values()
        ) as Idea[]
        return uniqueIdeas
      })
      
      setHasMore(moreAvailable)
      pageRef.current = page
    } catch (error) {
      console.error('Error loading ideas:', error)
      toast.error("Failed to load ideas")
      if (page === 0) {
        setIdeas([])
      }
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
      isFetchingRef.current = false
    }
  }, [])

  const resetAndLoad = useCallback(() => {
    pageRef.current = 0
    loadIdeas(0)
  }, [loadIdeas])

  // Update currentSortTypeRef when sortType changes
  useEffect(() => {
    currentSortTypeRef.current = sortType
    resetAndLoad()
  }, [sortType, resetAndLoad])

  const handleVote = useCallback(async (ideaId: string, voteType: 'upvote' | 'downvote') => {
    const ideaStateBeforeVote = [...ideas]
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error("Please sign in to vote")
        return
      }

      const idea = ideas.find(i => i.id === ideaId)
      if (!idea) return

      const currentVote = await voteService.getCurrentVote(ideaId, user.id)

      // Optimistic update
      setIdeas(prev => 
        prev.map(i => {
          if (i.id !== ideaId) return i
          return {
            ...i,
            upvotes: voteType === 'upvote' ? i.upvotes + 1 : i.upvotes - (currentVote === 'upvote' ? 1 : 0),
            downvotes: voteType === 'downvote' ? i.downvotes + 1 : i.downvotes - (currentVote === 'downvote' ? 1 : 0)
          }
        })
      )

      const result = await voteService.handleVote(ideaId, user.id, voteType)

      if (!result.success) {
        setIdeas(ideaStateBeforeVote)
        toast.error(result.message)
        return
      }

      // Update with actual server values
      setIdeas(prev =>
        prev.map(idea =>
          idea.id === ideaId
            ? {
                ...idea,
                upvotes: result.upvotes,
                downvotes: result.downvotes
              }
            : idea
        )
      )

      // Reload ideas if we're in top tab to maintain correct order
      if (sortType === 'top') {
        resetAndLoad()
      }

    } catch (error) {
      console.error('Error voting:', error)
      toast.error("Failed to register vote")
      setIdeas(ideaStateBeforeVote)
    }
  }, [supabase, ideas, resetAndLoad, sortType])

  const createIdea = useCallback(async (newIdea: Omit<Idea, 'id' | 'created_at' | 'updated_at' | 'upvotes' | 'downvotes' | 'views'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error("Please sign in to create an idea")
        return
      }

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

      resetAndLoad()
    } catch (error) {
      console.error('Error creating idea:', error)
      toast.error("Failed to create idea")
    }
  }, [supabase, resetAndLoad])

  return {
    ideas,
    isLoading,
    isLoadingMore,
    hasMore,
    handleVote,
    createIdea,
    loadMore: () => loadIdeas(pageRef.current + 1),
    resetIdeas: resetAndLoad,
    sortType,
    setSortType: useCallback((newSortType: typeof sortType) => {
      setSortType(newSortType)
    }, [])
  }
}
