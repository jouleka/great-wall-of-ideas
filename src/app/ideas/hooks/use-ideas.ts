import { useState, useEffect } from "react"
import { Idea } from "../types/idea"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

export function useIdeas() {
  const [ideas, setIdeas] = useState<Idea[]>([])
  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchIdeas()
  }, [])

  const fetchIdeas = async () => {
    const { data, error } = await supabase
      .from('ideas')
      .select('*')
      .order('votes', { ascending: false })

    if (error) {
      console.error('Error fetching ideas:', error)
    } else {
      setIdeas(data as Idea[])
    }
  }

  const handleVote = async (id: number, increment: boolean) => {
    const { data, error } = await supabase
      .from('ideas')
      .update({ votes: increment ? ideas.find(idea => idea.id === id)!.votes + 1 : ideas.find(idea => idea.id === id)!.votes - 1 })
      .eq('id', id)

    if (error) {
      console.error('Error updating vote:', error)
    } else {
      fetchIdeas()
    }
  }

  const createIdea = async (newIdea: Omit<Idea, 'id' | 'votes' | 'trend' | 'created_at'>) => {
    const { data, error } = await supabase
      .from('ideas')
      .insert([
        { ...newIdea, votes: 0, trend: 'stable' }
      ])

    if (error) {
      console.error('Error creating idea:', error)
      throw error
    } else {
      fetchIdeas()
    }
  }

  return { ideas, handleVote, createIdea }
}
