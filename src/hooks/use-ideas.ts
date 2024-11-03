import { useState, useEffect, useCallback, useRef } from "react"
import { Idea } from "@/lib/types/idea"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useToast } from "@/hooks/use-toast"

const supabase = createClientComponentClient()
const ITEMS_PER_PAGE = 20

export function useIdeas() {
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const pageRef = useRef(0)
  const { toast } = useToast()

  const fetchIdeas = useCallback(async (loadMore = false) => {
    if (loading || (!loadMore && ideas.length > 0)) return

    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('ideas')
        .select('*')
        .order('created_at', { ascending: false })
        .range(pageRef.current * ITEMS_PER_PAGE, (pageRef.current + 1) * ITEMS_PER_PAGE - 1)

      if (error) throw error

      setIdeas(prevIdeas => loadMore ? [...prevIdeas, ...data] : data)
      setHasMore(data.length === ITEMS_PER_PAGE)
      if (loadMore) pageRef.current += 1
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred'
      setError(errorMessage)
      toast({
        title: "Error",
        description: `Failed to fetch ideas: ${errorMessage}`,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast, loading, ideas.length])

  useEffect(() => {
    fetchIdeas()
  }, [fetchIdeas])

  const handleVote = useCallback(async (ideaId: string, voteType: 'upvote' | 'downvote') => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User must be logged in to vote')

      // Optimistically update the UI
      setIdeas(prevIdeas => 
        prevIdeas.map(idea => 
          idea.id === ideaId 
            ? { ...idea, [voteType === 'upvote' ? 'upvotes' : 'downvotes']: idea[voteType === 'upvote' ? 'upvotes' : 'downvotes'] + 1 }
            : idea
        )
      )

      const { error } = await supabase.rpc('handle_vote', {
        p_idea_id: ideaId,
        p_user_id: user.id,
        p_vote_type: voteType
      })

      if (error) throw error

      // Fetch the updated idea to ensure consistency
      const { data: updatedIdea, error: fetchError } = await supabase
        .from('ideas')
        .select('*')
        .eq('id', ideaId)
        .single()

      if (fetchError) throw fetchError

      setIdeas(prevIdeas => prevIdeas.map(idea => idea.id === ideaId ? updatedIdea : idea))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred'
      toast({
        title: "Error",
        description: `Failed to register vote: ${errorMessage}`,
        variant: "destructive",
      })
      // Revert the optimistic update
      fetchIdeas()
    }
  }, [fetchIdeas, toast])

  const createIdea = useCallback(async (newIdea: Omit<Idea, 'id' | 'created_at' | 'updated_at' | 'upvotes' | 'downvotes' | 'views'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User must be logged in to create an idea')

      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single()

      const ideaToInsert = {
        ...newIdea,
        user_id: user.id,
        author_name: newIdea.is_anonymous ? 'Anonymous' : (profile?.username || user.email || 'Unknown')
      }

      const { data: createdIdea, error } = await supabase
        .from('ideas')
        .insert([ideaToInsert])
        .select()

      if (error) throw error

      setIdeas(prevIdeas => [createdIdea[0], ...prevIdeas])
      toast({
        title: "Success",
        description: "Your idea has been created successfully.",
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred'
      toast({
        title: "Error",
        description: `Failed to create idea: ${errorMessage}`,
        variant: "destructive",
      })
    }
  }, [toast])

  return { ideas, loading, error, hasMore, handleVote, createIdea, loadMore: () => fetchIdeas(true) }
}