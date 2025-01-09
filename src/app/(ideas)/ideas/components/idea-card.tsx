"use client"

import React, { memo, useState, useEffect, useCallback } from "react"
import { Award, User, X, Trash2, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
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
import { VoteIndicator } from "./vote-indicator"
import { VoteButtons } from "./vote-buttons"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { Database } from "@/lib/types/database"
import DOMPurify from 'isomorphic-dompurify'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ShareButton } from "./share-button"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"

interface IdeaCardProps {
  idea: Idea
  onVote: (ideaId: string, voteType: "upvote" | "downvote") => Promise<void>
  size?: 'default' | 'lg'
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
  onDelete?: (ideaId: string) => Promise<boolean>
}

const editorStyles = `
  .idea-content {
    line-height: 1.5;
    overflow-wrap: break-word;
    word-wrap: break-word;
    word-break: break-word;
    hyphens: auto;
  }
  
  .idea-content > * + * {
    margin-top: 0.75em;
  }

  .idea-content ul,
  .idea-content ol {
    padding-left: 1.5rem;
    margin: 0.5rem 0;
  }

  .idea-content ul {
    list-style-type: disc;
  }

  .idea-content ol {
    list-style-type: decimal;
  }

  .idea-content blockquote {
    border-left: 3px solid #e5e7eb;
    padding-left: 1rem;
    margin: 1rem 0;
    font-style: italic;
  }

  .idea-content a {
    color: hsl(var(--primary));
    text-decoration: underline;
    text-underline-offset: 4px;
  }

  .idea-content a:hover {
    opacity: 0.8;
  }

  .idea-content p {
    margin: 0.5rem 0;
    overflow-wrap: break-word;
    word-wrap: break-word;
    word-break: break-word;
    hyphens: auto;
    max-width: 100%;
  }
`

function formatTextWithLinks(html: string) {
  // Sanitize the HTML first
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'blockquote'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  })

  // Return the sanitized HTML wrapped in a div with styles
  return (
    <>
      <style>{editorStyles}</style>
      <div 
        className="idea-content"
        dangerouslySetInnerHTML={{ __html: clean }} 
      />
    </>
  )
}

const IdeaCard = memo(({ 
  idea: initialIdea, 
  onVote, 
  size = 'default',
  isOpen,
  onOpenChange,
  onDelete
}: IdeaCardProps) => {
  const { user } = useAuth()
  const router = useRouter()
  const [currentVote, setCurrentVote] = useState<'upvote' | 'downvote' | null>(null)
  const [idea, setIdea] = useState(initialIdea)
  const IconComponent = useIdeaIcon(idea.category)
  const ideaBadge = useIdeaBadge(idea.status)
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isTitleExpanded, setIsTitleExpanded] = useState(false)

  const supabase = createClientComponentClient<Database>()

  // Sync controlled state
  useEffect(() => {
    if (isOpen !== undefined) {
      setIsDialogOpen(isOpen)
    }
  }, [isOpen])

  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open)
    onOpenChange?.(open)
  }

  const handleExploreClick = useCallback(async () => {
    try {
      const { error } = await supabase.rpc('increment_idea_views', {
        idea_id_input: idea.id
      })

      if (error) {
        console.error('Error incrementing views:', error)
        return
      }

      // Update local state with new view count
      setIdea(prev => ({
        ...prev,
        views: (prev.views || 0) + 1
      }))

    } catch (error) {
      console.error('Error in handleExploreClick:', error)
    }
  }, [idea.id, supabase])

  // Reset idea state when initialIdea changes
  useEffect(() => {
    setIdea(initialIdea)
  }, [initialIdea])

  useEffect(() => {
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
        },
        className: "dark:bg-zinc-800 dark:text-zinc-200",
        descriptionClassName: "dark:text-zinc-400"
      })
      return
    }

    try {
      const isRemovingVote = currentVote === voteType
      const isChangingVote = currentVote && currentVote !== voteType

      let newUpvotes = idea.upvotes
      let newDownvotes = idea.downvotes

      if (voteType === 'upvote') {
        if (isRemovingVote) {
          newUpvotes--
        } else {
          newUpvotes++
          if (isChangingVote) newDownvotes--
        }
      } else {
        if (isRemovingVote) {
          newDownvotes--
        } else {
          newDownvotes++
          if (isChangingVote) newUpvotes--
        }
      }

      const newVote = isRemovingVote ? null : voteType
      setCurrentVote(newVote)
      setIdea(prev => ({
        ...prev,
        upvotes: newUpvotes,
        downvotes: newDownvotes
      }))
      
      await onVote(idea.id, voteType)
    } catch (error) {
      setCurrentVote(currentVote)
      setIdea(initialIdea)
      console.error('Error voting:', error)
    }
  }

  const DeleteButton = () => (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            size === 'lg' ? 'h-8 w-8' : 'h-6 w-6',
            "text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
          )}
        >
          <Trash2 className={size === 'lg' ? 'h-4 w-4' : 'h-3 w-3'} />
          <span className="sr-only">Delete idea</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete your idea and all its associated data.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={async () => {
              const success = await onDelete?.(idea.id)
              if (success && isDialogOpen) {
                setIsDialogOpen(false)
              }
            }}
            className="bg-red-500 hover:bg-red-600 text-white"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )

  return (
    <Card className="flex flex-col justify-between w-full hover:shadow-lg transition-shadow duration-300 bg-card">
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between">
          <IconComponent className="w-5 h-5 text-primary" />
          <div className="flex items-center gap-2">
            {ideaBadge && (
              <Badge variant="secondary" className={`bg-${ideaBadge.variant}-100 text-${ideaBadge.variant}-800`}>
                {ideaBadge.text}
              </Badge>
            )}
            {idea.is_private && (
              <Badge variant="outline" className="border-zinc-200 dark:border-zinc-700 bg-background text-foreground">
                <Lock className="w-3 h-3 mr-1" />
                Private
              </Badge>
            )}
            {user?.id === idea.user_id && <DeleteButton />}
          </div>
        </div>
        <CardTitle className="text-lg font-semibold line-clamp-1">
          {idea.title}
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground flex items-center">
          <Award className="w-4 h-4 mr-1 text-blue-500" />
          {idea.target_audience}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className={cn(
          "text-sm text-card-foreground break-words",
          !isDialogOpen && "line-clamp-3"
        )}>
          {formatTextWithLinks(idea.description)}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between items-center mt-auto pt-4">
        <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button 
              variant="outline"
              size="sm"
              onClick={handleExploreClick}
            >
              Explore Idea
            </Button>
          </DialogTrigger>
          <DialogContent className="flex flex-col sm:max-w-[900px] p-0 gap-0 h-[95vh] sm:h-[90vh] w-full max-w-full overflow-hidden">
            {/* Mobile View */}
            <div className="sm:hidden h-full flex flex-col">
              {/* Fixed Header - Sticky */}
              <div className="p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
                <DialogHeader>
                  <div className="flex items-center justify-between">
                    <DialogTitle className="flex items-center gap-2 max-w-[80%]">
                      <div 
                        className="cursor-pointer text-left" 
                        onClick={() => setIsTitleExpanded(!isTitleExpanded)}
                      >
                        <span className={cn(
                          "text-base text-left transition-all duration-200",
                          isTitleExpanded ? "" : "line-clamp-2"
                        )}>
                          {idea.title}
                        </span>
                      </div>
                    </DialogTitle>
                    <div className="flex items-center gap-2">
                      {ideaBadge && (
                        <Badge variant="secondary" className={`bg-${ideaBadge?.variant}-100 text-${ideaBadge?.variant}-800 text-xs`}>
                          {ideaBadge?.text}
                        </Badge>
                      )}
                      {idea.is_private && (
                        <Badge variant="outline" className="border-zinc-200 dark:border-zinc-700 bg-background text-foreground text-xs">
                          <Lock className="w-3 h-3 mr-1" />
                          Private
                        </Badge>
                      )}
                      {user?.id === idea.user_id && <DeleteButton />}
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
                    {idea.target_audience}
                  </DialogDescription>
                </DialogHeader>
              </div>

              {/* Main Scrollable Content */}
              <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-[calc(100vh-8rem)]">
                  <div className="p-4">
                    <div className="space-y-4">
                      {/* Description Section */}
                      <div className="prose prose-sm dark:prose-invert max-w-full">
                        <div className="relative">
                          <div 
                            className={cn(
                              "text-card-foreground leading-relaxed break-words whitespace-pre-wrap",
                              !isDescriptionExpanded && "line-clamp-4"
                            )}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {formatTextWithLinks(idea.description)}
                          </div>
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
                      <div className="flex flex-col gap-3">
                        <VoteIndicator 
                          upvotes={idea.upvotes}
                          downvotes={idea.downvotes}
                          size={size === 'lg' ? 'lg' : 'default'}
                          showTrend={true}
                          className="w-full max-w-[200px]"
                        />
                        <div className="flex items-center text-sm text-muted-foreground">
                          <User className="w-4 h-4 mr-2 flex-shrink-0" />
                          <span className="truncate">{idea.author_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <ShareButton 
                            ideaId={idea.id}
                            title={idea.title}
                            size={size === 'lg' ? 'lg' : 'default'}
                          />
                          <VoteButtons 
                            currentVote={currentVote}
                            upvotes={idea.upvotes}
                            downvotes={idea.downvotes}
                            onUpvote={() => handleVote("upvote")}
                            onDownvote={() => handleVote("downvote")}
                            size={size === 'lg' ? 'lg' : 'default'}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Comments Section */}
                  <div className="border-t">
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
                <div className="p-6 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
                  <DialogHeader>
                    <div className="flex items-center justify-between">
                      <DialogTitle className="flex items-center gap-2 max-w-[80%]">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="line-clamp-2 text-2xl cursor-default">
                                {idea.title}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" align="start" className="max-w-[400px]">
                              <p className="font-normal">{idea.title}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </DialogTitle>
                      <div className="flex items-center gap-2">
                        {ideaBadge && (
                          <Badge variant="secondary" className={`bg-${ideaBadge?.variant}-100 text-${ideaBadge?.variant}-800`}>
                            {ideaBadge?.text}
                          </Badge>
                        )}
                        {idea.is_private && (
                          <Badge variant="outline" className="border-zinc-200 dark:border-zinc-700 bg-background text-foreground">
                            <Lock className="w-3 h-3 mr-1" />
                            Private
                          </Badge>
                        )}
                      </div>
                    </div>
                    <DialogDescription className="flex items-center gap-2 mt-2">
                      <Award className="w-4 h-4 text-blue-500" />
                      {idea.target_audience}
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
                          <div className="text-card-foreground leading-relaxed break-words">
                            {idea.description.length > 300 ? (
                              <>
                                <div className={cn(
                                  "block transition-all duration-300 whitespace-pre-wrap break-words",
                                  !isDescriptionExpanded && "line-clamp-6"
                                )}>
                                  {formatTextWithLinks(idea.description)}
                                </div>
                                <Button
                                  variant="link"
                                  className="px-0 h-auto font-medium text-primary mt-2"
                                  onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                                >
                                  {isDescriptionExpanded ? "Show less" : "Read more"}
                                </Button>
                              </>
                            ) : (
                              <div className="whitespace-pre-wrap break-words">
                                {formatTextWithLinks(idea.description)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Metadata and Actions */}
                      <div className="flex items-center justify-between py-4 border-t space-y-4">
                        <div className="flex flex-col gap-3">
                          <VoteIndicator 
                            upvotes={idea.upvotes}
                            downvotes={idea.downvotes}
                            size={size === 'lg' ? 'lg' : 'default'}
                            showTrend={true}
                            className="w-full max-w-[200px]"
                          />
                          <div className="flex items-center text-sm text-muted-foreground">
                            <User className="w-4 h-4 mr-2 flex-shrink-0" />
                            <span className="truncate">{idea.author_name}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <ShareButton 
                            ideaId={idea.id}
                            title={idea.title}
                            size={size === 'lg' ? 'lg' : 'default'}
                          />
                          <VoteButtons 
                            currentVote={currentVote}
                            upvotes={idea.upvotes}
                            downvotes={idea.downvotes}
                            onUpvote={() => handleVote("upvote")}
                            onDownvote={() => handleVote("downvote")}
                            size={size === 'lg' ? 'lg' : 'default'}
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

        <div className="flex items-center gap-2">
          <ShareButton 
            ideaId={idea.id}
            title={idea.title}
            size={size === 'lg' ? 'lg' : 'default'}
          />
          <VoteButtons 
            currentVote={currentVote}
            upvotes={idea.upvotes}
            downvotes={idea.downvotes}
            onUpvote={() => handleVote("upvote")}
            onDownvote={() => handleVote("downvote")}
            size={size === 'lg' ? 'lg' : 'default'}
          />
        </div>
      </CardFooter>
    </Card>
  )
})

IdeaCard.displayName = 'IdeaCard'

export { IdeaCard }
