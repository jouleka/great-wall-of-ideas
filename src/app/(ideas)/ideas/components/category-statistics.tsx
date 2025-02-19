import { useEffect, useMemo, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { categoryIcons } from "@/lib/utils/idea-utils"
import { Skeleton } from "@/components/ui/skeleton"
import { useCategoriesStore } from "@/lib/store/use-categories-store"

export function CategoryStatistics() {
  const stats = useCategoriesStore(useCallback(state => state.stats, []))
  const isLoading = useCategoriesStore(useCallback(state => state.isLoading, []))
  const initialize = useCategoriesStore(useCallback(state => state.initialize, []))
  const subscribeToChanges = useCategoriesStore(useCallback(state => state.subscribeToChanges, []))

  useEffect(() => {
    let cleanup: (() => void) | undefined
    
    const init = async () => {
      await initialize()
      cleanup = subscribeToChanges()
    }
    
    init()
    return () => cleanup?.()
  }, [initialize, subscribeToChanges])

  const skeletonContent = useMemo(() => (
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
  ), [])

  if (isLoading) {
    return skeletonContent
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
          <div className="space-y-2">
            {stats.topCategories.map((category) => {
              const IconComponent = categoryIcons[category.slug] || categoryIcons.default
              return (
                <div key={category.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <IconComponent className="h-4 w-4" />
                      <span>{category.name}</span>
                    </div>
                    <span className="text-muted-foreground">{category.ideaCount}</span>
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