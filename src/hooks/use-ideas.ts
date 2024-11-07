import { useState, useEffect, useCallback, useRef } from "react"
import { Idea } from "@/lib/types/idea"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { toast } from "sonner"
import { ideaService } from '@/lib/services/idea-service'

export function useIdeas() {
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const pageRef = useRef(0)
  const isFetchingRef = useRef(false)
  const supabase = createClientComponentClient()

  const loadIdeas = useCallback(async (page: number) => {
    if (isFetchingRef.current) return
    
    try {
      isFetchingRef.current = true
      const { data, hasMore: moreAvailable } = await ideaService.getIdeas(page)
      
      setIdeas(prev => {
        // Deduplicate ideas based on id
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
      isFetchingRef.current = false
    }
  }, [])

  const resetIdeas = useCallback(() => {
    setIdeas([])
    setHasMore(true)
    setIsLoading(true)
    pageRef.current = 0
    isFetchingRef.current = false
    loadIdeas(0)
  }, [loadIdeas])

  const loadMore = useCallback(() => {
    if (!hasMore || isFetchingRef.current) return
    loadIdeas(pageRef.current + 1)
  }, [hasMore, loadIdeas])

  useEffect(() => {
    loadIdeas(0)
    return () => {
      setIdeas([])
      pageRef.current = 0
    }
  }, [loadIdeas])

  const handleVote = useCallback(async (ideaId: string, voteType: 'upvote' | 'downvote') => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error("Please sign in to vote")
        return
      }

      // Optimistic update
      setIdeas(prev => 
        prev.map(idea => 
          idea.id === ideaId 
            ? {
                ...idea,
                [voteType === 'upvote' ? 'upvotes' : 'downvotes']: 
                  idea[voteType === 'upvote' ? 'upvotes' : 'downvotes'] + 1
              }
            : idea
        )
      )

      const { error } = await supabase.rpc('handle_vote', {
        p_idea_id: ideaId,
        p_user_id: user.id,
        p_vote_type: voteType
      })

      if (error) throw error

    } catch (error) {
      console.error('Error voting:', error)
      toast.error("Failed to register vote")
      // Revert optimistic update
      loadIdeas(pageRef.current)
    }
  }, [supabase])

  const createIdea = useCallback(async (newIdea: Omit<Idea, 'id' | 'created_at' | 'updated_at' | 'upvotes' | 'downvotes' | 'views'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error("Please sign in to create an idea")
        return
      }

      await ideaService.createIdea({
        ...newIdea,
        user_id: user.id,
        author_name: newIdea.is_anonymous ? 'Anonymous' : user.email || 'Unknown'
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
    hasMore,
    handleVote,
    createIdea,
    loadMore,
    resetIdeas
  }
}