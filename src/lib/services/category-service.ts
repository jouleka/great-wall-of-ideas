import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Category, CategoryWithSubcategories } from "../types/category"

interface IdeaWithRefs {
  id: string;
  category_id: string;
  subcategory_id: string | null;
}

interface CategoryWithIdeas extends Category {
  ideas?: IdeaWithRefs[];
  subcategories?: (CategoryWithIdeas & { ideas?: IdeaWithRefs[] })[];
}

export const categoryService = {
  async getAllCategories(): Promise<CategoryWithSubcategories[]> {
    const supabase = createClientComponentClient()
    
    // Get all categories with their idea counts
    const { data: categories, error } = await supabase
      .from('categories')
      .select(`
        *,
        ideas:ideas!ideas_category_id_fkey(
          id,
          category_id,
          subcategory_id
        ),
        subcategories:categories(
          *,
          ideas:ideas!ideas_subcategory_id_fkey(
            id,
            category_id,
            subcategory_id
          )
        )
      `)
      .is('parent_id', null)  // Only get root categories
      .order('name')
    
    if (error) throw error
    if (!categories) return []

    // Process the categories to include proper idea counts
    const processedCategories = (categories as CategoryWithIdeas[]).map(category => {
      // Only count ideas that don't have a subcategory (to avoid double counting)
      const directIdeas = category.ideas?.filter(idea => !idea.subcategory_id) || []
      
      return {
        ...category,
        idea_count: directIdeas.length,
        subcategories: category.subcategories?.map(sub => ({
          ...sub,
          idea_count: sub.ideas?.length || 0
        }))
      }
    })

    return processedCategories
  },

  async getPopularCategories(limit: number = 5): Promise<Category[]> {
    const supabase = createClientComponentClient()
    
    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .order('idea_count', { ascending: false })
      .limit(limit)
    
    if (error) throw error
    return categories || []
  },

  async createCustomCategory(category: Omit<Category, 'id' | 'created_at' | 'updated_at' | 'idea_count' | 'is_custom'>): Promise<Category> {
    const supabase = createClientComponentClient()
    
    const { data, error } = await supabase
      .from('categories')
      .insert({
        ...category,
        is_custom: true,
        idea_count: 0
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async getCategoryBySlug(slug: string): Promise<CategoryWithSubcategories | null> {
    const supabase = createClientComponentClient()
    
    const { data: category, error } = await supabase
      .from('categories')
      .select('*')
      .eq('slug', slug)
      .single()
    
    if (error) return null
    if (!category) return null

    // Get subcategories if any
    const { data: subcategories } = await supabase
      .from('categories')
      .select('*')
      .eq('parent_id', category.id)
    
    return {
      ...category,
      subcategories: subcategories || []
    }
  },

  async searchCategories(query: string): Promise<Category[]> {
    const supabase = createClientComponentClient()
    
    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
      .order('idea_count', { ascending: false })
      .limit(10)
    
    if (error) throw error
    return categories || []
  }
} 