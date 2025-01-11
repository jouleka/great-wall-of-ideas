"use client"

import { useState, useCallback, useRef, useEffect, memo } from "react"
import { useIntersection } from "@/hooks/use-intersection"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, MessageSquare, Reply } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { getInitials } from "@/lib/utils/string-utils"
import { formatDistanceToNow } from "date-fns"
import { Comment } from "@/lib/types/comment"
import { motion, AnimatePresence } from "framer-motion"
import { ReportDialog } from '@/components/report-dialog'
import { cn } from "@/lib/utils/utils"

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
}

const MAX_COMMENT_DEPTH = 10

const CommentItem = memo(function CommentItem({ comment, onReply, depth = 0, maxDepth = MAX_COMMENT_DEPTH, isOriginalCreator, ideaUserId }: CommentItemProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const { user } = useAuth()
  const hasReplies = comment.replies && comment.replies.length > 0
  const canReply = depth < maxDepth

  // Memoize the indentation color calculation
  const getIndentationColor = useCallback((depth: number) => {
    const colors = [
      'border-primary/30',
      'border-primary/25',
      'border-primary/20',
      'border-primary/15',
      'border-primary/10'
    ]
    return colors[Math.min(depth - 1, colors.length - 1)] || colors[colors.length - 1]
  }, [])

  // Memoize the reply handler
  const handleReplyClick = useCallback(() => {
    onReply(comment.id)
  }, [comment.id, onReply])

  // Memoize the expand/collapse handler
  const handleExpandClick = useCallback(() => {
    setIsExpanded(prev => !prev)
  }, [])

  return (
    <div className="group relative">
      {/* Indentation line for nested comments */}
      {depth > 0 && (
        <div 
          className={`absolute left-0 top-0 bottom-0 border-l-2 ${getIndentationColor(depth)}`}
          style={{ 
            left: `${Math.min(depth * 8, 24)}px`,
          }}
        />
      )}
      
      <div 
        className={`flex gap-3 py-3`}
        style={{ 
          paddingLeft: `${Math.min(depth * 12 + 8, 36)}px`,
        }}
      >
        {/* Only show avatar if not anonymous creator */}
        {!(isOriginalCreator && comment.author_name === "Anonymous") && (
          <Avatar className="h-6 w-6 flex-shrink-0 sm:h-8 sm:w-8">
            <AvatarImage src={comment.author_avatar || ''} alt={comment.author_name} />
            <AvatarFallback className="bg-primary/10 text-xs sm:text-sm">
              {getInitials(comment.author_name)}
            </AvatarFallback>
          </Avatar>
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-xs sm:text-sm">
              {comment.author_name}
              {isOriginalCreator && (
                <span className={cn(
                  "ml-2 text-[10px] px-2 py-0.5 rounded-full font-medium",
                  comment.author_name === "Anonymous" 
                    ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                    : "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300"
                )}>
                  Creator
                </span>
              )}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
            </span>
          </div>
          
          <p className="text-xs sm:text-sm text-card-foreground leading-relaxed break-words mt-1">
            {comment.content}
          </p>
          
          <div className="flex items-center gap-2 mt-2">
            {canReply && user && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
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
                className="h-6 px-2 text-xs"
                onClick={handleExpandClick}
              >
                {isExpanded ? "Hide Replies" : `Show ${comment.replies?.length} ${comment.replies?.length === 1 ? 'Reply' : 'Replies'}`}
              </Button>
            )}
            {user && <ReportDialog commentId={comment.id} />}
          </div>
        </div>
      </div>

      {hasReplies && isExpanded && (
        <div>
          <AnimatePresence mode="popLayout">
            {comment.replies?.map((reply) => (
              <motion.div
                key={reply.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <CommentItem
                  comment={reply}
                  onReply={onReply}
                  depth={depth + 1}
                  maxDepth={maxDepth}
                  isOriginalCreator={reply.user_id === ideaUserId}
                  ideaUserId={ideaUserId}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
})

export function CommentSection({ ideaId, initialComments = [], ideaUserId, isAnonymous }: CommentSectionProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [comments, setComments] = useState<CommentWithAuthor[]>(initialComments)
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [newComment, setNewComment] = useState("")
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const isIntersecting = useIntersection(loadMoreRef)
  const isInitialLoadRef = useRef(true)

  // Load initial comments
  useEffect(() => {
    const loadInitialComments = async () => {
      try {
        if (!isInitialLoadRef.current) return
        await loadComments(1, true)
        isInitialLoadRef.current = false
      } catch (error) {
        console.error('Error loading initial comments:', error)
        toast.error("Failed to load comments")
      }
    }
    loadInitialComments()
  }, [ideaId])

  const loadComments = useCallback(async (pageToLoad: number, isInitialLoad: boolean = false) => {
    if (isLoading || (!hasMore && !isInitialLoad)) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/ideas/${ideaId}/comments?page=${pageToLoad}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch comments')
      }
      
      const newComments = Array.isArray(data.comments) ? data.comments : []
      setHasMore(data.hasMore)
      
      setComments(prev => isInitialLoad ? newComments : [...prev, ...newComments])
      if (!isInitialLoad) {
        setPage(prev => prev + 1)
      }
    } catch (error) {
      console.error('Error loading comments:', error)
      toast.error("Failed to load comments")
      setHasMore(false)
    } finally {
      setIsLoading(false)
    }
  }, [ideaId, isLoading, hasMore])

  useEffect(() => {
    if (isIntersecting && hasMore) {
      loadComments(page)
    }
  }, [isIntersecting, loadComments, hasMore, page])

  // Reset state when ideaId changes
  useEffect(() => {
    setComments([])
    setHasMore(true)
    setPage(1)
    setNewComment("")
    setReplyingTo(null)
    isInitialLoadRef.current = true
  }, [ideaId])

  const findCommentById = useCallback((commentId: string, comments: CommentWithAuthor[]): CommentWithAuthor | null => {
    for (const comment of comments) {
      if (comment.id === commentId) return comment
      if (comment.replies) {
        const found = findCommentById(commentId, comment.replies)
        if (found) return found
      }
    }
    return null
  }, [])

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
      // Check if this is the original creator commenting
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

      const comment: CommentWithAuthor = await response.json()
      
      // Add avatar and author info from user profile
      const commentWithProfile = {
        ...comment,
        author_name: shouldBeAnonymous ? "Anonymous" : user.profile?.username || "Anonymous",
        author_avatar: shouldBeAnonymous ? null : user.profile?.avatar_url || null
      }
      
      if (replyingTo) {
        // Add reply to the parent comment
        setComments(prev => {
          const updateReplies = (comments: CommentWithAuthor[]): CommentWithAuthor[] => {
            return comments.map(c => {
              if (c.id === replyingTo) {
                return {
                  ...c,
                  replies: [...(c.replies || []), { ...commentWithProfile, replies: [] }]
                }
              }
              if (c.replies?.length) {
                return {
                  ...c,
                  replies: updateReplies(c.replies)
                }
              }
              return c
            })
          }
          return updateReplies(prev)
        })
      } else {
        // Add new root comment
        setComments(prev => [{ ...commentWithProfile, replies: [] }, ...prev])
      }

      setNewComment("")
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
      <div className="flex items-center gap-2 p-6 border-b">
        <MessageSquare className="h-5 w-5" />
        <h3 className="text-lg font-semibold">Join the Conversation</h3>
      </div>

      <div className="flex flex-col h-full">
        {/* Comments List */}
        <ScrollArea className="flex-1 p-6">
          <AnimatePresence mode="popLayout">
            {comments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MessageSquare className="h-12 w-12 mb-4 opacity-20" />
                <p className="text-sm">Start the conversation!</p>
                <p className="text-xs mt-1">Share your thoughts - don&apos;t be shy</p>
              </div>
            ) : (
              comments.map((comment) => (
                <motion.div
                  key={comment.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <CommentItem
                    comment={comment}
                    onReply={handleReply}
                    isOriginalCreator={comment.user_id === ideaUserId}
                    ideaUserId={ideaUserId || ''}
                  />
                </motion.div>
              ))
            )}
          </AnimatePresence>

          {(hasMore || isLoading) && (
            <div ref={loadMoreRef} className="py-4 text-center">
              {isLoading && (
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
              )}
            </div>
          )}
        </ScrollArea>

        {/* Comment Input - Fixed at bottom */}
        <div className="border-t p-4 bg-background/95 sticky bottom-0">
          <form onSubmit={handleSubmit} className="space-y-4">
            {replyingTo && (
              <div className="flex items-center justify-between text-sm text-muted-foreground bg-muted/50 p-2 rounded-md">
                <span>Replying to a comment</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2"
                  onClick={() => setReplyingTo(null)}
                >
                  Cancel
                </Button>
              </div>
            )}
            <Textarea
              placeholder={user ? "What do you think about this?" : "Sign in to join the conversation"}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              disabled={!user || isSubmitting}
              className="min-h-[80px] resize-none bg-background"
            />
            <div className="flex justify-end">
              <Button 
                type="submit"
                disabled={!user || isSubmitting || !newComment.trim()}  
                className="gap-2"
              >
                {isSubmitting ? "Sending..." : replyingTo ? "Send Reply" : "Share Thought"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
} 