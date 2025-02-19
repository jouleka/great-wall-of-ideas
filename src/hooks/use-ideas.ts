import { useEffect, useRef } from 'react'
import { useIdeasStore } from '@/lib/store/use-ideas-store'
import { useSearchParams } from 'next/navigation'

export const useIdeas = () => {
  const searchParams = useSearchParams()
  const sortType = searchParams.get('sort') as 'all' | 'trending' | 'my_ideas' | 'top' || 'all'
  const categoryId = searchParams.get('category')
  const subcategoryId = searchParams.get('subcategory')
  const searchTerm = searchParams.get('q') || ''
  
  const store = useIdeasStore()
  const prevFilters = useRef({
    sortType,
    categoryId,
    subcategoryId,
    searchTerm
  })

  useEffect(() => {
    const filtersChanged = 
      prevFilters.current.sortType !== sortType ||
      prevFilters.current.categoryId !== categoryId ||
      prevFilters.current.subcategoryId !== subcategoryId ||
      prevFilters.current.searchTerm !== searchTerm

    if (!store.initialized || filtersChanged) {
      store.setSortType(sortType)
      store.setSelectedCategoryId(categoryId)
      store.setSelectedSubcategoryId(subcategoryId)
      store.setSearchTerm(searchTerm)

      if (store.initialized && filtersChanged) {
        store.resetIdeas()
      }

      prevFilters.current = {
        sortType,
        categoryId,
        subcategoryId,
        searchTerm
      }
    }
  }, [store, sortType, categoryId, subcategoryId, searchTerm])

  return {
    ideas: store.ideas,
    isLoading: store.isLoading,
    isLoadingMore: store.isLoadingMore,
    hasMore: store.hasMore,
    loadMore: store.loadMore,
    handleVote: store.handleVote,
    createIdea: store.createIdea,
    deleteIdea: store.deleteIdea,
    incrementViews: store.incrementViews,
    error: store.error
  }
}
