"use client"

import { useState, useRef, useMemo, useCallback } from "react"
import { motion } from "framer-motion"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import dynamic from 'next/dynamic'
import { useIdeas } from "@/hooks/use-ideas"
import { useAuth } from "@/hooks/use-auth"
import { Idea } from "@/lib/types/idea"
import { useDebounce } from "@/hooks/use-debounce"
import { UserProfile } from "@/components/layout/user-profile"

const IdeaCard = dynamic(() => import("./components/idea-card").then(mod => mod.IdeaCard), { ssr: false })
const CreateIdeaDialog = dynamic(() => import("./components/create-idea-dialog").then(mod => mod.CreateIdeaDialog), { ssr: false })

export default function GreatWallOfIdeas() {
  const { isLoading } = useAuth()
  const [searchTerm, setSearchTerm] = useState("")
  const debouncedSearchTerm = useDebounce(searchTerm, 300)
  const { ideas, handleVote, createIdea, loadMore, hasMore } = useIdeas()
  const wallRef = useRef<HTMLDivElement>(null)

  const filteredIdeas = useMemo(() => {
    return ideas.filter(idea =>
      idea.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      idea.description.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      idea.company.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    )
  }, [ideas, debouncedSearchTerm])

  const handleCreateIdea = useCallback(async (newIdea: Omit<Idea, "id" | "created_at" | "updated_at" | "upvotes" | "downvotes" | "views">) => {
    await createIdea(newIdea)
  }, [createIdea])

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = event.currentTarget
    if (scrollHeight - scrollTop === clientHeight && hasMore) {
      loadMore()
    }
  }, [hasMore, loadMore])

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
      <motion.div 
        className="min-h-screen overflow-hidden font-sans transition-colors duration-300"
        style={{ 
          "--scroll-y": "0",
          backgroundColor: "hsl(var(--background))",
        } as React.CSSProperties}
        onScroll={(e) => {
          const target = e.target as HTMLDivElement
          const scrollFraction = target.scrollTop / (target.scrollHeight - target.clientHeight)
          document.documentElement.style.setProperty('--scroll-y', scrollFraction.toString())
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
          
          <Tabs defaultValue="all" className="mb-8">
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
              <p className="text-sm text-muted-foreground">Ideas gaining momentum and capturing attention right now.</p>
            </TabsContent>
            <TabsContent value="new">
              <p className="text-sm text-muted-foreground">Fresh, innovative ideas recently added to the Wall.</p>
            </TabsContent>
            <TabsContent value="top">
              <p className="text-sm text-muted-foreground">The most supported and highly regarded ideas of all time.</p>
            </TabsContent>
          </Tabs>
          
          <ScrollArea className="h-[calc(100vh-24rem)] w-full rounded-lg border border-border shadow-xl" onScroll={handleScroll}>
            <div ref={wallRef} className="relative w-full p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredIdeas.map((idea) => (
                  <IdeaCard key={idea.id} idea={idea} onVote={handleVote} />
                ))}
              </div>
              {hasMore && <div className="text-center mt-4">Loading more ideas...</div>}
            </div>
          </ScrollArea>
        </div>
      </motion.div>
  )
}