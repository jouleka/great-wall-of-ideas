"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { categoryService } from "@/lib/services/category-service"
import { CategoryWithSubcategories } from "@/lib/types/category"
import { categoryIcons } from "@/lib/utils/idea-utils"
import { Skeleton } from "@/components/ui/skeleton"
import { ChevronDown, ChevronRight } from "lucide-react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

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
  const [categories, setCategories] = useState<CategoryWithSubcategories[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({})
  const supabase = createClientComponentClient()

  const loadCategories = useCallback(async () => {
    try {
      const cats = await categoryService.getAllCategories()
      setCategories(cats)
    } catch (error) {
      console.error('Error loading categories:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCategories()

    // Subscribe to changes in ideas table
    const channel = supabase.channel('category-browser')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'ideas' 
      }, () => {
        loadCategories()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, loadCategories])

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

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 flex-1" />
          </div>
        ))}
      </div>
    )
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