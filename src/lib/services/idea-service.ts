import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Idea } from '@/lib/types/idea'
import { Database } from '@/lib/types/database'

const PAGE_SIZE = 12

interface IdeaData {
  title: string
  description: string
  company: string
  category: string
  tags: string[]
  is_anonymous: boolean
  user_id: string
  author_name: string
  status: 'pending' | 'approved' | 'rejected'
  is_featured: boolean
}

export const ideaService = {
  async createIdea(data: IdeaData) {
    const supabase = createClientComponentClient<Database>()
    
    try {
      // Basic validation before sending to DB
      if (!data.title?.trim()) {
        throw new Error("Title is required")
      }
      if (data.description?.length < 20) {
        throw new Error("Description must be at least 20 characters")
      }
      if (!data.category?.trim()) {
        throw new Error("Category is required") 
      }
      if (!data.company?.trim()) {
        throw new Error("Company is required")
      }
      if (!Array.isArray(data.tags) || data.tags.length === 0) {
        throw new Error("At least one tag is required")
      }

      const { error } = await supabase
        .from('ideas')
        .insert([{
          ...data,
          title: data.title.trim(),
          description: data.description.trim(),
          category: data.category.trim(),
          company: data.company.trim(),
          tags: data.tags.map(tag => tag.trim().toLowerCase())
        }])

      if (error) {
        // Map DB constraint errors to user-friendly messages
        if (error.message?.includes('description_length')) {
          throw new Error('Description must be less than 2000 characters')
        }
        throw error
      }

      return { success: true }
    } catch (err) {
      throw err
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