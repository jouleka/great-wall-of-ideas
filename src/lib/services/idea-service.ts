import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Idea } from "../types/idea"
import { IdeaStatus } from "../types/database"

const ITEMS_PER_PAGE = 10

// Global request cache
interface CachedResponse {
  data: Idea[]
  hasMore: boolean
}

const requestCache = new Map<string, Promise<CachedResponse>>()

// Add cache for ideas
const cache = {
  ideas: new Map<string, { data: Idea[], timestamp: number }>(),
  ttl: 1000 * 60 * 5, // 5 minutes cache
}

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
    const supabase = createClientComponentClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Only get user ideas count if we're in my_ideas tab
    if (sortType === 'my_ideas' && !user) {
      return { data: [], hasMore: false }
    }

    const cacheKey = `${sortType}-${page}-${user?.id || 'anonymous'}-${categoryId}-${subcategoryId}-${searchTerm}`
    
    // Check if there's a pending request for this data
    const pendingRequest = requestCache.get(cacheKey)
    if (pendingRequest) {
      return pendingRequest
    }

    // Check cache
    const cachedData = cache.ideas.get(cacheKey)
    const now = Date.now()

    // Return cached data if valid
    if (cachedData && (now - cachedData.timestamp) < cache.ttl) {
      return { data: cachedData.data, hasMore: true }
    }

    // Create new request promise
    const promise = (async () => {
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

      // Cache the results
      cache.ideas.set(cacheKey, {
        data,
        timestamp: now
      })

      // Get total count for pagination - only if needed
      let hasMore = true
      if (data.length < ITEMS_PER_PAGE) {
        hasMore = false
      } else {
        const countQuery = supabase
          .from('ideas')
          .select('id', { count: 'exact' })

        // Add filters
        if (sortType === 'my_ideas') {
          countQuery.eq('user_id', user?.id)
        }
        if (categoryId) {
          countQuery.eq('category_id', categoryId)
        }
        if (subcategoryId) {
          countQuery.eq('subcategory_id', subcategoryId)
        }
        if (searchTerm) {
          countQuery.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,target_audience.ilike.%${searchTerm}%`)
        }

        const { count } = await countQuery
        hasMore = (page + 1) * ITEMS_PER_PAGE < (count || 0)
      }

      // Remove from request cache after completion
      requestCache.delete(cacheKey)

      return { data, hasMore }
    })()

    // Store the promise in the request cache
    requestCache.set(cacheKey, promise)

    return promise
  },

  // Clear cache when creating new idea
  async createIdea(idea: Omit<Idea, 'id' | 'created_at' | 'updated_at' | 'upvotes' | 'downvotes' | 'views' | 'current_viewers' | 'engagement_score' | 'last_interaction_at'>) {
    const supabase = createClientComponentClient()
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

    // Clear all caches after creating new idea
    cache.ideas.clear()
    requestCache.clear()
    return data
  },

  async incrementViews(ideaId: string) {
    const supabase = createClientComponentClient()
    const { error } = await supabase
      .rpc('increment_idea_views', {
        idea_id_input: ideaId
      })

    if (error) throw error
  },

  async trackEngagement(ideaId: string, type: 'view' | 'vote' | 'comment') {
    const supabase = createClientComponentClient()
    
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

      // Clear cache for this idea
      const cacheKeys = Array.from(cache.ideas.keys())
      cacheKeys.forEach(key => {
        if (key.includes(ideaId)) {
          cache.ideas.delete(key)
        }
      })
    } catch (error) {
      console.error('Error tracking engagement:', error)
      throw error
    }
  },

  async updateIdeaStatus(ideaId: string, status: IdeaStatus) {
    const supabase = createClientComponentClient()
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

      // Clear cache for this idea
      const cacheKeys = Array.from(cache.ideas.keys())
      cacheKeys.forEach(key => {
        if (key.includes(ideaId)) {
          cache.ideas.delete(key)
        }
      })

      return data
    } catch (error) {
      console.error('Error updating idea status:', error)
      throw error
    }
  },

  async makeIdeaPublic(ideaId: string) {
    const supabase = createClientComponentClient()
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

      const cacheKeys = Array.from(cache.ideas.keys())
      cacheKeys.forEach(key => {
        if (key.includes(ideaId)) {
          cache.ideas.delete(key)
        }
      })

      return data
    } catch (error) {
      console.error('Error updating idea privacy:', error)
      throw error
    }
  }
} 