"use client"

import React, { memo, useState, useEffect, useCallback } from "react"
import { Award, User, X, Trash2, Lock, Maximize2, Minimize2, MessageSquare, ChevronUp, ChevronDown, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Idea } from "@/lib/types/idea"
import { IdeaStatus } from "@/lib/types/database"
import { useIdeaIcon, calculateEngagementScore, getEngagementLevel } from "@/lib/utils/idea-utils"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils/utils"
import { CommentSection } from "./comments/comment-section"
import { ScrollArea } from "@/components/ui/scroll-area"
import { VoteIndicator } from "./vote-indicator"
import { VoteButtons } from "./vote-buttons"
import DOMPurify from 'dompurify'
import { ShareButton } from "./share-button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { ReportDialog } from '@/components/report-dialog'
import { useIdeasStore } from '@/lib/store/use-ideas-store'
import { useVotesStore } from '@/lib/store/use-votes-store'
import { RemixButton } from './remix-button'
import { RemixTreeDialog } from './remix-tree-dialog'

interface IdeaCardProps {
  idea: Idea
  size?: 'default' | 'lg'
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
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
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'blockquote'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  })

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

const PopularityMeter = ({ idea }: { idea: Idea }) => {
  const { activeViewers } = useIdeasStore()
  const [engagementScore, setEngagementScore] = useState(0)

  useEffect(() => {
    const score = calculateEngagementScore({
      ...idea,
      current_viewers: activeViewers[idea.id] || 0
    })
    setEngagementScore(score)
  }, [
    idea,
    activeViewers,
    idea.id,
    idea.upvotes,
    idea.downvotes,
    idea.views,
    idea.last_interaction_at
  ])

  const { label, color } = getEngagementLevel(engagementScore)
  const [emoji, status] = label.split(' ')

  return (
    <div className="flex items-center gap-1.5">
      <span className={cn(
        "flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs",
        color === 'red' && "bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400",
        color === 'orange' && "bg-orange-50 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400",
        color === 'yellow' && "bg-yellow-50 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-400",
        color === 'blue' && "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400",
        color === 'gray' && "bg-gray-50 text-gray-600 dark:bg-gray-900 dark:text-gray-400"
      )}>
        {emoji}
        <span className="font-medium">{status}</span>
      </span>
      {activeViewers[idea.id] > 0 && (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <User className="w-3 h-3" />
          {activeViewers[idea.id]}
        </span>
      )}
    </div>
  )
}

const StatusBadge = ({ status }: { status: IdeaStatus }) => {
  const getStatusStyles = (status: IdeaStatus) => {
    const styles = {
      draft: {
        bg: "bg-gray-100 dark:bg-gray-800",
        text: "text-gray-700 dark:text-gray-300",
        icon: <Clock className="w-3 h-3" />
      },
      in_review: {
        bg: "bg-blue-100 dark:bg-blue-900/30",
        text: "text-blue-700 dark:text-blue-300",
        icon: <MessageSquare className="w-3 h-3" />
      },
      in_progress: {
        bg: "bg-yellow-100 dark:bg-yellow-900/30",
        text: "text-yellow-700 dark:text-yellow-300",
        icon: <Clock className="w-3 h-3" />
      },
      completed: {
        bg: "bg-green-100 dark:bg-green-900/30",
        text: "text-green-700 dark:text-green-300",
        icon: <Award className="w-3 h-3" />
      },
      on_hold: {
        bg: "bg-orange-100 dark:bg-orange-900/30",
        text: "text-orange-700 dark:text-orange-300",
        icon: <Lock className="w-3 h-3" />
      },
      cancelled: {
        bg: "bg-red-100 dark:bg-red-900/30",
        text: "text-red-700 dark:text-red-300",
        icon: <X className="w-3 h-3" />
      }
    }
    return styles[status]
  }

  const { bg, text, icon } = getStatusStyles(status)
  const label = status.split('_').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ')

  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5",
      "text-xs font-medium transition-colors",
      bg,
      text
    )}>
      {icon}
      <span>{label}</span>
    </div>
  )
}

const RemixIndicator = ({ remixedFromId }: { remixedFromId: string | null }) => {
  console.log('🎯 RemixIndicator rendered with remixedFromId:', remixedFromId)
  
  if (!remixedFromId) {
    console.log('❌ No remixedFromId provided, not rendering RemixIndicator')
    return null
  }

  return (
    <div className="flex items-center gap-1">
      <RemixTreeDialog ideaId={remixedFromId} className="h-6 w-6 p-0 hover:bg-transparent" />
      <span className="text-xs text-muted-foreground">Remixed</span>
    </div>
  )
}

const StatusSelect = ({ idea, size = 'default' }: { idea: Idea, size?: 'default' | 'lg' }) => {
  const { user } = useAuth()
  const { updateIdeaStatus } = useIdeasStore()
  const [isUpdating, setIsUpdating] = useState(false)

  const handleStatusChange = async (newStatus: IdeaStatus) => {
    if (!user || user.id !== idea.user_id) return

    setIsUpdating(true)
    try {
      await updateIdeaStatus(idea.id, newStatus)
    } catch (error) {
      console.error('Error updating status:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  if (!user || user.id !== idea.user_id) {
    return <StatusBadge status={idea.status} />
  }

  return (
    <Select
      defaultValue={idea.status}
      onValueChange={(value) => handleStatusChange(value as IdeaStatus)}
      disabled={isUpdating}
    >
      <SelectTrigger className={cn(
        "w-[130px] h-8",
        size === 'lg' && "h-9 w-[150px]"
      )}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="draft">Draft</SelectItem>
        <SelectItem value="in_review">In Review</SelectItem>
        <SelectItem value="in_progress">In Progress</SelectItem>
        <SelectItem value="completed">Completed</SelectItem>
        <SelectItem value="on_hold">On Hold</SelectItem>
        <SelectItem value="cancelled">Cancelled</SelectItem>
      </SelectContent>
    </Select>
  )
}

const getStatusColor = (status: IdeaStatus) => {
  const colors = {
    draft: "border-2 border-gray-200 dark:border-gray-800",
    in_review: "border-2 border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.2)]",
    in_progress: "border-2 border-yellow-500/50 shadow-[0_0_10px_rgba(234,179,8,0.2)]",
    completed: "border-2 border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.2)]",
    on_hold: "border-2 border-orange-500/50 shadow-[0_0_10px_rgba(249,115,22,0.2)]",
    cancelled: "border-2 border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.2)]"
  }
  return colors[status]
}

const MakePublicButton = ({ idea, size = 'default' }: { idea: Idea, size?: 'default' | 'lg' }) => {
  const { makeIdeaPublic } = useIdeasStore()

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "text-muted-foreground hover:text-primary",
            size === 'lg' ? "h-8 w-8" : "h-7 w-7"
          )}
        >
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Lock className={size === 'lg' ? "h-4 w-4" : "h-3.5 w-3.5"} />
              </TooltipTrigger>
              <TooltipContent>
                {idea.is_private ? "Make idea public" : "Private idea"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Make this idea public?</AlertDialogTitle>
          <AlertDialogDescription>
            This will make your idea visible to everyone. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => makeIdeaPublic(idea.id)}
            className="bg-primary hover:bg-primary/90"
          >
            Make Public
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

const IdeaCard = memo(({
  idea: initialIdea,
  size = 'default',
  isOpen,
  onOpenChange,
}: IdeaCardProps) => {
  const { user } = useAuth()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [idea, setIdea] = useState(initialIdea)
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)
  const [isTitleExpanded, setIsTitleExpanded] = useState(false)
  const { deleteIdea, incrementViews } = useIdeasStore()
  const { handleVote, votes, userVotes } = useVotesStore()

  const IconComponent = useIdeaIcon(idea.category_id)

  useEffect(() => {
    if (isOpen !== undefined) {
      setIsDialogOpen(isOpen)
    }
  }, [isOpen])

  useEffect(() => {
    const currentVotes = votes[idea.id]
    if (currentVotes) {
      setIdea(prev => ({
        ...prev,
        upvotes: currentVotes.upvotes,
        downvotes: currentVotes.downvotes
      }))
    }
  }, [votes, idea.id])

  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open)
    onOpenChange?.(open)

    if (!open) {
      // Replace state instead of pushing to avoid navigation
      window.history.replaceState({}, '', '/ideas')
    }
  }

  const handleExploreClick = useCallback(async () => {
    try {
      await incrementViews(idea.id)
      setIdea(prev => ({
        ...prev,
        views: (prev.views || 0) + 1
      }))
    } catch (error) {
      console.error('Error in handleExploreClick:', error)
    }
  }, [idea.id, incrementViews])

  useEffect(() => {
    setIdea(initialIdea)
  }, [initialIdea])

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
              const success = await deleteIdea(idea.id)
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
    <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
      <Card className={cn(
        "group relative flex flex-col w-full",
        "transition-all duration-300",
        "hover:bg-accent/5",
        "border border-border/40",
        getStatusColor(idea.status),
        "sm:p-6",
      )}>
        {/* Mobile Design */}
        <div className="sm:hidden">
          {/* Header */}
          <div className="flex items-start gap-3 p-4 pb-3">
            <div className="shrink-0 rounded-full bg-primary/5 p-2 group-hover:bg-primary/10 transition-colors">
              <IconComponent className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium leading-snug line-clamp-2 pr-8">
                    {idea.title}
                  </h3>
                </div>
                <div className="absolute top-4 right-4">
                  {user && user.id !== idea.user_id ? (
                    <ReportDialog
                      type="idea"
                      ideaId={idea.id}
                      size="sm"
                      showOnHover={true}
                      className="h-7 w-7 hover:bg-accent hover:text-accent-foreground"
                    />
                  ) : user?.id === idea.user_id ? (
                    <DeleteButton />
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                <span className="truncate max-w-[120px]">{idea.author_name}</span>
                {idea.is_private && (
                  <>
                    <span>•</span>
                    <div className="flex items-center">
                      {user?.id === idea.user_id ? (
                        <MakePublicButton idea={idea} />
                      ) : (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Lock className="w-3 h-3 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>Private idea</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </>
                )}
                {idea.remixed_from_id && (
                  <>
                    <span>•</span>
                    <RemixIndicator remixedFromId={idea.remixed_from_id} />
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="px-4 text-sm text-muted-foreground/90 leading-relaxed line-clamp-3 min-h-[4.5rem]">
            {formatTextWithLinks(idea.description)}
          </div>

          {/* Target Audience & Engagement */}
          <div className="px-4 mt-3 flex items-center justify-between sm:hidden">
            <div className="flex items-center gap-1 min-w-0 flex-1">
              <Award className="w-3.5 h-3.5 text-primary/70 flex-shrink-0" />
              <span className="truncate text-xs text-muted-foreground">{idea.target_audience}</span>
            </div>
            <div className="shrink-0 ml-3">
              <PopularityMeter idea={idea} />
            </div>
          </div>

          {/* Actions Bar */}
          <div className="flex items-center justify-between px-2 mt-3 pt-2 border-t border-border/50">
            {/* Left Actions */}
            <div className="flex items-center">
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleExploreClick}
                  className="gap-1.5 text-muted-foreground hover:text-primary"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                </Button>
              </DialogTrigger>
              <ShareButton
                ideaId={idea.id}
                title={idea.title}
                size="default"
                className="text-muted-foreground hover:text-primary"
              />
              <RemixButton
                idea={idea}
                size="sm"
                className="text-muted-foreground hover:text-primary"
              />
            </div>

            {/* Right Actions - Voting */}
            <div className="flex items-center border-l border-border/50 ml-1 pl-1">
              <VoteButtons
                ideaId={idea.id}
                userId={user?.id || null}
                size="default"
                className="[&_button]:bg-transparent [&_button:hover]:bg-transparent [&_button.active]:!bg-transparent [&_button.active]:text-primary [&_button.active]:hover:text-primary"
              />
            </div>
          </div>
        </div>

        {/* Desktop Design */}
        <div className="hidden sm:flex gap-4">
          {/* Left Column - Icon & Voting */}
          <div className="flex flex-col items-center gap-3">
            <div className="shrink-0 rounded-full bg-primary/5 p-2.5 group-hover:bg-primary/10 transition-colors">
              <IconComponent className="w-5 h-5 text-primary" />
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleVote(idea.id, user?.id || '', 'upvote')}
                      disabled={!user}
                      className={cn(
                        "h-8 w-8 p-0",
                        userVotes[idea.id] === 'upvote' && "bg-green-100 text-green-700 hover:bg-green-200"
                      )}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {user ? "Support this idea" : "Sign in to vote"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <span className="text-sm font-medium min-w-[1.5rem] text-center">
                {(idea.upvotes || 0) - (idea.downvotes || 0)}
              </span>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleVote(idea.id, user?.id || '', 'downvote')}
                      disabled={!user}
                      className={cn(
                        "h-8 w-8 p-0",
                        userVotes[idea.id] === 'downvote' && "bg-red-100 text-red-700 hover:bg-red-200"
                      )}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {user ? "Withdraw support" : "Sign in to vote"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Header - Title & Metadata */}
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold leading-tight line-clamp-2 group-hover:text-primary/90 transition-colors">
                  {idea.title}
                </h3>
                <div className="flex flex-wrap items-center gap-2 mt-1.5 text-sm text-mutexd-foreground">
                  <span className="truncate">{idea.author_name}</span>
                  <span>•</span>
                  <PopularityMeter idea={idea} />
                  {(idea.is_private || idea.remixed_from_id) && (
                    <>
                      <span>•</span>
                      <div className="flex items-center gap-2">
                        {idea.is_private && (
                          <div className="flex items-center">
                            {user?.id === idea.user_id ? (
                              <MakePublicButton idea={idea} size="lg" />
                            ) : (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Lock className="w-3 h-3" />
                                  </TooltipTrigger>
                                  <TooltipContent>Private idea</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        )}
                        {idea.remixed_from_id && <RemixIndicator remixedFromId={idea.remixed_from_id} />}
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {user && user.id !== idea.user_id ? (
                  <ReportDialog
                    type="idea"
                    ideaId={idea.id}
                    size="sm"
                    showOnHover={true}
                    className="h-7 w-7 hover:bg-accent hover:text-accent-foreground"
                  />
                ) : user?.id === idea.user_id ? (
                  <DeleteButton />
                ) : null}
              </div>
            </div>

            {/* Description */}
            <div className="text-sm text-muted-foreground/90 leading-relaxed line-clamp-3 mb-4 max-w-[95%]">
              {formatTextWithLinks(idea.description)}
            </div>

            {/* Footer - Actions */}
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleExploreClick}
                  className="gap-2 -ml-3 text-muted-foreground hover:text-primary hover:bg-primary/5 shrink-0"
                >
                  <MessageSquare className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <ShareButton
                  ideaId={idea.id}
                  title={idea.title}
                  size="default"
                  className="text-muted-foreground hover:text-primary shrink-0"
                />
                <RemixButton
                  idea={idea}
                  size="default"
                  className="text-muted-foreground hover:text-primary"
                />
                <div className="flex items-center gap-1 min-w-0 flex-1">
                  <Award className="w-4 h-4 text-primary/70 flex-shrink-0" />
                  <span className="truncate text-muted-foreground">{idea.target_audience}</span>
                </div>

              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Dialog Content */}
      <DialogContent className={cn(
        "p-0 flex flex-col overflow-hidden bg-background",
        "w-full h-[100dvh] border-0 rounded-none",
        "sm:w-[900px] sm:h-[95vh] sm:max-h-[95vh] sm:min-w-[300px] sm:max-w-[95vw] sm:rounded-2xl sm:border",
        isFullscreen && "sm:w-screen sm:h-screen sm:max-w-none sm:max-h-none sm:rounded-none sm:border-0",
        !user && "!sm:w-[600px] !sm:min-h-[500px] !sm:max-h-[90vh]"
      )}>
        {/* Mobile View */}
        <div className="sm:hidden flex flex-col h-full bg-background">
          {/* Mobile Header */}
          <div className="sticky top-0 z-10 bg-background border-b">
            {/* Close button */}
            <div className="flex items-center justify-end p-2">
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                  <X className="h-5 w-5" />
                </Button>
              </DialogTrigger>
            </div>

            {/* Title and Author */}
            <div className="px-4 pb-4">
              <h2
                onClick={() => setIsTitleExpanded(!isTitleExpanded)}
                className={cn(
                  "text-xl font-semibold mb-2 transition-all duration-200",
                  !isTitleExpanded && "line-clamp-2",
                  isTitleExpanded && "whitespace-pre-wrap break-words",
                  "cursor-pointer hover:text-primary/90"
                )}
              >
                {idea.title}
                {idea.title.length > 60 && !isTitleExpanded && (
                  <Button
                    variant="link"
                    className="px-0 h-6 text-xs font-medium text-primary ml-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsTitleExpanded(true);
                    }}
                  >
                    Show more
                  </Button>
                )}
              </h2>
              {isTitleExpanded && (
                <Button
                  variant="link"
                  className="px-0 h-6 text-xs font-medium text-primary -mt-1 mb-2"
                  onClick={() => setIsTitleExpanded(false)}
                >
                  Show less
                </Button>
              )}
              <div className="flex items-center gap-3 text-sm">
                <div className="flex items-center gap-1.5">
                  <User className="w-4 h-4" />
                  <span className="truncate max-w-[100px]">{idea.author_name}</span>
                </div>
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <Award className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <span className="truncate">{idea.target_audience}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                {user?.id === idea.user_id ? (
                  <StatusSelect idea={idea} />
                ) : (
                  <StatusBadge status={idea.status} />
                )}
                {idea.is_private && (
                  <div className="flex items-center">
                    {user?.id === idea.user_id ? (
                      <MakePublicButton idea={idea} />
                    ) : (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Lock className="w-3 h-3" />
                          </TooltipTrigger>
                          <TooltipContent>Private idea</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Content */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-6">
              {/* Description */}
              <div className="prose prose-sm dark:prose-invert">
                <div
                  className={cn(
                    "text-base leading-relaxed",
                    !isDescriptionExpanded && "line-clamp-4"
                  )}
                >
                  {formatTextWithLinks(idea.description)}
                </div>
                {idea.description.length > 300 && (
                  <Button
                    variant="link"
                    className="px-0 h-8 font-medium text-primary"
                    onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                  >
                    {isDescriptionExpanded ? "Show less" : "Read more"}
                  </Button>
                )}
              </div>

              {/* Engagement Stats */}
              <div className="py-4 space-y-4 border-t border-b">
                <div className="flex items-center justify-between gap-4">
                  <VoteIndicator
                    ideaId={idea.id}
                    size="lg"
                    showTrend={true}
                    className="w-full max-w-[200px] xs:max-w-[150px] [&_.trend-text]:text-xs [&_.trend-text]:xs:text-[11px]"
                  />
                  <div className="flex items-center gap-2">
                    <ShareButton
                      ideaId={idea.id}
                      title={idea.title}
                      size="default"
                      className="text-muted-foreground hover:text-primary"
                    />
                    <RemixButton
                      idea={idea}
                      size="sm"
                      className="text-muted-foreground hover:text-primary"
                    />
                    <VoteButtons
                      ideaId={idea.id}
                      userId={user?.id || null}
                      size="lg"
                      className="[&_button]:bg-transparent [&_button:hover]:bg-transparent [&_button.active]:!bg-transparent [&_button.active]:text-primary [&_button.active]:hover:text-primary [&_button.supports]:!bg-transparent [&_button.supports]:hover:!bg-transparent [&_button.supports]:text-green-600 [&_button.against]:!bg-transparent [&_button.against]:hover:!bg-transparent [&_button.against]:text-red-600 [&_button]:xs:h-8 [&_button]:xs:px-2 [&_button_.text]:xs:text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Comments Section */}
              <div className="pt-2">
                <CommentSection
                  ideaId={idea.id}
                  ideaUserId={idea.user_id}
                  isAnonymous={idea.is_anonymous}
                />
              </div>
            </div>
          </ScrollArea>

          {/* Mobile Bottom Actions */}
          {user && (
            <div className="sticky bottom-0 border-t bg-background/80 backdrop-blur-sm p-4">
              <div className="flex items-center justify-between">
                <PopularityMeter idea={idea} />
                {user.id === idea.user_id ? (
                  <DeleteButton />
                ) : (
                  <ReportDialog
                    type="idea"
                    ideaId={idea.id}
                    size="default"
                    showOnHover={false}
                    className="h-9 px-4"
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Desktop View */}
        <div className="hidden sm:grid grid-cols-5 h-full overflow-hidden">
          {/* Left Panel - Idea Details */}
          <div className="col-span-3 flex flex-col h-full overflow-hidden border-r">
            {/* Fixed Header */}
            <div className="p-6 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
              <DialogHeader>
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-4">
                    <DialogTitle className="text-2xl font-semibold line-clamp-2">
                      {idea.title}
                    </DialogTitle>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setIsFullscreen(prev => !prev)}
                      >
                        {isFullscreen ? (
                          <Minimize2 className="h-4 w-4" />
                        ) : (
                          <Maximize2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex items-center gap-1.5 text-muted-foreground shrink-0">
                        <User className="w-4 h-4" />
                        <span>{idea.author_name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground min-w-0">
                        <Award className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        <span className="truncate">{idea.target_audience}</span>
                      </div>
                      {idea.is_private && (
                        <div className="flex items-center">
                          {user?.id === idea.user_id ? (
                            <MakePublicButton idea={idea} size="lg" />
                          ) : (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Lock className="w-4 h-4 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>Private idea</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {user?.id === idea.user_id ? (
                        <StatusSelect idea={idea} size="lg" />
                      ) : (
                        <StatusBadge status={idea.status} />
                      )}
                      {user?.id === idea.user_id && <DeleteButton />}
                      {user && user.id !== idea.user_id && (
                        <ReportDialog
                          type="idea"
                          ideaId={idea.id}
                          size="default"
                          showOnHover={false}
                          className="h-8 w-8 hover:bg-accent hover:text-accent-foreground"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </DialogHeader>
            </div>

            {/* Scrollable Content */}
            <ScrollArea className="flex-1">
              <div className="p-6">
                <div className="space-y-6">
                  {/* Description */}
                  <div className="prose prose-sm dark:prose-invert max-w-full">
                    <div className="relative">
                      <div className={cn(
                        "text-card-foreground leading-relaxed break-words whitespace-pre-wrap",
                        !isDescriptionExpanded && "line-clamp-6"
                      )}>
                        {formatTextWithLinks(idea.description)}
                      </div>
                      {idea.description.length > 300 && (
                        <Button
                          variant="link"
                          className="px-0 h-auto font-medium text-primary mt-2"
                          onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                        >
                          {isDescriptionExpanded ? "Show less" : "Read more"}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Metadata and Actions */}
                  <div className="flex items-center justify-between py-4 border-t">
                    <div className="flex flex-col gap-3">
                      <VoteIndicator
                        ideaId={idea.id}
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
                        size="default"
                        className="text-muted-foreground hover:text-primary"
                      />
                      <RemixButton
                        idea={idea}
                        size="default"
                        className="text-muted-foreground hover:text-primary"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>

          {/* Right Panel - Comments */}
          <div className="col-span-2 h-full overflow-hidden">
            <CommentSection
              ideaId={idea.id}
              ideaUserId={idea.user_id}
              isAnonymous={idea.is_anonymous}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
})

IdeaCard.displayName = 'IdeaCard'

export default IdeaCard


