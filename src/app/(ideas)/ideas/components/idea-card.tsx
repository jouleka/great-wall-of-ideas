"use client"

import React, { memo, useState, useEffect } from "react"
import { ChevronUp, ChevronDown, Award, Flame, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { Idea } from "@/lib/types/idea"
import { useIdeaIcon, useIdeaBadge } from "@/lib/utils/idea-utils"
import { toast } from "sonner"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils/utils"
import { voteService } from "@/lib/services/vote-service"
import { useRouter } from "next/navigation"
import { CommentSection } from "./comments/comment-section"

interface IdeaCardProps {
  idea: Idea
  onVote: (ideaId: string, voteType: "upvote" | "downvote") => Promise<void>
}

const IdeaCard = memo(({ idea, onVote }: IdeaCardProps) => {
  const { user } = useAuth()
  const router = useRouter()
  const [currentVote, setCurrentVote] = useState<'upvote' | 'downvote' | null>(null)
  const [voteCount, setVoteCount] = useState(idea.upvotes - idea.downvotes)
  const IconComponent = useIdeaIcon(idea.category)
  const ideaBadge = useIdeaBadge(idea.status)

  useEffect(() => {
    // Update vote count when idea props change
    setVoteCount(idea.upvotes - idea.downvotes)
  }, [idea.upvotes, idea.downvotes])

  useEffect(() => {
    // Get user's current vote when component mounts
    async function getCurrentVote() {
      if (!user) return
      const vote = await voteService.getCurrentVote(idea.id, user.id)
      setCurrentVote(vote)
    }
    getCurrentVote()
  }, [idea.id, user])

  const handleVote = async (voteType: 'upvote' | 'downvote') => {
    if (!user) {
      toast("Please sign in to vote", {
        action: {
          label: "Sign In",
          onClick: () => router.push('/auth?redirectTo=/ideas')
        }
      })
      return
    }

    try {
      // Optimistically update UI
      const newVote = currentVote === voteType ? null : voteType
      setCurrentVote(newVote)
      
      // Calculate and update vote count
      const voteChange = currentVote === voteType ? -1 : 
                        currentVote === null ? 1 : 
                        2 // switching from opposite vote
      setVoteCount(prev => prev + (voteType === 'upvote' ? voteChange : -voteChange))
      
      // Make API call
      await onVote(idea.id, voteType)
    } catch (error) {
      // Revert optimistic updates on error
      setCurrentVote(currentVote)
      setVoteCount(idea.upvotes - idea.downvotes)
      console.error('Error voting:', error)
    }
  }

  return (
    <Card className="flex flex-col justify-between w-full hover:shadow-lg transition-shadow duration-300 bg-card">
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between">
          <IconComponent className="w-5 h-5 text-primary" />
          {ideaBadge && (
            <Badge variant="secondary" className={`bg-${ideaBadge.variant}-100 text-${ideaBadge.variant}-800`}>
              {ideaBadge.text}
            </Badge>
          )}
        </div>
        <CardTitle className="text-lg font-semibold line-clamp-1">
          {idea.title}
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground flex items-center">
          <Award className="w-4 h-4 mr-1 text-blue-500" />
          {idea.company}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-card-foreground line-clamp-3">{idea.description}</p>
      </CardContent>
      <CardFooter className="flex justify-between items-center mt-auto pt-4">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              Explore Idea
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[900px] p-0 gap-0 overflow-hidden sm:h-[600px] h-[100dvh]">
            {/* Mobile View */}
            <div className="block sm:hidden h-full">
              <div className="flex flex-col h-full">
                {/* Idea Content */}
                <div className="p-6 border-b">
                  <DialogHeader>
                    <div className="flex items-center justify-between">
                      <DialogTitle className="flex items-center gap-2">
                        <IconComponent className="w-5 h-5 text-primary" />
                        {idea.title}
                      </DialogTitle>
                      <Badge variant="secondary" className={`bg-${ideaBadge?.variant}-100 text-${ideaBadge?.variant}-800`}>
                        {ideaBadge?.text}
                      </Badge>
                    </div>
                    <DialogDescription className="flex items-center gap-2 mt-2">
                      <Award className="w-4 h-4 text-blue-500" />
                      {idea.company}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="mt-4 space-y-4">
                    <p className="text-card-foreground leading-relaxed">{idea.description}</p>
                    
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="flex items-center">
                          <Flame className="w-4 h-4 mr-1 text-orange-500" />
                          {idea.upvotes - idea.downvotes} supports
                        </Badge>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <User className="w-4 h-4 mr-1" />
                          <span>{idea.author_name}</span>
                        </div>
                      </div>
                      <VoteButtons 
                        currentVote={currentVote}
                        voteCount={voteCount}
                        onUpvote={() => handleVote("upvote")}
                        onDownvote={() => handleVote("downvote")}
                      />
                    </div>
                  </div>
                </div>

                {/* Comments Section */}
                <div className="flex-1 overflow-hidden bg-muted/30">
                  <CommentSection ideaId={idea.id} />
                </div>
              </div>
            </div>

            {/* Desktop View */}
            <div className="hidden sm:grid grid-cols-5 h-full">
              <div className="col-span-3 p-6 overflow-y-auto border-r">
                <DialogHeader>
                  <div className="flex items-center justify-between">
                    <DialogTitle className="flex items-center gap-2 text-2xl">
                      <IconComponent className="w-6 h-6 text-primary" />
                      {idea.title}
                    </DialogTitle>
                    <Badge variant="secondary" className={`bg-${ideaBadge?.variant}-100 text-${ideaBadge?.variant}-800`}>
                      {ideaBadge?.text}
                    </Badge>
                  </div>
                  <DialogDescription className="flex items-center gap-2 mt-2">
                    <Award className="w-4 h-4 text-blue-500" />
                    {idea.company}
                  </DialogDescription>
                </DialogHeader>

                <div className="mt-6 space-y-6">
                  <div className="prose prose-sm dark:prose-invert">
                    <p className="text-card-foreground leading-relaxed">{idea.description}</p>
                  </div>

                  <div className="flex items-center justify-between pt-4">
                    <div className="flex items-center gap-4">
                      <Badge variant="secondary" className="flex items-center">
                        <Flame className="w-4 h-4 mr-1 text-orange-500" />
                        {idea.upvotes - idea.downvotes} supports
                      </Badge>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <User className="w-4 h-4 mr-2" />
                        <span>{idea.author_name}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleVote("upvote")}
                              className={cn(currentVote === 'upvote' && "bg-green-100")}
                            >
                              <ChevronUp className={cn(
                                "h-4 w-4",
                                currentVote === 'upvote' ? "text-green-600" : "text-green-500"
                              )} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Support this idea</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <span className="font-semibold text-card-foreground">{voteCount}</span>
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleVote("downvote")}
                              className={cn(currentVote === 'downvote' && "bg-red-100")}
                            >
                              <ChevronDown className={cn(
                                "h-4 w-4",
                                currentVote === 'downvote' ? "text-red-600" : "text-red-500"
                              )} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Withdraw support</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comments Section - Takes up 2/5 of the space */}
              <div className="col-span-2 bg-muted/30">
                <CommentSection ideaId={idea.id} />
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <div className="flex items-center space-x-2">
          <VoteButtons 
            currentVote={currentVote}
            voteCount={voteCount}
            onUpvote={() => handleVote("upvote")}
            onDownvote={() => handleVote("downvote")}
          />
        </div>
      </CardFooter>
    </Card>
  )
})

// Extract VoteButtons to a reusable component
interface VoteButtonsProps {
  currentVote: 'upvote' | 'downvote' | null
  voteCount: number
  onUpvote: () => void
  onDownvote: () => void
}

function VoteButtons({ currentVote, voteCount, onUpvote, onDownvote }: VoteButtonsProps) {
  return (
    <div className="flex items-center space-x-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onUpvote}
              className={cn(currentVote === 'upvote' && "bg-green-100")}
            >
              <ChevronUp className={cn(
                "h-4 w-4",
                currentVote === 'upvote' ? "text-green-600" : "text-green-500"
              )} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Support this idea</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      <span className="font-semibold text-card-foreground">{voteCount}</span>
      
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onDownvote}
              className={cn(currentVote === 'downvote' && "bg-red-100")}
            >
              <ChevronDown className={cn(
                "h-4 w-4",
                currentVote === 'downvote' ? "text-red-600" : "text-red-500"
              )} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Withdraw support</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}

IdeaCard.displayName = 'IdeaCard'

export { IdeaCard }
