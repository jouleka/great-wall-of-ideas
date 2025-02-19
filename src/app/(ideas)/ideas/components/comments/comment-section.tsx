"use client"

import { useState, useCallback, useRef, useEffect, memo } from "react"
import { useIntersection } from "@/hooks/use-intersection"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, MessageSquare, Reply, User, Heart } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { getInitials } from "@/lib/utils/string-utils"
import { formatDistanceToNow } from "date-fns"
import { Comment } from "@/lib/types/comment"
import { motion, AnimatePresence } from "framer-motion"
import { ReportDialog } from '@/components/report-dialog'
import { cn } from "@/lib/utils/utils"
import DOMPurify from 'isomorphic-dompurify'
import { Badge } from "@/components/ui/badge"
import { useCommentsStore } from '@/lib/store/use-comments-store'

// Editor styles
const editorStyles = `
  .ProseMirror {
    min-height: 100px;
    padding: 0.75rem;
    outline: none;
    border-radius: 0.5rem;
    background-color: hsl(var(--background));
    transition: all 0.2s ease;
  }

  .ProseMirror:focus {
    box-shadow: 0 0 0 1px hsl(var(--primary)/0.2);
    background-color: hsl(var(--background));
  }

  .ProseMirror > * + * {
    margin-top: 0.75em;
  }

  .ProseMirror ul,
  .ProseMirror ol {
    padding: 0 1.2rem;
    margin: 0.75rem 0;
  }

  .ProseMirror ul {
    list-style-type: disc;
  }

  .ProseMirror ol {
    list-style-type: decimal;
  }

  .ProseMirror blockquote {
    border-left: 3px solid hsl(var(--primary)/0.2);
    padding-left: 1rem;
    margin: 1rem 0;
    font-style: italic;
    color: hsl(var(--muted-foreground));
  }

  .ProseMirror p.is-editor-empty:first-child::before {
    color: hsl(var(--muted-foreground)/0.8);
    content: attr(data-placeholder);
    float: left;
    height: 0;
    pointer-events: none;
  }

  .comment-content {
    line-height: 1.6;
    font-size: 0.925rem;
    overflow-wrap: break-word;
    word-wrap: break-word;
    word-break: break-word;
    hyphens: auto;
    color: hsl(var(--foreground));
  }
  
  .comment-content > * + * {
    margin-top: 0.75em;
  }

  .comment-content ul,
  .comment-content ol {
    padding-left: 1.5rem;
    margin: 0.75rem 0;
  }

  .comment-content ul {
    list-style-type: disc;
  }

  .comment-content ol {
    list-style-type: decimal;
  }

  .comment-content blockquote {
    border-left: 3px solid hsl(var(--primary)/0.2);
    padding: 0.5rem 0 0.5rem 1rem;
    margin: 1rem 0;
    font-style: italic;
    color: hsl(var(--muted-foreground));
    background: hsl(var(--muted)/0.2);
    border-radius: 0.25rem;
  }

  .comment-content a {
    color: hsl(var(--primary));
    text-decoration: underline;
    text-decoration-thickness: 1px;
    text-underline-offset: 2px;
    transition: all 0.2s ease;
  }

  .comment-content a:hover {
    color: hsl(var(--primary)/0.8);
  }

  .comment-content p {
    margin: 0.5rem 0;
    overflow-wrap: break-word;
    word-wrap: break-word;
    word-break: break-word;
    hyphens: auto;
    max-width: 100%;
  }

  @keyframes comment-highlight {
    0% {
      background-color: hsl(var(--primary)/0.1);
    }
    100% {
      background-color: transparent;
    }
  }

  .comment-highlight {
    animation: comment-highlight 2s ease-out;
  }
`

interface CommentWithAuthor extends Comment {
  author_avatar?: string | null
}

interface CommentSectionProps {
  ideaId: string
  initialComments?: CommentWithAuthor[]
  ideaUserId?: string
  isAnonymous?: boolean
}

interface CommentItemProps {
  comment: CommentWithAuthor
  onReply: (parentId: string) => void
  depth?: number
  maxDepth?: number
  isOriginalCreator: boolean
  ideaUserId: string
  ideaId: string
}

const MAX_COMMENT_DEPTH = 10

const CommentItem = memo(function CommentItem({ comment, onReply, depth = 0, maxDepth = MAX_COMMENT_DEPTH, isOriginalCreator, ideaUserId, ideaId }: CommentItemProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const { user } = useAuth()
  const router = useRouter()
  const hasReplies = comment.replies && comment.replies.length > 0
  const canReply = depth < maxDepth
  const commentRef = useRef<HTMLDivElement>(null)
  const { toggleLike } = useCommentsStore()

  const getIndentationColor = useCallback((depth: number) => {
    const colors = [
      'from-primary/30 to-primary/20',
      'from-primary/25 to-primary/15',
      'from-primary/20 to-primary/10',
      'from-primary/15 to-primary/5',
      'from-primary/10 to-primary/0'
    ]
    return colors[Math.min(depth - 1, colors.length - 1)] || colors[colors.length - 1]
  }, [])

  const handleReplyClick = useCallback(() => {
    onReply(comment.id)
    commentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [comment.id, onReply])

  const handleExpandClick = useCallback(() => {
    setIsExpanded(prev => !prev)
  }, [])

  const handleLike = async () => {
    if (!user) {
      toast("Please sign in to like comments", {
        action: {
          label: "Sign In",
          onClick: () => router.push('/auth?redirectTo=/ideas')
        }
      })
      return
    }

    try {
      await toggleLike(ideaId, comment.id)
    } catch (error) {
      console.error('Error toggling like:', error)
      toast.error("Failed to update like")
    }
  }

  return (
    <div 
      ref={commentRef}
      className={cn(
        "group relative rounded-lg transition-all duration-200",
        depth > 0 && "ml-3 sm:ml-6"
      )}
    >
      {/* Indentation line for nested comments */}
      {depth > 0 && (
        <div 
          className={cn(
            "absolute left-0 top-4 bottom-0 w-[2px] bg-gradient-to-b",
            getIndentationColor(depth)
          )}
          style={{ 
            left: `-${Math.min(depth * 4, 12)}px`,
          }}
        />
      )}
      
      <div className={cn(
        "p-4 rounded-lg transition-all duration-200",
        "hover:bg-muted/40",
        "sm:p-5"
      )}>
        <div className="flex gap-3 items-start">
          {/* Avatar or placeholder */}
          <div className="flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9">
            {!(isOriginalCreator && comment.author_name === "Anonymous") ? (
              <Avatar className="h-full w-full ring-2 ring-background">
                <AvatarImage src={comment.author_avatar || ''} alt={comment.author_name} />
                <AvatarFallback className="bg-primary/10 text-sm">
                  {getInitials(comment.author_name)}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="h-full w-full rounded-full bg-muted/50 flex items-center justify-center">
                <User className="h-4 w-4 text-muted-foreground/60" />
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0 space-y-1">
            {/* Author Info */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm sm:text-base">
                {comment.author_name}
                {isOriginalCreator && (
                  <span className={cn(
                    "ml-2 text-[10px] px-2 py-0.5 rounded-full font-medium",
                    comment.author_name === "Anonymous" 
                      ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                      : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                  )}>
                    Creator
                  </span>
                )}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
              </span>
            </div>
            
            {/* Comment Content */}
            <div className="prose prose-sm dark:prose-invert max-w-full">
              <div 
                className="comment-content text-sm sm:text-base text-card-foreground leading-relaxed break-words"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(comment.content, {
                  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'blockquote'],
                  ALLOWED_ATTR: ['href', 'target', 'rel'],
                }) }}
              />
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-1.5 mt-3">
              {/* Like Button */}
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-7 px-2 text-xs gap-1.5 rounded-full",
                  comment.is_liked 
                    ? "bg-pink-500/10 text-pink-500 hover:bg-pink-500/20 hover:text-pink-600"
                    : "hover:bg-muted/80 hover:text-pink-500"
                )}
                onClick={handleLike}
              >
                <Heart 
                  className={cn(
                    "h-3.5 w-3.5",
                    comment.is_liked && "fill-current"
                  )} 
                />
                {(comment.like_count ?? 0) > 0 && (
                  <span className="tabular-nums">{comment.like_count}</span>
                )}
              </Button>

              {canReply && user && (
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-7 px-2.5 text-xs gap-1.5 rounded-full",
                    "bg-primary/5 hover:bg-primary/10 text-primary hover:text-primary",
                    "transition-colors duration-200"
                  )}
                  onClick={handleReplyClick}
                >
                  <Reply className="h-3 w-3" />
                  Reply
                </Button>
              )}
              {hasReplies && (
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-7 px-2.5 text-xs gap-1.5 rounded-full",
                    isExpanded 
                      ? "bg-primary/10 text-primary hover:bg-primary/15"
                      : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground",
                    "transition-colors duration-200"
                  )}
                  onClick={handleExpandClick}
                >
                  <MessageSquare className="h-3 w-3" />
                  {isExpanded ? (
                    "Hide Replies"
                  ) : (
                    `${comment.replies?.length} ${comment.replies?.length === 1 ? 'Reply' : 'Replies'}`
                  )}
                </Button>
              )}
              {user && user.id !== comment.user_id && (
                <ReportDialog 
                  type="comment" 
                  commentId={comment.id}
                  size="sm"
                  showOnHover={false}
                  className={cn(
                    "h-7 w-7 rounded-full",
                    "bg-destructive/5 hover:bg-destructive/10",
                    "text-destructive hover:text-destructive",
                    "transition-colors duration-200"
                  )}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Replies */}
      {hasReplies && isExpanded && (
        <div className="mt-2">
          <AnimatePresence mode="popLayout">
            {comment.replies?.map((reply) => (
              <motion.div
                key={reply.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ 
                  duration: 0.2,
                  ease: [0.4, 0, 0.2, 1]
                }}
              >
                <CommentItem
                  comment={reply}
                  onReply={onReply}
                  depth={depth + 1}
                  maxDepth={maxDepth}
                  isOriginalCreator={reply.user_id === ideaUserId}
                  ideaUserId={ideaUserId}
                  ideaId={ideaId}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
})

export function CommentSection({ ideaId, ideaUserId, isAnonymous }: CommentSectionProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [newComment, setNewComment] = useState("")
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const isIntersecting = useIntersection(loadMoreRef)
  const isInitialLoadRef = useRef(true)

  const {
    comments,
    isLoading,
    hasMore,
    fetchComments,
    addComment,
    addReply
  } = useCommentsStore()

  const currentComments = comments[ideaId] || []
  const currentHasMore = hasMore[ideaId] || false

  // Load initial comments
  useEffect(() => {
    const loadInitialComments = async () => {
      try {
        if (!isInitialLoadRef.current) return
        await fetchComments(ideaId, 1)
        isInitialLoadRef.current = false
      } catch (error) {
        console.error('Error loading initial comments:', error)
        toast.error("Failed to load comments")
      }
    }
    loadInitialComments()
  }, [ideaId, fetchComments])

  // Handle infinite scroll
  useEffect(() => {
    if (isIntersecting && currentHasMore && !isLoading) {
      const nextPage = Math.floor(currentComments.length / 10) + 1
      fetchComments(ideaId, nextPage)
    }
  }, [isIntersecting, currentHasMore, isLoading, currentComments.length, fetchComments, ideaId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) {
      toast("Please sign in to comment", {
        action: {
          label: "Sign In",
          onClick: () => router.push('/auth?redirectTo=/ideas')
        }
      })
      return
    }

    const commentText = newComment.trim()
    if (!commentText) return

    setIsSubmitting(true)
    try {
      const isOriginalCreator = user.id === ideaUserId
      const shouldBeAnonymous = isOriginalCreator && isAnonymous
      
      const response = await fetch(`/api/ideas/${ideaId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: commentText,
          parent_id: replyingTo,
          author_name: shouldBeAnonymous ? "Anonymous" : user.profile?.username || "Anonymous",
          author_avatar: shouldBeAnonymous ? null : user.profile?.avatar_url || null
        })
      })

      if (!response.ok) throw new Error('Failed to post comment')

      const comment = await response.json()
      
      const commentWithProfile = {
        ...comment,
        author_name: shouldBeAnonymous ? "Anonymous" : user.profile?.username || "Anonymous",
        author_avatar: shouldBeAnonymous ? null : user.profile?.avatar_url || null
      }
      
      if (replyingTo) {
        addReply(ideaId, replyingTo, commentWithProfile)
      } else {
        addComment(ideaId, commentWithProfile)
      }

      setNewComment("<p></p>")
      setReplyingTo(null)
      toast.success("Comment posted successfully!")
    } catch (error) {
      console.error('Error posting comment:', error)
      toast.error("Failed to post comment")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReply = (parentId: string) => {
    setReplyingTo(parentId)
  }

  return (
    <div className="flex flex-col h-full">
      <style>{editorStyles}</style>
      
      {/* Header */}
      <div className="flex items-center justify-between p-4 sm:p-6 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Discussion</h3>
          {currentComments.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {currentComments.length}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex flex-col h-full">
        {/* Comments List */}
        <ScrollArea className="flex-1">
          <div className="p-4 sm:p-6">
            <AnimatePresence mode="popLayout">
              {currentComments.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center py-12 text-center"
                >
                  <div className="rounded-full bg-primary/10 p-4 mb-4">
                    <MessageSquare className="h-8 w-8 text-primary/60" />
                  </div>
                  <p className="text-base font-medium">Start the conversation!</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Share your thoughts and ideas with others
                  </p>
                </motion.div>
              ) : (
                currentComments.map((comment) => (
                  <motion.div
                    key={comment.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                    className="mb-4 last:mb-0"
                  >
                    <CommentItem
                      comment={comment}
                      onReply={handleReply}
                      isOriginalCreator={comment.user_id === ideaUserId}
                      ideaUserId={ideaUserId || ''}
                      ideaId={ideaId}
                    />
                  </motion.div>
                ))
              )}
            </AnimatePresence>

            {(currentHasMore || isLoading) && (
              <div ref={loadMoreRef} className="py-6 text-center">
                {isLoading && (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">
                      Loading more comments...
                    </span>
                  </div>
                )}
              </div>
            )}
            
            {/* Padding at the bottom to prevent comment actions from being hidden */}
            <div className="h-20 sm:h-24" />
          </div>
        </ScrollArea>

        {/* Comment Input */}
        <div className={cn(
          "border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky bottom-0",
          "transition-all duration-200",
          replyingTo && "border-primary/20 bg-primary/5"
        )}>
          <form onSubmit={handleSubmit}>
            {/* Mobile View */}
            <div className="sm:hidden">
              {replyingTo && (
                <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
                  <span className="text-xs text-primary flex items-center gap-2">
                    <Reply className="h-3 w-3" />
                    Replying to comment
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs hover:bg-background"
                    onClick={() => setReplyingTo(null)}
                  >
                    Cancel
                  </Button>
                </div>
              )}
              
              <div className="relative flex items-end gap-2 p-2">
                {user && !isSubmitting ? (
                  <>
                    <div className="flex-1 relative">
                      <RichTextEditor
                        content={newComment}
                        onChange={setNewComment}
                        placeholder={replyingTo ? "Write a reply..." : "Add to the discussion..."}
                        maxLength={2000}
                        className={cn(
                          "rounded-xl border bg-muted/50",
                          "focus-within:bg-background focus-within:ring-1 focus-within:ring-primary/20",
                          "transition-all duration-200"
                        )}
                        error={false}
                      />
                    </div>
                    <Button 
                      type="submit"
                      size="sm"
                      disabled={!newComment.trim() || isSubmitting}
                      className={cn(
                        "h-8 w-8 p-0 rounded-full",
                        "bg-primary hover:bg-primary/90",
                        !newComment.trim() && "opacity-50",
                        "transition-all duration-200"
                      )}
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <MessageSquare className="h-4 w-4" />
                      )}
                      <span className="sr-only">
                        {isSubmitting ? "Sending..." : "Send comment"}
                      </span>
                    </Button>
                  </>
                ) : (
                  <div className="flex-1 relative">
                    <RichTextEditor
                      content=""
                      onChange={() => {}}
                      placeholder="Sign in to join the discussion..."
                      maxLength={2000}
                      className="opacity-50 rounded-xl bg-muted/50"
                      error={false}
                    />
                    {!user && (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-xl">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs gap-1.5"
                          onClick={() => router.push('/auth?redirectTo=/ideas')}
                        >
                          <User className="h-3 w-3" />
                          Sign in to comment
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Desktop View */}
            <div className="hidden sm:block p-4 sm:p-6 space-y-4">
              {replyingTo && (
                <div className="flex items-center justify-between text-sm bg-muted/50 p-3 rounded-lg border border-border/50">
                  <span className="text-muted-foreground">
                    Replying to a comment
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-3 hover:bg-background"
                    onClick={() => setReplyingTo(null)}
                  >
                    Cancel
                  </Button>
                </div>
              )}
              
              {user && !isSubmitting ? (
                <div className="relative">
                  <RichTextEditor
                    content={newComment}
                    onChange={setNewComment}
                    placeholder="What are your thoughts?"
                    maxLength={2000}
                    className="rounded-lg border focus-within:ring-1 focus-within:ring-primary/20 transition-all duration-200"
                    error={false}
                  />
                </div>
              ) : (
                <div className="relative">
                  <RichTextEditor
                    content=""
                    onChange={() => {}}
                    placeholder="Sign in to join the conversation"
                    maxLength={2000}
                    className="opacity-50 rounded-lg"
                    error={false}
                  />
                  {!user && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
                      <Button
                        variant="outline"
                        className="gap-2"
                        onClick={() => router.push('/auth?redirectTo=/ideas')}
                      >
                        Sign in to comment
                      </Button>
                    </div>
                  )}
                </div>
              )}
              
              <div className="flex justify-end">
                <Button 
                  type="submit"
                  disabled={!user || isSubmitting || !newComment.trim()}
                  className={cn(
                    "gap-2 min-w-[120px]",
                    isSubmitting && "opacity-80"
                  )}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : replyingTo ? (
                    "Send Reply"
                  ) : (
                    "Comment"
                  )}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
} 