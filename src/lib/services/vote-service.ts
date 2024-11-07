import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { toast } from 'sonner'

const supabase = createClientComponentClient()
interface VoteData {
  idea_id: string
  vote_type: 'upvote' | 'downvote'
}

export const voteService = {
  async getCurrentVote(ideaId: string, userId: string) {
    
    try {
      const { data, error } = await supabase
        .from('votes')
        .select('vote_type')
        .eq('idea_id', ideaId)
        .eq('user_id', userId)
        .maybeSingle()

      if (error) {
        // Handle 406 errors specifically
        if (error.code === '406') {
          await supabase.auth.refreshSession()
          // Retry the request
          const { data: retryData } = await supabase
            .from('votes')
            .select('vote_type')
            .eq('idea_id', ideaId)
            .eq('user_id', userId)
            .maybeSingle()
          return retryData?.vote_type || null
        }
        throw error
      }

      return data?.vote_type || null
    } catch (error) {
      console.error('Error getting vote:', error)
      return null
    }
  },

  async addVote(data: VoteData & { user_id: string }) {
    try {
      // Check if user has already voted
      const currentVote = await this.getCurrentVote(data.idea_id, data.user_id)

      if (currentVote === data.vote_type) {
        // Remove vote if clicking the same type
        const { error: deleteError } = await supabase
          .from('votes')
          .delete()
          .eq('idea_id', data.idea_id)
          .eq('user_id', data.user_id)

        if (deleteError) throw deleteError

        // Update idea vote counts
        await supabase.rpc('update_idea_votes', {
          p_idea_id: data.idea_id
        })

        toast.success("Vote removed!")
        return { success: true, action: 'removed' }
      } else if (currentVote) {
        // Update vote if changing from up to down or vice versa
        const { error: updateError } = await supabase
          .from('votes')
          .update({ vote_type: data.vote_type })
          .eq('idea_id', data.idea_id)
          .eq('user_id', data.user_id)

        if (updateError) throw updateError

        // Update idea vote counts
        await supabase.rpc('update_idea_votes', {
          p_idea_id: data.idea_id
        })

        toast.success("Vote updated!")
        return { success: true, action: 'updated' }
      } else {
        // Add new vote
        const { error: insertError } = await supabase
          .from('votes')
          .insert([data])

        if (insertError) throw insertError

        // Update idea vote counts
        await supabase.rpc('update_idea_votes', {
          p_idea_id: data.idea_id
        })

        toast.success("Vote recorded!")
        return { success: true, action: 'added' }
      }
    } catch (err) {
      console.error('Error recording vote:', err)
      toast.error("Failed to record vote")
      return { success: false, error: err }
    }
  },

  async getVotes(ideaId: string) {
    const { data, error } = await supabase
      .from('votes')
      .select('vote_type, user_id')
      .eq('idea_id', ideaId)

    if (error) {
      console.error('Error fetching votes:', error)
      return null
    }

    return data
  }
} 