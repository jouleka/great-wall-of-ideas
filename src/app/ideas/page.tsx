"use client"

import { useState, useRef, useEffect } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import { Zap } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { IdeaCard } from "./components/idea-card"
import { useIdeas } from "./hooks/use-ideas"
import { useAuth } from "@/app/auth/hooks/use-auth"

export default function GreatWallOfIdeas() {
  const { user, isLoading } = useAuth()
  const viewCreatedRef = useRef(false)

  const setNewView = async () => {
    // Check if a view has been created in this session
    const sessionViewCreated = sessionStorage.getItem('viewCreated')
    
    if (sessionViewCreated || viewCreatedRef.current) {
      console.log('View already created in this session')
      return
    }

    // Set the ref to true immediately to prevent concurrent calls
    viewCreatedRef.current = true

    try {
      const sessionId = sessionStorage.getItem('sessionId') || crypto.randomUUID()
      sessionStorage.setItem('sessionId', sessionId)

      const response = await fetch('/api/views', { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId })
      })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to insert view')
      }

      console.log('View inserted successfully:', result.data)
      
      // Set sessionStorage flag
      sessionStorage.setItem('viewCreated', 'true')
    } catch (err) {
      console.error('Error inserting view:', err)
      // Reset the ref if there's an error, allowing for retry
      viewCreatedRef.current = false
    }
  }

  useEffect(() => {
    setNewView()
  }, [])

  const [searchTerm, setSearchTerm] = useState("")
  const { ideas, handleVote } = useIdeas()
  const wallRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: wallRef,
    offset: ["start start", "end start"]
  })

  const backgroundColor = useTransform(
    scrollYProgress,
    [0, 1],
    ["hsl(var(--background))", "hsl(var(--muted))"]
  )

  const filteredIdeas = ideas.filter(idea =>
    idea.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    idea.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    idea.company.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <motion.div style={{ backgroundColor }} className="min-h-screen overflow-hidden font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-center mb-8 text-foreground">
          The Great Wall of Ideas
        </h1>
        <div className="mb-8 space-y-4">
          <Label htmlFor="search" className="text-lg font-semibold block">Search the Wall</Label>
          <div className="relative">
            <Zap className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              id="search"
              type="text"
              placeholder="Search for ideas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full"
            />
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
            <p className="text-sm text-muted-foreground">Showing all groundbreaking ideas from the Great Wall.</p>
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
        <ScrollArea className="h-[calc(100vh-24rem)] w-full rounded-lg border border-border shadow-xl">
          <div ref={wallRef} className="relative w-full p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredIdeas.map((idea) => (
                <IdeaCard key={idea.id} idea={idea} ideas={ideas} onVote={handleVote} />
              ))}
            </div>
          </div>
        </ScrollArea>
      </div>
    </motion.div>
  )
}
