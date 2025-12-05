import { createSupabaseClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export type ReportReason = 'spam' | 'harassment' | 'inappropriate' | 'other'

interface BaseReportData {
  reason: ReportReason
  notes?: string
}

interface CommentReportData extends BaseReportData {
  type: 'comment'
  commentId: string
}

interface IdeaReportData extends BaseReportData {
  type: 'idea'
  ideaId: string
}

type ReportData = CommentReportData | IdeaReportData

export const reportService = {
  async reportItem(data: ReportData) {
    const supabase = createSupabaseClient()
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.user) {
        throw new Error('You must be logged in to report')
      }

      const { error } = await supabase
        .from('reports')
        .insert({
          comment_id: data.type === 'comment' ? data.commentId : null,
          idea_id: data.type === 'idea' ? data.ideaId : null,
          reporter_id: session.user.id,
          reason: data.reason,
          notes: data.notes
        })

      if (error) {
        if (error.message.includes('already reported')) {
          toast.error(`You have already reported this ${data.type}`)
          return { success: false, error }
        }
        throw error
      }

      toast.success(`${data.type === 'idea' ? 'Idea' : 'Comment'} reported successfully`)
      return { success: true }
    } catch (error) {
      console.error('Error reporting:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to report')
      return { success: false, error }
    }
  },

  async reportComment({ commentId, reason, notes }: Omit<CommentReportData, 'type'>) {
    return this.reportItem({ type: 'comment', commentId, reason, notes })
  },

  async getUserReports() {
    const supabase = createSupabaseClient()
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
          ),
          idea:ideas (
            title,
            description
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