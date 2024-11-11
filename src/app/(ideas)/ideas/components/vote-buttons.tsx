"use client"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ChevronUp, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils/utils"
import { motion, AnimatePresence } from "framer-motion"
import confetti from 'canvas-confetti'

interface VoteButtonsProps {
  currentVote: 'upvote' | 'downvote' | null
  upvotes: number
  downvotes: number
  onUpvote: () => void
  onDownvote: () => void
  size?: 'default' | 'lg'
  className?: string
}

export function VoteButtons({ 
  currentVote, 
  upvotes,
  downvotes,
  onUpvote, 
  onDownvote, 
  size = 'default',
  className 
}: VoteButtonsProps) {
  const iconSize = size === 'lg' ? "h-5 w-5" : "h-4 w-4"
  const buttonSize = size === 'lg' ? "h-10" : "h-8"

  const checkMilestone = (currentNet: number, newNet: number) => {
    const milestones = [10, 100, 1000, 10000]
    const currentMilestone = milestones.find(m => currentNet < m) || 0
    const newMilestone = milestones.find(m => newNet >= m && newNet < m * 10) || 0
    
    return currentMilestone < newMilestone ? newMilestone : 0
  }

  const handleUpvote = () => {
    const currentNet = upvotes - downvotes
    let newNet = currentNet

    if (currentVote === 'downvote') {
      newNet += 2 // Adding 1 for removing downvote and 1 for adding upvote
    } else if (currentVote === 'upvote') {
      newNet -= 1 // Removing upvote
    } else {
      newNet += 1 // Adding new upvote
    }

    const milestone = checkMilestone(currentNet, newNet)
    if (milestone > 0) {
      confetti({
        particleCount: milestone >= 1000 ? 150 : milestone >= 100 ? 100 : 50,
        spread: milestone >= 1000 ? 90 : milestone >= 100 ? 75 : 60,
        origin: { y: 0.6 },
        colors: ['#22c55e', '#16a34a', '#15803d'] // Green colors
      })
    }

    onUpvote()
  }

  return (
    <div className={cn("flex items-center", className)}>
      <div className="flex items-center gap-1.5">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  variant="ghost" 
                  onClick={handleUpvote}
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
              <p>Support this idea</p>
              {currentVote === 'upvote' && (
                <p className="text-sm text-muted-foreground">You&apos;re supporting this idea</p>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  variant="ghost"
                  onClick={onDownvote}
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
              <p>Withdraw support</p>
              {currentVote === 'downvote' && (
                <p className="text-sm text-muted-foreground">You&apos;ve withdrawn support</p>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  )
} 