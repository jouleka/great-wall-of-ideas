"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { categoryIcons } from "@/lib/utils/idea-utils"
import { Skeleton } from "@/components/ui/skeleton"
import { ChevronDown, ChevronRight } from "lucide-react"
import { useCategoriesStore } from "@/lib/store/use-categories-store"

interface CategoryBrowserProps {
  onCategorySelect: (categoryId: string | null) => void
  onSubcategorySelect: (subcategoryId: string | null) => void
  selectedCategoryId?: string | null
  selectedSubcategoryId?: string | null
}

export function CategoryBrowser({
  onCategorySelect,
  onSubcategorySelect,
  selectedCategoryId,
  selectedSubcategoryId
}: CategoryBrowserProps) {
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({})
  
  const categories = useCategoriesStore(useCallback(state => state.categories, []))
  const isLoading = useCategoriesStore(useCallback(state => state.isLoading, []))
  const initialize = useCategoriesStore(useCallback(state => state.initialize, []))
  const subscribeToChanges = useCategoriesStore(useCallback(state => state.subscribeToChanges, []))

  // Initialize only once and handle cleanup
  useEffect(() => {
    let cleanup: (() => void) | undefined
    
    const init = async () => {
      await initialize()
      cleanup = subscribeToChanges()
    }
    
    init()
    return () => cleanup?.()
  }, [initialize, subscribeToChanges])

  const toggleCategory = useCallback((categoryId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }))
  }, [])

  const handleCategoryClick = useCallback((categoryId: string) => {
    if (selectedCategoryId === categoryId) {
      onCategorySelect(null)
      onSubcategorySelect(null)
    } else {
      onCategorySelect(categoryId)
      onSubcategorySelect(null)
    }
  }, [selectedCategoryId, onCategorySelect, onSubcategorySelect])

  const handleSubcategoryClick = useCallback((subcategoryId: string) => {
    if (selectedSubcategoryId === subcategoryId) {
      onSubcategorySelect(null)
    } else {
      onSubcategorySelect(subcategoryId)
    }
  }, [selectedSubcategoryId, onSubcategorySelect])

  const loadingSkeleton = useMemo(() => (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 flex-1" />
        </div>
      ))}
    </div>
  ), [])

  if (isLoading) {
    return loadingSkeleton
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-1 p-2">
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start font-normal",
            !selectedCategoryId && "bg-accent"
          )}
          onClick={() => {
            onCategorySelect(null)
            onSubcategorySelect(null)
          }}
        >
          All Categories
        </Button>

        {categories.map((category) => {
          const IconComponent = categoryIcons[category.slug] || categoryIcons.default
          const isExpanded = expandedCategories[category.id]
          const hasSubcategories = Array.isArray(category.subcategories) && category.subcategories.length > 0
          const isSelected = selectedCategoryId === category.id

          return (
            <div key={category.id} className="space-y-1">
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-between font-normal",
                  isSelected && "bg-accent"
                )}
                onClick={() => {
                  handleCategoryClick(category.id)
                  if (hasSubcategories) {
                    toggleCategory(category.id)
                  }
                }}
              >
                <span className="flex items-center">
                  <IconComponent className="mr-2 h-4 w-4" />
                  {category.name}
                </span>
                {hasSubcategories && (
                  <>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </>
                )}
              </Button>

              {hasSubcategories && isExpanded && (
                <div className="ml-4 space-y-1">
                  {category.subcategories?.map((subcategory) => {
                    const SubIconComponent = categoryIcons[subcategory.slug] || categoryIcons.default
                    const isSubcategorySelected = selectedSubcategoryId === subcategory.id

                    return (
                      <Button
                        key={subcategory.id}
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "w-full justify-start font-normal",
                          isSubcategorySelected && "bg-accent"
                        )}
                        onClick={() => handleSubcategoryClick(subcategory.id)}
                      >
                        <SubIconComponent className="mr-2 h-3 w-3" />
                        {subcategory.name}
                        {subcategory.idea_count > 0 && (
                          <Badge 
                            variant="secondary" 
                            className="ml-auto text-xs"
                          >
                            {subcategory.idea_count}
                          </Badge>
                        )}
                      </Button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </ScrollArea>
  )
} 