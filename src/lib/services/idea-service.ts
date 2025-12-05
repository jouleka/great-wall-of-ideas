import { createSupabaseClient } from "@/lib/supabase/client"
import { Idea } from "../types/idea"
import { IdeaStatus } from "../types/database"

const ITEMS_PER_PAGE = 10

// Request deduplication cache - prevents duplicate parallel requests
// This is NOT a data cache - the store handles that
interface CachedResponse {
  data: Idea[]
  hasMore: boolean
}

const pendingRequests = new Map<string, Promise<CachedResponse>>()

interface GetIdeasOptions {
  page: number
  sortType: 'all' | 'trending' | 'my_ideas' | 'top'
  categoryId?: string | null
  subcategoryId?: string | null
  searchTerm?: string
}

export const ideaService = {
  async getIdeas({ 
    page, 
    sortType, 
    categoryId = null, 
    subcategoryId = null, 
    searchTerm = '' 
  }: GetIdeasOptions) {
    const supabase = createSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Only get user ideas count if we're in my_ideas tab
    if (sortType === 'my_ideas' && !user) {
      return { data: [], hasMore: false }
    }

    const requestKey = `${sortType}-${page}-${user?.id || 'anonymous'}-${categoryId}-${subcategoryId}-${searchTerm}`
    
    // Return existing promise if request is in-flight (deduplication)
    const existingRequest = pendingRequests.get(requestKey)
    if (existingRequest) {
      return existingRequest
    }

    // Create new request promise
    const promise = (async () => {
      try {
        const { data, error } = await supabase
          .rpc('get_filtered_ideas', {
            p_page: page,
            p_limit: ITEMS_PER_PAGE,
            p_sort_type: sortType,
            p_user_id: sortType === 'my_ideas' ? user?.id : null,
            p_category_id: categoryId,
            p_subcategory_id: subcategoryId,
            p_search_term: searchTerm || null
          })

        if (error) {
          console.error('Error in getIdeas:', error)
          throw error
        }

        // Determine hasMore based on returned data length
        // If we got fewer items than requested, there's no more
        const hasMore = data.length === ITEMS_PER_PAGE

        return { data, hasMore }
      } finally {
        // Always clean up pending request
        pendingRequests.delete(requestKey)
      }
    })()

    // Store promise for deduplication
    pendingRequests.set(requestKey, promise)

    return promise
  },

  async createIdea(idea: Omit<Idea, 'id' | 'created_at' | 'updated_at' | 'upvotes' | 'downvotes' | 'views' | 'current_viewers' | 'engagement_score' | 'last_interaction_at'>) {
    const supabase = createSupabaseClient()
    const { data, error } = await supabase
      .from('ideas')
      .insert({
        ...idea,
        upvotes: 0,
        downvotes: 0,
        views: 0,
        current_viewers: 0,
        engagement_score: 0,
        last_interaction_at: new Date().toISOString(),
        is_private: idea.is_private || false
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
    const supabase = createSupabaseClient()
    const { error } = await supabase
      .rpc('increment_idea_views', {
        idea_id_input: ideaId
      })

    if (error) throw error
  },

  async trackEngagement(ideaId: string, type: 'view' | 'vote' | 'comment') {
    const supabase = createSupabaseClient()
    
    try {
      if (type === 'view') {
        // Increment views using the existing RPC function
        await supabase.rpc('increment_idea_views', {
          idea_id_input: ideaId
        })
      }

      // Update last interaction timestamp
      const { error } = await supabase
        .from('ideas')
        .update({ 
          last_interaction_at: new Date().toISOString()
        })
        .eq('id', ideaId)

      if (error) throw error
    } catch (error) {
      console.error('Error tracking engagement:', error)
      throw error
    }
  },

  async updateIdeaStatus(ideaId: string, status: IdeaStatus) {
    const supabase = createSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new Error('User must be authenticated to update idea status')
    }

    try {
      const { data, error } = await supabase
        .rpc('update_idea_status', {
          p_idea_id: ideaId,
          p_status: status,
          p_user_id: user.id
        })

      if (error) throw error

      return data
    } catch (error) {
      console.error('Error updating idea status:', error)
      throw error
    }
  },

  async makeIdeaPublic(ideaId: string) {
    const supabase = createSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new Error('User must be authenticated to update idea privacy')
    }

    try {
      const { data, error } = await supabase
        .from('ideas')
        .update({ is_private: false })
        .eq('id', ideaId)
        .eq('user_id', user.id) // Ensure user owns the idea
        .select()
        .single()

      if (error) throw error

      return data
    } catch (error) {
      console.error('Error updating idea privacy:', error)
      throw error
    }
  }
}
