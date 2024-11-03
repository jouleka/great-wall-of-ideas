import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { toast } from 'sonner'

const supabase = createClientComponentClient()

interface VoteData {
  idea_id: string
  vote_type: 'upvote' | 'downvote'
}

export const voteService = {
  async addVote(data: VoteData) {
    try {
      const { error } = await supabase
        .from('votes')
        .insert([data])

      if (error) throw error

      toast.success("Vote recorded!")
      return { success: true }
    } catch (err) {
      console.error('Error recording vote:', err)
      toast.error("Failed to record vote")
      return { success: false, error: err }
    }
  },

  async removeVote(ideaId: string) {
    // Implementation
  },

  async getVotes(ideaId: string) {
    // Implementation
  }
} 