'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { type Category, type CategoryWithSubcategories } from '@/lib/types/category'
import { categoryService } from '@/lib/services/category-service'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface CategoriesState {
  categories: CategoryWithSubcategories[]
  isLoading: boolean
  error: Error | null
  lastFetched: number | null
  stats: {
    totalIdeas: number
    topCategories: Array<{
      id: string
      name: string
      slug: string
      ideaCount: number
      percentage: number
    }>
  }
}

interface CategoriesActions {
  initialize: () => Promise<void>
  setCategories: (categories: CategoryWithSubcategories[]) => void
  setLoading: (isLoading: boolean) => void
  setError: (error: Error | null) => void
  updateStats: () => void
  searchCategories: (query: string) => Promise<Category[]>
  createCustomCategory: (category: Omit<Category, 'id' | 'created_at' | 'updated_at' | 'idea_count' | 'is_custom'>) => Promise<Category>
  getCategoryBySlug: (slug: string) => Promise<CategoryWithSubcategories | null>
  subscribeToChanges: () => () => void // Returns cleanup function
}

const processCategories = (categories: CategoryWithSubcategories[]) => {
  let totalIdeas = 0
  const categoryStats = categories.map(cat => {
    const directCategoryCount = cat.idea_count || 0
    const subcategoryCount = cat.subcategories?.reduce((acc, sub) => acc + (sub.idea_count || 0), 0) || 0
    const totalCount = directCategoryCount + subcategoryCount
    totalIdeas += totalCount
    return {
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      ideaCount: totalCount
    }
  })

  return {
    totalIdeas,
    topCategories: categoryStats
      .sort((a, b) => b.ideaCount - a.ideaCount)
      .map(cat => ({
        ...cat,
        percentage: totalIdeas > 0 ? (cat.ideaCount / totalIdeas) * 100 : 0
      }))
  }
}

const CACHE_DURATION = 5 * 60 * 1000

export const useCategoriesStore = create<CategoriesState & CategoriesActions>()(
  persist(
    (set, get) => ({
      categories: [],
      isLoading: false,
      error: null,
      lastFetched: null,
      stats: {
        totalIdeas: 0,
        topCategories: []
      },

      initialize: async () => {
        const state = get()
        const now = Date.now()

        // Check if we have cached data that's still fresh
        if (
          state.categories.length > 0 &&
          state.lastFetched &&
          now - state.lastFetched < CACHE_DURATION
        ) {
          return
        }

        set({ isLoading: true })
        try {
          const categories = await categoryService.getAllCategories()
          set({
            categories,
            stats: processCategories(categories),
            lastFetched: now,
            error: null
          })
        } catch (error) {
          set({ error: error instanceof Error ? error : new Error('Failed to load categories') })
        } finally {
          set({ isLoading: false })
        }
      },

      setCategories: (categories) => {
        set({ 
          categories,
          stats: processCategories(categories),
          lastFetched: Date.now()
        })
      },

      setLoading: (isLoading) => set({ isLoading }),
      
      setError: (error) => set({ error }),

      updateStats: () => {
        const { categories } = get()
        set({ stats: processCategories(categories) })
      },

      searchCategories: async (query) => {
        try {
          return await categoryService.searchCategories(query)
        } catch (error) {
          set({ error: error instanceof Error ? error : new Error('Failed to search categories') })
          return []
        }
      },

      createCustomCategory: async (category) => {
        try {
          const newCategory = await categoryService.createCustomCategory(category)
          const state = get()
          
          if (category.parent_id) {
            set({
              categories: state.categories.map(cat => 
                cat.id === category.parent_id
                  ? {
                      ...cat,
                      subcategories: [...(cat.subcategories || []), newCategory]
                    }
                  : cat
              )
            })
          } else {
            set({
              categories: [...state.categories, { ...newCategory, subcategories: [] }]
            })
          }

          return newCategory
        } catch (error) {
          set({ error: error instanceof Error ? error : new Error('Failed to create category') })
          throw error
        }
      },

      getCategoryBySlug: async (slug) => {
        const state = get()
        const localCategory = state.categories.find(c => c.slug === slug)
        if (localCategory) return localCategory

        try {
          return await categoryService.getCategoryBySlug(slug)
        } catch (error) {
          set({ error: error instanceof Error ? error : new Error('Failed to get category') })
          return null
        }
      },

      subscribeToChanges: () => {
        const supabase = createClientComponentClient()
        
        const channel = supabase.channel('categories')
          .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'ideas' 
          }, async () => {
            const state = get()
            const now = Date.now()
            if (!state.lastFetched || now - state.lastFetched >= CACHE_DURATION) {
              try {
                const categories = await categoryService.getAllCategories()
                get().setCategories(categories)
              } catch (error) {
                console.error('Error refreshing categories:', error)
              }
            }
          })
          .subscribe()

        return () => {
          supabase.removeChannel(channel)
        }
      }
    }),
    {
      name: 'categories-storage',
      partialize: (state) => ({
        categories: state.categories,
        lastFetched: state.lastFetched,
        stats: state.stats
      })
    }
  )
) 