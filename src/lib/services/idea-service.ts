import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Idea } from "../types/idea"

const ITEMS_PER_PAGE = 10

export const ideaService = {
  async getIdeas(page: number, sortType: 'all' | 'trending' | 'my_ideas' | 'top') {
    const supabase = createClientComponentClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Only get user ideas count if we're in my_ideas tab
    if (sortType === 'my_ideas' && !user) {
      return { data: [], hasMore: false }
    }

    const { data, error } = await supabase
      .rpc('get_filtered_ideas', {
        p_page: page,
        p_limit: ITEMS_PER_PAGE,
        p_sort_type: sortType,
        p_user_id: sortType === 'my_ideas' ? user?.id : null
      })

    if (error) {
      console.error('Error in getIdeas:', error)
      throw error
    }

    // Get total count for pagination
    const countQuery = sortType === 'my_ideas' 
      ? supabase.from('ideas').select('id', { count: 'exact' }).eq('user_id', user?.id)
      : supabase.from('ideas').select('id', { count: 'exact' })

    const { count } = await countQuery

    const hasMore = (page + 1) * ITEMS_PER_PAGE < (count || 0)

    return { data, hasMore }
  },

  async createIdea(idea: Omit<Idea, 'id' | 'created_at' | 'updated_at' | 'upvotes' | 'downvotes' | 'views'>) {
    const supabase = createClientComponentClient()
    const { data, error } = await supabase
      .from('ideas')
      .insert({
        ...idea,
        upvotes: 0,
        downvotes: 0,
        views: 0
      })
      .select()
      .single()

    if (error) {
      // Enhance error messages for better user feedback
      if (error.message.includes('target_audience_length')) {
        throw new Error('Target audience must be between 2 and 50 characters')
      } else if (error.message.includes('category_length')) {
        throw new Error('Category must be between 2 and 30 characters')
      } else if (error.message.includes('tags_length')) {
        throw new Error('Maximum 8 tags allowed, each tag must be between 2 and 15 characters')
      } else if (error.message.includes('description_length')) {
        throw new Error('Description must be less than 2000 characters')
      } else if (error.message.includes('title_length')) {
        throw new Error('Title must be between 3 and 100 characters')
      }
      throw error
    }
    return data
  },

  async incrementViews(ideaId: string) {
    const supabase = createClientComponentClient()
    const { error } = await supabase
      .rpc('increment_idea_views', {
        idea_id: ideaId
      })

    if (error) throw error
  }
} 