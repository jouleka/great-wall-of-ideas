"use client"

import React, { useCallback, memo, useState, useEffect } from "react"
import { ChevronUp, ChevronDown, Award, Flame, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { Idea } from "@/lib/types/idea"
import { useIdeaIcon, useIdeaBadge } from "@/lib/utils/idea-utils"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils/utils"
import { voteService } from "@/lib/services/vote-service"

interface IdeaCardProps {
  idea: Idea
  onVote: (ideaId: string, voteType: "upvote" | "downvote") => Promise<void>
}

const IdeaCard = memo(({ idea, onVote }: IdeaCardProps) => {
  const { toast } = useToast()
  const { user } = useAuth()
  const IconComponent = useIdeaIcon(idea)
  const ideaBadge = useIdeaBadge(idea)
  const [voteCount, setVoteCount] = useState(idea.upvotes - idea.downvotes)
  const [currentVote, setCurrentVote] = useState<'upvote' | 'downvote' | null>(null)

  // Load current user's vote when component mounts
  useEffect(() => {
    async function loadCurrentVote() {
      if (!user) return
      const vote = await voteService.getCurrentVote(idea.id, user.id)
      setCurrentVote(vote)
    }
    loadCurrentVote()
  }, [idea.id, user])

  const handleVote = useCallback(async (voteType: "upvote" | "downvote") => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to vote.",
        variant: "destructive"
      })
      return
    }

    const result = await voteService.addVote({
      idea_id: idea.id,
      user_id: user.id,
      vote_type: voteType
    })

    if (result.success) {
      // Update local state based on action
      if (result.action === 'removed') {
        setVoteCount(prev => prev + (currentVote === 'upvote' ? -1 : 1))
        setCurrentVote(null)
      } else if (result.action === 'updated') {
        setVoteCount(prev => prev + (voteType === 'upvote' ? 2 : -2))
        setCurrentVote(voteType)
      } else {
        setVoteCount(prev => prev + (voteType === 'upvote' ? 1 : -1))
        setCurrentVote(voteType)
      }

      // Notify parent component about the vote change
      await onVote(idea.id, voteType)
    }
  }, [user, idea.id, currentVote, toast, onVote])

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
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <IconComponent className="w-5 h-5 text-primary" />
                {idea.title}
              </DialogTitle>
              <DialogDescription>{idea.company}</DialogDescription>
            </DialogHeader>
            <p className="text-card-foreground mt-2">{idea.description}</p>
            <div className="flex justify-between items-center mt-4">
              <Badge variant="secondary" className="flex items-center">
                <Flame className="w-4 h-4 mr-1 text-orange-500" />
                {idea.upvotes - idea.downvotes} supports
              </Badge>
              <div className="flex items-center">
                <User className="w-4 h-4 mr-2" />
                <span>{idea.author_name}</span>
              </div>
            </div>
          </DialogContent>
        </Dialog>
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
      </CardFooter>
    </Card>
  )
})

IdeaCard.displayName = 'IdeaCard'

export { IdeaCard }
