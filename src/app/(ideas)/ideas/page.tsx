"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { motion } from "framer-motion"
import { Search, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import dynamic from 'next/dynamic'
import { useIdeasStore } from "@/lib/store/use-ideas-store"
import { useDebounce } from "@/hooks/use-debounce"
import { useSearchParams } from "next/navigation"
import { HeroSection } from "./components/hero-section"
import { CategoryBrowser } from "./components/category-browser"
import { MobileCategoryBrowser } from "./components/mobile-category-browser"
import { CategoryStatistics } from "./components/category-statistics"
import { useIntersection } from "@/hooks/use-intersection"

const IdeaCard = dynamic(() => import("./components/idea-card"), { 
  loading: () => <IdeaSkeleton />,
  ssr: false
})

const CreateIdeaDialog = dynamic(() => import("./components/create-idea-dialog"), { 
  ssr: false 
})

function IdeaSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="h-6 w-3/4 bg-muted rounded animate-pulse" />
      <div className="space-y-2">
        <div className="h-4 w-full bg-muted rounded animate-pulse" />
        <div className="h-4 w-5/6 bg-muted rounded animate-pulse" />
        <div className="h-4 w-4/6 bg-muted rounded animate-pulse" />
      </div>
      <div className="flex justify-between items-center pt-2">
        <div className="h-8 w-20 bg-muted rounded animate-pulse" />
        <div className="h-8 w-24 bg-muted rounded animate-pulse" />
      </div>
    </div>
  )
}

const GRID_LAYOUTS = {
  sm: "grid-cols-1",
  md: "grid-cols-2",
  lg: "grid-cols-3",
  xl: "grid-cols-4"
} as const

const getSearchPlaceholder = () => {
  if (typeof window !== 'undefined') {
    return window.innerWidth < 640 ? "Search ideas..." : "Search for groundbreaking ideas..."
  }
  return "Search ideas..."
}

export default function GreatWallOfIdeas() {
  const { 
    ideas,
    isLoading, 
    isLoadingMore, 
    hasMore,
    sortType,
    selectedIdeaId,
    selectedCategoryId,
    selectedSubcategoryId,
    searchTerm,
    initialized,
    setSortType,
    setSelectedIdeaId,
    setSelectedCategoryId,
    setSelectedSubcategoryId,
    setSearchTerm,
    loadMore,
    resetIdeas,
    createIdea
  } = useIdeasStore()

  const loadMoreRef = useRef<HTMLDivElement>(null)
  const [searchPlaceholder, setSearchPlaceholder] = useState(getSearchPlaceholder())
  const searchParams = useSearchParams()
  const debouncedSearchTerm = useDebounce(searchTerm, 300)
  
  const isIntersecting = useIntersection(loadMoreRef, {
    threshold: 0.1,
    rootMargin: '100px'
  })

  const handleSharedIdea = useCallback(() => {
    const sharedIdeaId = searchParams.get('id')
    if (sharedIdeaId) {
      setSelectedIdeaId(sharedIdeaId)
    }
  }, [searchParams, setSelectedIdeaId])

  useEffect(() => {
    handleSharedIdea()
  }, [handleSharedIdea])

  const handleResize = useCallback(() => {
    setSearchPlaceholder(getSearchPlaceholder())
  }, [])

  useEffect(() => {
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [handleResize])

  const handleLoadMore = useCallback(() => {
    if (isIntersecting && hasMore && !isLoadingMore && !isLoading) {
      loadMore()
    }
  }, [isIntersecting, hasMore, isLoadingMore, isLoading, loadMore])

  useEffect(() => {
    handleLoadMore()
  }, [handleLoadMore])

  // Single effect to handle all filter changes and initialization
  // Tracks previous values to avoid unnecessary resets
  const prevFiltersRef = useRef({
    initialized: false,
    searchTerm: '',
    categoryId: null as string | null,
    subcategoryId: null as string | null
  })

  useEffect(() => {
    const prev = prevFiltersRef.current
    const filtersChanged = 
      prev.searchTerm !== debouncedSearchTerm ||
      prev.categoryId !== selectedCategoryId ||
      prev.subcategoryId !== selectedSubcategoryId

    // Reset on first load or when filters actually change
    if (!initialized || (initialized && filtersChanged)) {
      resetIdeas()
    }

    // Update refs for next comparison
    prevFiltersRef.current = {
      initialized,
      searchTerm: debouncedSearchTerm,
      categoryId: selectedCategoryId,
      subcategoryId: selectedSubcategoryId
    }
  }, [initialized, debouncedSearchTerm, selectedCategoryId, selectedSubcategoryId, resetIdeas])

  const handleIdeaSelection = useCallback((open: boolean) => {
    if (!open) setSelectedIdeaId(null)
  }, [setSelectedIdeaId])

  // Server already filters by category, subcategory, and search term via RPC
  // No need for redundant client-side filtering

  return (
    <motion.div 
      className="min-h-screen overflow-hidden font-sans"
      style={{ 
        backgroundColor: "hsl(var(--background))",
      }}
    >
      <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Add Hero Section */}
        <HeroSection />
        <div className="mb-6 sm:mb-8">
          <Label htmlFor="search" className="text-base lg:text-lg font-semibold block mb-2">
            Explore Innovations
          </Label>
          {/* Stack vertically on mobile, horizontal on desktop */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                id="search"
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-full text-sm sm:text-base"
              />
            </div>
            <div className="flex items-center justify-between sm:justify-start gap-2 sm:flex-shrink-0">
              <CreateIdeaDialog createIdea={createIdea} />
              <div className="block lg:hidden">
                <MobileCategoryBrowser
                  selectedCategoryId={selectedCategoryId}
                  selectedSubcategoryId={selectedSubcategoryId}
                  onCategorySelect={setSelectedCategoryId}
                  onSubcategorySelect={setSelectedSubcategoryId}
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Main content area with category browser */}
        <div className="grid grid-cols-1 lg:grid-cols-[250px_1fr] gap-6">
          {/* Category Browser and Statistics */}
          <div className="hidden lg:flex flex-col gap-2">
            <CategoryBrowser
              selectedCategoryId={selectedCategoryId}
              selectedSubcategoryId={selectedSubcategoryId}
              onCategorySelect={setSelectedCategoryId}
              onSubcategorySelect={setSelectedSubcategoryId}
            />
            <CategoryStatistics />
          </div>

          {/* Ideas Grid */}
          <div className="flex-1">
            <Tabs 
              defaultValue="all" 
              className="mb-6 sm:mb-8"
              value={sortType}
              onValueChange={(value) => setSortType(value as typeof sortType)}
            >
              <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-0 mb-4">
                <TabsTrigger 
                  value="all" 
                  className="px-2 sm:px-4 py-3 lg:py-2 bg-muted data-[state=active]:dark:bg-white data-[state=active]:dark:text-black data-[state=active]:bg-black data-[state=active]:text-white"
                >
                  All Ideas
                </TabsTrigger>
                <TabsTrigger 
                  value="trending" 
                  className="px-2 sm:px-4 py-3 lg:py-2 bg-muted data-[state=active]:dark:bg-white data-[state=active]:dark:text-black data-[state=active]:bg-black data-[state=active]:text-white"
                >
                  Trending
                </TabsTrigger>
                <TabsTrigger 
                  value="top" 
                  className="px-2 sm:px-4 py-3 lg:py-2 bg-muted data-[state=active]:dark:bg-white data-[state=active]:dark:text-black data-[state=active]:bg-black data-[state=active]:text-white"
                >
                  Top Rated
                </TabsTrigger>
                <TabsTrigger 
                  value="my_ideas" 
                  className="px-2 sm:px-4 py-3 lg:py-2 bg-muted data-[state=active]:dark:bg-white data-[state=active]:dark:text-black data-[state=active]:bg-black data-[state=active]:text-white"
                >
                  My Ideas
                </TabsTrigger>
              </TabsList>
              <TabsContent value="all" className="px-1">
                <p className="text-sm text-muted-foreground line-clamp-2 mt-10 lg:mt-2">
                  Discover all groundbreaking ideas from the Great Wall.
                </p>
              </TabsContent>
              <TabsContent value="trending" className="px-1">
                <p className="text-sm text-muted-foreground line-clamp-2 mt-10 lg:mt-2">
                  Ideas gaining momentum and capturing attention.
                </p>
              </TabsContent>
              <TabsContent value="top" className="px-1">
                <p className="text-sm text-muted-foreground line-clamp-2 mt-10 lg:mt-2">
                  The most supported and highly regarded ideas of all time.
                </p>
              </TabsContent>
              <TabsContent value="my_ideas" className="px-1">
                <p className="text-sm text-muted-foreground line-clamp-2 mt-10 lg:mt-2">
                  View and manage all your submitted ideas.
                </p>
              </TabsContent>
            </Tabs>
            
            {/* Scroll area */}
            <ScrollArea 
              className="h-[calc(100vh-10rem)] w-full rounded-lg border border-border shadow-xl" 
            >
              <div className="p-3 sm:p-4">
                {isLoading && (
                  <div className={`grid gap-3 sm:gap-4 ${GRID_LAYOUTS.sm} sm:${GRID_LAYOUTS.md} lg:${GRID_LAYOUTS.lg} xl:${GRID_LAYOUTS.xl}`}>
                    {Array.from({ length: 12 }).map((_, i) => (
                      <IdeaSkeleton key={i} />
                    ))}
                  </div>
                )}
                {!isLoading && !ideas.length && (
                  <div className="flex flex-col items-center justify-center min-h-[300px] sm:min-h-[400px] text-center px-4">
                    {debouncedSearchTerm ? (
                      <>
                        <div className="rounded-full bg-yellow-500/10 p-3 mb-8">
                          <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                            <Search className="w-6 h-6 text-yellow-500" />
                          </div>
                        </div>
                        <h3 className="text-2xl font-semibold text-foreground mb-3">
                          No Matches Found
                        </h3>
                        <p className="text-muted-foreground max-w-md mb-4">
                          No ideas match &ldquo;{debouncedSearchTerm}&rdquo;. Try adjusting your search terms or explore other categories.
                        </p>
                        <button
                          onClick={() => setSearchTerm("")}
                          className="text-primary hover:text-primary/80 font-medium"
                        >
                          Clear Search
                        </button>
                      </>
                    ) : sortType !== 'all' ? (
                      <>
                        <div className="rounded-full bg-blue-500/10 p-3 mb-8">
                          <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                            <Search className="w-6 h-6 text-blue-500" />
                          </div>
                        </div>
                        <h3 className="text-2xl font-semibold text-foreground mb-3">
                          No Ideas Found in {sortType === 'my_ideas' ? 'Your Ideas' : 
                                           sortType === 'trending' ? 'Trending' :
                                           'Top Rated'}
                        </h3>
                        <p className="text-muted-foreground max-w-md mb-8">
                          {sortType === 'my_ideas' ? 
                            "You haven't shared any ideas yet. Start innovating by creating your first idea!" :
                            sortType === 'trending' ?
                            "No trending ideas at the moment. Be the first to start a trend!" :
                            "No top-rated ideas yet. Share your innovative ideas and gather support!"}
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="rounded-full bg-primary/10 p-3 mb-8">
                          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                            <Search className="w-6 h-6 text-primary" />
                          </div>
                        </div>
                        <h3 className="text-2xl font-semibold text-foreground mb-3">
                          Be the First Innovator
                        </h3>
                        <p className="text-muted-foreground max-w-md mb-8">
                          Start a trend by sharing your groundbreaking idea. Your innovation could inspire others and spark meaningful change.
                        </p>
                        <div className="flex justify-center">
                          <div className="w-auto">
                            <CreateIdeaDialog createIdea={createIdea} />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
                
                {!isLoading && ideas.length > 0 && (
                  <div className={`grid gap-3 sm:gap-4 ${GRID_LAYOUTS.sm} sm:${GRID_LAYOUTS.md} lg:${GRID_LAYOUTS.lg} xl:${GRID_LAYOUTS.xl}`}>
                    {ideas.map((idea) => (
                      <div key={idea.id} data-idea-id={idea.id}>
                        <IdeaCard 
                          idea={idea}
                          isOpen={selectedIdeaId === idea.id}
                          onOpenChange={handleIdeaSelection}
                        />
                      </div>
                    ))}
                  </div>
                )}
                {(hasMore || isLoadingMore) && (
                  <div 
                    ref={loadMoreRef} 
                    className="py-6 text-center mt-4"
                    style={{ minHeight: '100px' }}
                  >
                    {isLoadingMore ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground">
                          Loading more ideas...
                        </span>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        Scroll to load more
                      </div>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
