import { useState, useCallback, useRef } from "react"
import { Idea } from "../lib/types/idea"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { toast } from "sonner"
import { ideaService } from '../lib/services/idea-service'
import { voteService } from '../lib/services/vote-service'

export function useIdeas() {
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const pageRef = useRef(0)
  const isFetchingRef = useRef(false)
  const supabase = createClientComponentClient()

  const loadIdeas = useCallback(async (page: number) => {
    if (isFetchingRef.current) return
    
    try {
      isFetchingRef.current = true
      
      if (page === 0) {
        setIsLoading(true)
      } else {
        setIsLoadingMore(true)
      }
      
      const { data, hasMore: moreAvailable } = await ideaService.getIdeas(page)
      
      setIdeas(prev => {
        const newIdeas = page === 0 ? data : [...prev, ...data]
        const uniqueIdeas = Array.from(
          new Map(newIdeas.map(item => [item.id, item])).values()
        )
        return uniqueIdeas
      })
      
      setHasMore(moreAvailable)
      pageRef.current = page
    } catch (error) {
      console.error('Error loading ideas:', error)
      toast.error("Failed to load ideas")
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
      isFetchingRef.current = false
    }
  }, [])

  const resetIdeas = useCallback(() => {
    setIdeas([])
    setHasMore(true)
    setIsLoading(true)
    setIsLoadingMore(false)
    pageRef.current = 0
    isFetchingRef.current = false
    loadIdeas(0)
  }, [loadIdeas])

  const handleVote = useCallback(async (ideaId: string, voteType: 'upvote' | 'downvote') => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error("Please sign in to vote")
        return
      }

      const idea = ideas.find(i => i.id === ideaId)
      if (!idea) return

      const previousState = [...ideas]

      const currentVote = await voteService.getCurrentVote(ideaId, user.id)

      let newUpvotes = idea.upvotes
      let newDownvotes = idea.downvotes

      if (!currentVote) {
        if (voteType === 'upvote') newUpvotes++
        else newDownvotes++
      } else if (currentVote === voteType) {
        if (voteType === 'upvote') newUpvotes--
        else newDownvotes--
      } else {
        if (voteType === 'upvote') {
          newUpvotes++
          newDownvotes--
        } else {
          newUpvotes--
          newDownvotes++
        }
      }

      setIdeas(prev => 
        prev.map(i => {
          if (i.id !== ideaId) return i
          return {
            ...i,
            upvotes: newUpvotes,
            downvotes: newDownvotes
          }
        })
      )

      const result = await voteService.handleVote(ideaId, user.id, voteType)

      if (!result.success) {
        setIdeas(previousState)
        toast.error(result.message)
        return
      }

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

      switch (result.action) {
        case 'added':
          toast.success(`Vote recorded`)
          break
        case 'removed':
          toast.success('Vote removed')
          break
        case 'updated':
          toast.success('Vote updated')
          break
      }

    } catch (error) {
      console.error('Error voting:', error)
      toast.error("Failed to register vote")
      loadIdeas(pageRef.current)
    }
  }, [supabase, ideas, loadIdeas])

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

      resetIdeas()
    } catch (error) {
      console.error('Error creating idea:', error)
      toast.error("Failed to create idea")
    }
  }, [supabase, resetIdeas])

  return {
    ideas,
    isLoading,
    isLoadingMore,
    hasMore,
    handleVote,
    createIdea,
    loadMore: () => loadIdeas(pageRef.current + 1),
    resetIdeas
  }
}
