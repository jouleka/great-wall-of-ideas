"use client"

import { useState, useRef, useMemo, useCallback, useEffect } from "react"
import { motion, useScroll } from "framer-motion"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import dynamic from 'next/dynamic'
import { useIdeas } from "@/hooks/use-ideas"
import { Idea } from "@/lib/types/idea"
import { useDebounce } from "@/hooks/use-debounce"
import { UserProfile } from "@/components/layout/user-profile"

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
  const { scrollYProgress } = useScroll()

  const filteredIdeas = useMemo(() => {
    if (!debouncedSearchTerm) return ideas
    
    const searchLower = debouncedSearchTerm.toLowerCase()
    return ideas.filter(idea =>
      idea.title.toLowerCase().includes(searchLower) ||
      idea.description.toLowerCase().includes(searchLower) ||
      idea.company.toLowerCase().includes(searchLower)
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
        opacity: scrollYProgress 
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-foreground">
            The Great Wall of Ideas
          </h1>
          <UserProfile />
        </div>
        
        <div className="mb-8 flex items-center space-x-4">
          <div className="flex-grow">
            <Label htmlFor="search" className="text-lg font-semibold block mb-2">Explore Innovations</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                id="search"
                type="text"
                placeholder="Search for groundbreaking ideas..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full"
              />
            </div>
          </div>
          <div className="flex-shrink-0">
            <Label className="text-lg font-semibold block mb-2 opacity-0">Create</Label>
            <CreateIdeaDialog createIdea={handleCreateIdea} />
          </div>
        </div>
        
        <Tabs 
          defaultValue="all" 
          className="mb-8"
          value={sortType}
          onValueChange={(value) => setSortType(value as typeof sortType)}
        >
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 mb-4">
            <TabsTrigger value="all">All Ideas</TabsTrigger>
            <TabsTrigger value="trending">Trending</TabsTrigger>
            <TabsTrigger value="new">Newest</TabsTrigger>
            <TabsTrigger value="top">Top Rated</TabsTrigger>
          </TabsList>
          <TabsContent value="all">
            <p className="text-sm text-muted-foreground">Discover all groundbreaking ideas from the Great Wall.</p>
          </TabsContent>
          <TabsContent value="trending">
            <p className="text-sm text-muted-foreground">Ideas gaining momentum and capturing attention in the last 7 days.</p>
          </TabsContent>
          <TabsContent value="new">
            <p className="text-sm text-muted-foreground">Fresh, innovative ideas recently added to the Wall.</p>
          </TabsContent>
          <TabsContent value="top">
            <p className="text-sm text-muted-foreground">The most supported and highly regarded ideas of all time.</p>
          </TabsContent>
        </Tabs>
        
        <ScrollArea 
          ref={scrollRef}
          className="h-[calc(100vh-24rem)] w-full rounded-lg border border-border shadow-xl scroll-area" 
          onScrollCapture={handleScroll}
        >
          <div className="relative w-full p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {isLoading ? (
                // Show 12 skeleton cards while loading
                Array.from({ length: 12 }).map((_, i) => (
                  <IdeaSkeleton key={i} />
                ))
              ) : (
                filteredIdeas.map((idea) => (
                  <IdeaCard key={idea.id} idea={idea} onVote={handleVote} />
                ))
              )}
            </div>
            {isLoadingMore && hasMore && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
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
