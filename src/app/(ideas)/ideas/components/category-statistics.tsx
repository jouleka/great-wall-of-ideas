import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { categoryService } from "@/lib/services/category-service"
import { CategoryWithSubcategories } from "@/lib/types/category"
import { categoryIcons } from "@/lib/utils/idea-utils"
import { Skeleton } from "@/components/ui/skeleton"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

interface CategoryStats {
  totalIdeas: number
  topCategories: Array<{
    id: string
    name: string
    slug: string
    ideaCount: number
    percentage: number
  }>
}

export function CategoryStatistics() {
  const [stats, setStats] = useState<CategoryStats>({
    totalIdeas: 0,
    topCategories: []
  })
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClientComponentClient()

  const processCategories = useCallback((categories: CategoryWithSubcategories[]): CategoryStats => {
    let totalIdeas = 0
    const categoryStats = categories.map(cat => {
      // Count both direct category ideas and subcategory ideas
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

    // Sort by idea count but don't limit the number of categories
    const topCategories = categoryStats
      .sort((a, b) => b.ideaCount - a.ideaCount)
      .map(cat => ({
        ...cat,
        percentage: totalIdeas > 0 ? (cat.ideaCount / totalIdeas) * 100 : 0
      }))

    return {
      totalIdeas,
      topCategories
    }
  }, [])

  const loadStats = useCallback(async () => {
    try {
      const categories = await categoryService.getAllCategories()
      const processedStats = processCategories(categories)
      setStats(processedStats)
    } catch (error) {
      console.error('Error loading category statistics:', error)
    } finally {
      setIsLoading(false)
    }
  }, [processCategories])

  useEffect(() => {
    loadStats()

    // Subscribe to changes in ideas table
    const channel = supabase.channel('category-stats')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'ideas' 
      }, () => {
        loadStats()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, loadStats])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Category Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-4 w-[250px]" />
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-2 w-full" />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Category Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Ideas</span>
            <span className="text-2xl font-bold">{stats.totalIdeas}</span>
          </div>

          <div className="space-y-4">
            {stats.topCategories.map((category) => {
              const IconComponent = categoryIcons[category.slug] || categoryIcons.default

              return (
                <div key={category.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <IconComponent className="h-4 w-4 text-muted-foreground" />
                      <span>{category.name}</span>
                    </div>
                    <span className="font-medium">{category.ideaCount}</span>
                  </div>
                  <div className="space-y-1">
                    <Progress value={category.percentage} className="h-1.5" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{category.percentage.toFixed(1)}% of total</span>
                      <span>{category.ideaCount} ideas</span>
                    </div>
                  </div>
                </div>
              )
            })}

            {stats.topCategories.length === 0 && (
              <div className="text-center py-4 text-sm text-muted-foreground">
                No ideas have been added yet.
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 