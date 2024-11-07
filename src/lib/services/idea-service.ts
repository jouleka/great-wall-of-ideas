import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { toast } from 'sonner'
import { Idea } from '@/lib/types/idea'

const PAGE_SIZE = 12

interface IdeaData {
  title: string
  description: string
  tags?: string[]
  is_anonymous?: boolean
  user_id: string
  author_name: string
}

export const ideaService = {
  async createIdea(data: IdeaData) {
    const supabase = createClientComponentClient()
    
    try {
      const { error } = await supabase
        .from('ideas')
        .insert([data])

      if (error) throw error

      toast.success("Idea created successfully!")
      return { success: true }
    } catch (err) {
      console.error('Error creating idea:', err)
      toast.error("Failed to create idea")
      return { success: false, error: err }
    }
  },

  async getIdeas(page: number) {
    const supabase = createClientComponentClient()
    
    try {
      const from = page * PAGE_SIZE
      const to = from + PAGE_SIZE - 1

      const { data, error, count } = await supabase
        .from('ideas')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) throw error

      return {
        data: data as Idea[],
        hasMore: count ? from + PAGE_SIZE < count : false
      }
    } catch (error) {
      console.error('Error fetching ideas:', error)
      throw error
    }
  }
} 