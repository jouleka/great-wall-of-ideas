import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { categoryService } from "@/lib/services/category-service"
import { CategoryWithSubcategories } from "@/lib/types/category"
import { categoryIcons } from "@/lib/utils/idea-utils"
import { Skeleton } from "@/components/ui/skeleton"
import { ChevronDown, ChevronRight, Filter } from "lucide-react"
import { useState, useEffect } from "react"
import { CategoryStatistics } from "./category-statistics"

interface MobileCategoryBrowserProps {
  onCategorySelect: (categoryId: string | null) => void
  onSubcategorySelect: (subcategoryId: string | null) => void
  selectedCategoryId?: string | null
  selectedSubcategoryId?: string | null
}

export function MobileCategoryBrowser({
  onCategorySelect,
  onSubcategorySelect,
  selectedCategoryId,
  selectedSubcategoryId
}: MobileCategoryBrowserProps) {
  const [categories, setCategories] = useState<CategoryWithSubcategories[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({})
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const cats = await categoryService.getAllCategories()
        setCategories(cats)
      } catch (error) {
        console.error('Error loading categories:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadCategories()
  }, [])

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }))
  }

  const handleCategoryClick = (categoryId: string) => {
    if (selectedCategoryId === categoryId) {
      onCategorySelect(null)
      onSubcategorySelect(null)
    } else {
      onCategorySelect(categoryId)
      onSubcategorySelect(null)
    }
  }

  const handleSubcategoryClick = (subcategoryId: string) => {
    if (selectedSubcategoryId === subcategoryId) {
      onSubcategorySelect(null)
    } else {
      onSubcategorySelect(subcategoryId)
    }
  }

  const getActiveFiltersCount = () => {
    let count = 0
    if (selectedCategoryId) count++
    if (selectedSubcategoryId) count++
    return count
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          size="icon"
          className="relative"
        >
          <Filter className="h-4 w-4" />
          {getActiveFiltersCount() > 0 && (
            <Badge 
              variant="secondary"
              className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center"
            >
              {getActiveFiltersCount()}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[80vh]">
        <SheetHeader>
          <SheetTitle>Browse Categories</SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-full mt-4">
          <div className="space-y-6 px-4">
            {/* Categories Section */}
            <div className="space-y-2">
              {isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Skeleton className="h-10 w-10" />
                      <Skeleton className="h-10 flex-1" />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start font-normal h-12",
                      !selectedCategoryId && "bg-accent"
                    )}
                    onClick={() => {
                      onCategorySelect(null)
                      onSubcategorySelect(null)
                      setIsOpen(false)
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
                      <div key={category.id} className="space-y-2">
                        <Button
                          variant="ghost"
                          className={cn(
                            "w-full justify-between font-normal h-12",
                            isSelected && "bg-accent"
                          )}
                          onClick={() => {
                            handleCategoryClick(category.id)
                            if (!hasSubcategories) {
                              setIsOpen(false)
                            } else {
                              toggleCategory(category.id)
                            }
                          }}
                        >
                          <span className="flex items-center">
                            <IconComponent className="mr-2 h-5 w-5" />
                            {category.name}
                          </span>
                          {hasSubcategories && (
                            <>
                              {isExpanded ? (
                                <ChevronDown className="h-5 w-5" />
                              ) : (
                                <ChevronRight className="h-5 w-5" />
                              )}
                            </>
                          )}
                        </Button>

                        {hasSubcategories && isExpanded && (
                          <div className="ml-4 space-y-2">
                            {category.subcategories?.map((subcategory) => {
                              const SubIconComponent = categoryIcons[subcategory.slug] || categoryIcons.default
                              const isSubcategorySelected = selectedSubcategoryId === subcategory.id

                              return (
                                <Button
                                  key={subcategory.id}
                                  variant="ghost"
                                  className={cn(
                                    "w-full justify-start font-normal h-12",
                                    isSubcategorySelected && "bg-accent"
                                  )}
                                  onClick={() => {
                                    handleSubcategoryClick(subcategory.id)
                                    setIsOpen(false)
                                  }}
                                >
                                  <SubIconComponent className="mr-2 h-4 w-4" />
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
                </>
              )}
            </div>

            {/* Divider */}
            <Separator className="my-4" />

            {/* Statistics Section */}
            <div className="pb-4">
              <CategoryStatistics />
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
} 