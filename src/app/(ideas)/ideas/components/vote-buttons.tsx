"use client"

import { memo } from 'react'
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { ChevronUp, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils/utils"
import { motion, AnimatePresence } from "framer-motion"
import { useVotesStore } from '@/lib/store/use-votes-store'

export interface VoteButtonsProps {
  ideaId: string
  userId: string | null
  size?: 'default' | 'lg'
  className?: string
}

const VoteButtons = memo(({ 
  ideaId,
  userId,
  size = 'default',
  className 
}: VoteButtonsProps) => {
  // Just read from store - initialization handled by parent IdeaCard
  const { votes, userVotes, isLoading, handleVote } = useVotesStore()
  const iconSize = size === 'lg' ? "h-5 w-5" : "h-4 w-4"
  const buttonSize = size === 'lg' ? "h-10" : "h-8"
  const currentVote = userVotes[ideaId]
  const voteCounts = votes[ideaId] || { upvotes: 0, downvotes: 0 }
  const { upvotes, downvotes } = voteCounts
  const loading = isLoading[ideaId]

  const handleUpvoteClick = () => {
    if (!userId || loading) return
    handleVote(ideaId, userId, 'upvote')
  }

  const handleDownvoteClick = () => {
    if (!userId || loading) return
    handleVote(ideaId, userId, 'downvote')
  }

  return (
    <div className={cn("flex items-center", className)}>
      <div className="flex items-center gap-1.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="ghost"
                onClick={handleUpvoteClick}
                disabled={loading || !userId}
                className={cn(
                  buttonSize,
                  "px-2 transition-colors duration-200 flex items-center gap-1.5",
                  currentVote === 'upvote' 
                    ? "bg-green-100 hover:bg-green-200 text-green-700" 
                    : "hover:bg-green-50 text-muted-foreground hover:text-green-600"
                )}
              >
                <ChevronUp className={iconSize} />
                <AnimatePresence mode="wait">
                  <motion.span
                    key={upvotes}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="font-medium min-w-[1.5rem] text-center"
                  >
                    {upvotes}
                  </motion.span>
                </AnimatePresence>
              </Button>
            </motion.div>
          </TooltipTrigger>
          <TooltipContent>
            {userId ? (
              <>
                <p>Support this idea</p>
                {currentVote === 'upvote' && (
                  <p className="text-sm text-muted-foreground">You&apos;re supporting this idea</p>
                )}
              </>
            ) : (
              <p>Sign in to vote</p>
            )}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="ghost"
                onClick={handleDownvoteClick}
                disabled={loading || !userId}
                className={cn(
                  buttonSize,
                  "px-2 transition-colors duration-200 flex items-center gap-1.5",
                  currentVote === 'downvote' 
                    ? "bg-red-100 hover:bg-red-200 text-red-700" 
                    : "hover:bg-red-50 text-muted-foreground hover:text-red-600"
                )}
              >
                <ChevronDown className={iconSize} />
                <AnimatePresence mode="wait">
                  <motion.span
                    key={downvotes}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="font-medium min-w-[1.5rem] text-center"
                  >
                    {downvotes}
                  </motion.span>
                </AnimatePresence>
              </Button>
            </motion.div>
          </TooltipTrigger>
          <TooltipContent>
            {userId ? (
              <>
                <p>Withdraw support</p>
                {currentVote === 'downvote' && (
                  <p className="text-sm text-muted-foreground">You&apos;ve withdrawn support</p>
                )}
              </>
            ) : (
              <p>Sign in to vote</p>
            )}
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
})

VoteButtons.displayName = 'VoteButtons'

export { VoteButtons }
