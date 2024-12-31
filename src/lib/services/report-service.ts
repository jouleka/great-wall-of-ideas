import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { toast } from 'sonner'

const supabase = createClientComponentClient()

export type ReportReason = 'spam' | 'harassment' | 'inappropriate' | 'other'

interface ReportData {
  commentId: string
  reason: ReportReason
  notes?: string
}

export const reportService = {
  async reportComment({ commentId, reason, notes }: ReportData) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.user) {
        throw new Error('You must be logged in to report a comment')
      }

      const { error } = await supabase
        .from('reports')
        .insert({
          comment_id: commentId,
          reporter_id: session.user.id,
          reason,
          notes
        })

      if (error) {
        // Check if it's a duplicate report error
        if (error.message.includes('already reported')) {
          toast.error('You have already reported this comment')
          return { success: false, error }
        }
        throw error
      }

      toast.success('Comment reported successfully')
      return { success: true }
    } catch (error) {
      console.error('Error reporting comment:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to report comment')
      return { success: false, error }
    }
  },

  async getUserReports() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.user) {
        throw new Error('You must be logged in to view reports')
      }

      const { data, error } = await supabase
        .from('reports')
        .select(`
          *,
          comment:comments (
            content,
            author_name
          )
        `)
        .eq('reporter_id', session.user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      return { data, error: null }
    } catch (error) {
      console.error('Error fetching reports:', error)
      return { data: null, error }
    }
  }
} 