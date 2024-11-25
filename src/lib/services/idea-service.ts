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

type SortType = 'all' | 'trending' | 'new' | 'top'

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

  async getIdeas(page: number, sortType: SortType = 'all') {
    const supabase = createClientComponentClient<Database>()
    
    try {
      const from = page * PAGE_SIZE
      
      switch (sortType) {
        case 'trending':
          const { data: trendingData, error: trendingError } = await supabase
            .rpc('get_trending_ideas', { 
              p_limit: PAGE_SIZE,
              p_offset: from
            })
          
          if (trendingError) throw trendingError
          return {
            data: trendingData as Idea[],
            hasMore: trendingData?.length === PAGE_SIZE
          }
        
        case 'top':
          const { data: topData, error: topError } = await supabase
            .rpc('get_top_rated_ideas', {
              p_limit: PAGE_SIZE,
              p_offset: from
            })
          
          if (topError) throw topError
          return {
            data: topData as Idea[],
            hasMore: topData?.length === PAGE_SIZE
          }
        
        case 'new':
          const { data: newData, error: newError, count: newCount } = await supabase
            .from('ideas')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(from, from + PAGE_SIZE - 1)
          
          if (newError) throw newError
          return {
            data: newData as Idea[],
            hasMore: newCount ? from + PAGE_SIZE < newCount : false
          }
        
        default: // 'all'
          const { data, error, count } = await supabase
            .from('ideas')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(from, from + PAGE_SIZE - 1)
          
          if (error) throw error
          return {
            data: data as Idea[],
            hasMore: count ? from + PAGE_SIZE < count : false
          }
      }
    } catch (error) {
      console.error('Error fetching ideas:', error)
      throw error
    }
  }
} 