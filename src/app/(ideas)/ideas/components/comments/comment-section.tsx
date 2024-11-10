"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { useIntersection } from "@/hooks/use-intersection"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, MessageSquare } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { getInitials } from "@/lib/utils/string-utils"
import { formatDistanceToNow } from "date-fns"
import { Comment } from "@/lib/types/comment"
import { motion, AnimatePresence } from "framer-motion"

interface CommentWithAuthor extends Comment {
  author_avatar?: string | null  // Add avatar URL to comment type
}

interface CommentSectionProps {
  ideaId: string
  initialComments?: CommentWithAuthor[]
}

const COMMENTS_PER_PAGE = 10

export function CommentSection({ ideaId, initialComments = [] }: CommentSectionProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [comments, setComments] = useState<CommentWithAuthor[]>(initialComments)
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [newComment, setNewComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const isIntersecting = useIntersection(loadMoreRef)

  const loadComments = useCallback(async () => {
    if (isLoading || !hasMore) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/ideas/${ideaId}/comments?page=${page}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch comments')
      }
      
      // Ensure data.comments exists and is an array
      const newComments = Array.isArray(data.comments) ? data.comments : []
      
      if (newComments.length < COMMENTS_PER_PAGE) {
        setHasMore(false)
      }
      
      setComments(prev => [...prev, ...newComments])
      setPage(prev => prev + 1)
    } catch (error) {
      console.error('Error loading comments:', error)
      toast.error("Failed to load comments")
      setHasMore(false)
    } finally {
      setIsLoading(false)
    }
  }, [ideaId, page, isLoading, hasMore])

  useEffect(() => {
    if (isIntersecting && hasMore) {
      loadComments()
    }
  }, [isIntersecting, loadComments, hasMore])

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

    if (!newComment.trim()) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/ideas/${ideaId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: newComment.trim(),
          author_name: user.profile?.username || "Anonymous",
          author_avatar: user.profile?.avatar_url || null
        })
      })

      if (!response.ok) throw new Error('Failed to post comment')

      const comment = await response.json()
      setComments(prev => [comment, ...prev])
      setNewComment("")
      toast.success("Comment posted successfully!")
    } catch (error) {
      console.error('Error posting comment:', error)
      toast.error("Failed to post comment")
    } finally {
      setIsSubmitting(false)
    }
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
                  className="flex gap-4 py-4 group"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage 
                      src={comment.author_avatar || ''} 
                      alt={comment.author_name} 
                    />
                    <AvatarFallback className="bg-primary/10">
                      {getInitials(comment.author_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{comment.author_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-card-foreground leading-relaxed">
                      {comment.content}
                    </p>
                  </div>
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
                {isSubmitting ? "Sending..." : "Share Thought"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
} 