import { createSupabaseClient } from '@/lib/supabase/client'

const supabase = createSupabaseClient()

export const voteService = {
  async getCurrentVote(ideaId: string, userId: string) {
    try {
      const { data } = await supabase
        .from('votes')
        .select('vote_type')
        .eq('idea_id', ideaId)
        .eq('user_id', userId)
        .maybeSingle()

      return data?.vote_type || null
    } catch (error) {
      console.error('Error getting vote:', error)
      return null
    }
  },

  async handleVote(ideaId: string, userId: string, voteType: 'upvote' | 'downvote') {
    try {
      const { data, error } = await supabase.rpc('handle_vote', {
        p_idea_id: ideaId,
        p_user_id: userId,
        p_vote_type: voteType
      })

      if (error) throw error
      return data

    } catch (error) {
      console.error('Error handling vote:', error)
      throw error
    }
  }
} 