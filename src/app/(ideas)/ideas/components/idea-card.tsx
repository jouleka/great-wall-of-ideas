"use client"

import React, { memo, useState, useEffect } from "react"
import { ChevronUp, ChevronDown, Award, Flame, User, X } from "lucide-react"
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
import { ScrollArea } from "@/components/ui/scroll-area"

interface IdeaCardProps {
  idea: Idea
  onVote: (ideaId: string, voteType: "upvote" | "downvote") => Promise<void>
}

// URL formatting function
function formatTextWithLinks(text: string) {
  const parts = text.split(/(\bhttps?:\/\/\S+\b)/gi);
  
  return parts.map((part, i) => {
    if (part.match(/^https?:\/\//i)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:text-blue-600 hover:underline cursor-pointer inline-flex items-center gap-1"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            window.open(part, '_blank');
          }}
        >
          {part}
          <svg
            className="h-3 w-3 inline-block flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

const IdeaCard = memo(({ idea, onVote }: IdeaCardProps) => {
  const { user } = useAuth()
  const router = useRouter()
  const [currentVote, setCurrentVote] = useState<'upvote' | 'downvote' | null>(null)
  const [voteCount, setVoteCount] = useState(idea.upvotes - idea.downvotes)
  const IconComponent = useIdeaIcon(idea.category)
  const ideaBadge = useIdeaBadge(idea.status)
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

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
        <p className="text-sm text-card-foreground line-clamp-3">
          {formatTextWithLinks(idea.description)}
        </p>
      </CardContent>
      <CardFooter className="flex justify-between items-center mt-auto pt-4">
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open)
          setIsDescriptionExpanded(false)
        }}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              Explore Idea
            </Button>
          </DialogTrigger>
          <DialogContent className="flex flex-col sm:max-w-[900px] p-0 gap-0 h-screen sm:h-[90vh] w-full max-w-full overflow-hidden">
            {/* Mobile View */}
            <div className="block sm:hidden h-full flex-col">
              {/* Fixed Header */}
              <div className="p-4 border-b bg-background/95 sticky top-0 z-10">
                <DialogHeader>
                  <div className="flex items-center justify-between">
                    <DialogTitle className="flex items-center gap-2 max-w-[80%]">
                      <IconComponent className="w-5 h-5 text-primary flex-shrink-0" />
                      <span className="line-clamp-1 text-base">{idea.title}</span>
                    </DialogTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className={`bg-${ideaBadge?.variant}-100 text-${ideaBadge?.variant}-800 text-xs`}>
                        {ideaBadge?.text}
                      </Badge>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <X className="h-4 w-4" />
                          <span className="sr-only">Close</span>
                        </Button>
                      </DialogTrigger>
                    </div>
                  </div>
                  <DialogDescription className="flex items-center gap-2 mt-2 text-sm">
                    <Award className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    {idea.company}
                  </DialogDescription>
                </DialogHeader>
              </div>

              {/* Update ScrollArea wrapper */}
              <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="p-4">
                    <div className="space-y-4">
                      {/* Description Section */}
                      <div className="prose prose-sm dark:prose-invert max-w-full">
                        <div className="relative">
                          <p 
                            className={cn(
                              "text-card-foreground leading-relaxed break-words",
                              !isDescriptionExpanded && "line-clamp-4"
                            )}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {formatTextWithLinks(idea.description)}
                          </p>
                          {idea.description.length > 300 && (
                            <Button
                              variant="link"
                              className="px-0 h-auto font-medium text-primary mt-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsDescriptionExpanded(!isDescriptionExpanded);
                              }}
                            >
                              {isDescriptionExpanded ? "Show less" : "Read more"}
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Metadata and Actions */}
                      <div className="flex items-center justify-between pt-4 border-t">
                        <div className="flex flex-col gap-2">
                          <Badge variant="secondary" className="flex items-center w-fit">
                            <Flame className="w-4 h-4 mr-1 text-orange-500" />
                            {idea.upvotes - idea.downvotes} supports
                          </Badge>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <User className="w-4 h-4 mr-1 flex-shrink-0" />
                            <span className="truncate">{idea.author_name}</span>
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
                  <div className="border-t pb-20">
                    <CommentSection ideaId={idea.id} />
                  </div>
                </ScrollArea>
              </div>
            </div>

            {/* Desktop View */}
            <div className="hidden sm:grid grid-cols-5 h-full overflow-hidden">
              {/* Left Panel - Idea Details */}
              <div className="col-span-3 flex flex-col h-full overflow-hidden">
                {/* Fixed Header */}
                <div className="p-6 border-b bg-background/95 sticky top-0 z-10">
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
                </div>

                {/* Scrollable Content */}
                <ScrollArea className="flex-1 h-full">
                  <div className="p-6 h-full">
                    <div className="space-y-6">
                      {/* Description Section */}
                      <div className="prose prose-sm dark:prose-invert max-w-full">
                        <div className="relative">
                          <p className="text-card-foreground leading-relaxed break-words">
                            {idea.description.length > 300 ? (
                              <>
                                <span className={cn(
                                  "block transition-all duration-300 whitespace-pre-wrap break-words",
                                  !isDescriptionExpanded && "line-clamp-6"
                                )}>
                                  {formatTextWithLinks(idea.description)}
                                </span>
                                <Button
                                  variant="link"
                                  className="px-0 h-auto font-medium text-primary mt-2"
                                  onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                                >
                                  {isDescriptionExpanded ? "Show less" : "Read more"}
                                </Button>
                              </>
                            ) : (
                              <span className="whitespace-pre-wrap break-words">
                                {formatTextWithLinks(idea.description)}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Metadata and Actions */}
                      <div className="flex items-center justify-between py-4 border-t space-y-4">
                        <div className="flex flex-col gap-3">
                          <Badge variant="secondary" className="flex items-center w-fit text-base">
                            <Flame className="w-5 h-5 mr-2 text-orange-500" />
                            {idea.upvotes - idea.downvotes} supports
                          </Badge>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <User className="w-4 h-4 mr-2 flex-shrink-0" />
                            <span className="truncate">{idea.author_name}</span>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <VoteButtons 
                            currentVote={currentVote}
                            voteCount={voteCount}
                            onUpvote={() => handleVote("upvote")}
                            onDownvote={() => handleVote("downvote")}
                            size="lg"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </div>

              {/* Right Panel - Comments */}
              <div className="col-span-2 border-l h-full overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="pb-20">
                    <CommentSection ideaId={idea.id} />
                  </div>
                </ScrollArea>
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
  size?: 'default' | 'lg'
}

function VoteButtons({ currentVote, voteCount, onUpvote, onDownvote, size = 'default' }: VoteButtonsProps) {
  const iconSize = size === 'lg' ? "h-5 w-5" : "h-4 w-4"
  const buttonSize = size === 'lg' ? "h-10 w-10" : "h-8 w-8"
  const textSize = size === 'lg' ? "text-lg" : "text-base"

  return (
    <div className="flex items-center space-x-3">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onUpvote}
              className={cn(
                buttonSize,
                currentVote === 'upvote' && "bg-green-100"
              )}
            >
              <ChevronUp className={cn(
                iconSize,
                currentVote === 'upvote' ? "text-green-600" : "text-green-500"
              )} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Support this idea</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      <span className={cn("font-semibold text-card-foreground", textSize)}>
        {voteCount}
      </span>
      
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onDownvote}
              className={cn(
                buttonSize,
                currentVote === 'downvote' && "bg-red-100"
              )}
            >
              <ChevronDown className={cn(
                iconSize,
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
