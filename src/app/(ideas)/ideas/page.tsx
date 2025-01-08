"use client"

import { useState, useRef, useMemo, useCallback, useEffect } from "react"
import { motion } from "framer-motion"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import dynamic from 'next/dynamic'
import { useIdeas } from "@/hooks/use-ideas"
import { Idea } from "@/lib/types/idea"
import { useDebounce } from "@/hooks/use-debounce"
import { useSearchParams } from "next/navigation"

// Dynamically import heavy components
const IdeaCard = dynamic(() => import("./components/idea-card").then(mod => mod.IdeaCard), { 
  ssr: false,
  loading: () => <div className="h-[300px] animate-pulse bg-muted rounded-lg" />
})

const CreateIdeaDialog = dynamic(() => import("./components/create-idea-dialog").then(mod => mod.CreateIdeaDialog), { 
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

// Add this utility function at the top of the file
const GRID_LAYOUTS = {
  sm: "grid-cols-1",
  md: "grid-cols-2",
  lg: "grid-cols-3",
  xl: "grid-cols-4"
} as const

// Add this utility function for dynamic placeholder text
const getSearchPlaceholder = () => {
  // Check if we're in a browser environment
  if (typeof window !== 'undefined') {
    return window.innerWidth < 640 ? "Search ideas..." : "Search for groundbreaking ideas..."
  }
  return "Search ideas..." // Default for SSR
}

export default function GreatWallOfIdeas() {
  const { 
    isLoading, 
    isLoadingMore, 
    ideas, 
    handleVote, 
    createIdea, 
    loadMore, 
    hasMore, 
    resetIdeas,
    sortType,
    setSortType 
  } = useIdeas()
  const [searchTerm, setSearchTerm] = useState("")
  const debouncedSearchTerm = useDebounce(searchTerm, 300)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [searchPlaceholder, setSearchPlaceholder] = useState(getSearchPlaceholder())
  const searchParams = useSearchParams()
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | null>(null)

  // Handle shared idea URLs
  useEffect(() => {
    const sharedIdeaId = searchParams.get('id')
    if (sharedIdeaId) {
      setSelectedIdeaId(sharedIdeaId)
    }
  }, [searchParams])

  // Add effect to update placeholder on resize
  useEffect(() => {
    const handleResize = () => {
      setSearchPlaceholder(getSearchPlaceholder())
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const filteredIdeas = useMemo(() => {
    if (!debouncedSearchTerm) return ideas
    
    const searchLower = debouncedSearchTerm.toLowerCase()
    return ideas.filter(idea =>
      idea.title.toLowerCase().includes(searchLower) ||
      idea.description.toLowerCase().includes(searchLower) ||
      idea.target_audience.toLowerCase().includes(searchLower)
    )
  }, [ideas, debouncedSearchTerm])

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    if (!hasMore || isLoadingMore) return
    
    const { scrollTop, clientHeight, scrollHeight } = event.currentTarget
    if (scrollHeight - scrollTop <= clientHeight * 1.5) {
      loadMore()
    }
  }, [hasMore, isLoadingMore, loadMore])

  useEffect(() => {
    resetIdeas()
    return () => resetIdeas()
  }, [resetIdeas])

  const handleCreateIdea = useCallback(async (newIdea: Omit<Idea, "id" | "created_at" | "updated_at" | "upvotes" | "downvotes" | "views">) => {
    await createIdea(newIdea)
  }, [createIdea])

  return (
    <motion.div 
      className="min-h-screen overflow-hidden font-sans"
      style={{ 
        backgroundColor: "hsl(var(--background))",
      }}
    >
      <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Improved search and create layout - always single row */}
        <div className="mb-6 sm:mb-8">
          <Label htmlFor="search" className="text-base lg:text-lg font-semibold block mb-2">
            Explore Innovations
          </Label>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 min-w-0">
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
            <div className="flex-shrink-0">
              <CreateIdeaDialog createIdea={handleCreateIdea} />
            </div>
          </div>
        </div>
        
        {/* Improved tabs layout */}
        <Tabs 
          defaultValue="all" 
          className="mb-6 sm:mb-8"
          value={sortType}
          onValueChange={(value) => setSortType(value as typeof sortType)}
        >
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 mb-4 lg:gap-0 gap-2">
            <TabsTrigger value="all" className="px-2 sm:px-4 bg-muted">All Ideas</TabsTrigger>
            <TabsTrigger value="trending" className="px-2 sm:px-4 bg-muted">Trending</TabsTrigger>
            <TabsTrigger value="top" className="px-2 sm:px-4 bg-muted">Top Rated</TabsTrigger>
            <TabsTrigger value="my_ideas" className="px-2 sm:px-4 bg-muted">My Ideas</TabsTrigger>
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
        
        {/* Improved scroll area */}
        <ScrollArea 
          ref={scrollRef}
          className="h-[calc(100vh-16rem)] sm:h-[calc(100vh-20rem)] w-full rounded-lg border border-border shadow-xl" 
          onScrollCapture={handleScroll}
        >
          <div className="p-3 sm:p-4">
            {isLoading && (
              <div className={`grid gap-3 sm:gap-4 ${GRID_LAYOUTS.sm} sm:${GRID_LAYOUTS.md} lg:${GRID_LAYOUTS.lg} xl:${GRID_LAYOUTS.xl}`}>
                {Array.from({ length: 12 }).map((_, i) => (
                  <IdeaSkeleton key={i} />
                ))}
              </div>
            )}
            
            {/* Empty states remain mostly the same, just adjust some spacing */}
            {!isLoading && !filteredIdeas.length && (
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
                        <CreateIdeaDialog createIdea={handleCreateIdea} />
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
            
            {!isLoading && filteredIdeas.length > 0 && (
              <div className={`grid gap-3 sm:gap-4 ${GRID_LAYOUTS.sm} sm:${GRID_LAYOUTS.md} lg:${GRID_LAYOUTS.lg} xl:${GRID_LAYOUTS.xl}`}>
                {filteredIdeas.map((idea) => (
                  <div key={idea.id} data-idea-id={idea.id}>
                    <IdeaCard 
                      idea={idea} 
                      onVote={handleVote} 
                      isOpen={selectedIdeaId === idea.id}
                      onOpenChange={(open) => {
                        if (!open) setSelectedIdeaId(null)
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
            
            {isLoadingMore && hasMore && (
              <div className={`grid gap-3 sm:gap-4 mt-4 ${GRID_LAYOUTS.sm} sm:${GRID_LAYOUTS.md} lg:${GRID_LAYOUTS.lg} xl:${GRID_LAYOUTS.xl}`}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <IdeaSkeleton key={`more-${i}`} />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </motion.div>
  )
}
