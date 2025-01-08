"use client"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Share2 } from "lucide-react"
import { cn } from "@/lib/utils/utils"
import { motion } from "framer-motion"
import { toast } from "sonner"

interface ShareButtonProps {
  ideaId: string
  title: string
  size?: 'default' | 'lg'
  className?: string
}

export function ShareButton({ 
  ideaId, 
  title,
  size = 'default',
  className 
}: ShareButtonProps) {
  const iconSize = size === 'lg' ? "h-5 w-5" : "h-4 w-4"
  const buttonSize = size === 'lg' ? "h-10" : "h-8"

  const handleShare = async () => {
    const url = `${window.location.origin}/ideas?id=${ideaId}`

    // Only use navigator.share on mobile devices
    if (navigator.share && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      try {
        await navigator.share({
          title: 'Great Wall of Ideas',
          text: `Check out this idea: ${title}`,
          url
        })
        return
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Error sharing:', error)
        }
      }
    }

    // For desktop or if share API fails, copy to clipboard
    try {
      await navigator.clipboard.writeText(url)
      toast.success("Link copied to clipboard!", {
        className: "dark:bg-zinc-800 dark:text-zinc-200",
        descriptionClassName: "dark:text-zinc-400"
      })
    } catch (error) {
      console.error('Error copying to clipboard:', error)
      toast.error("Failed to copy link", {
        className: "dark:bg-zinc-800 dark:text-zinc-200",
        descriptionClassName: "dark:text-zinc-400"
      })
    }
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button 
              variant="ghost" 
              onClick={handleShare}
              className={cn(
                buttonSize,
                "px-2 transition-colors duration-200",
                "hover:bg-blue-50 text-muted-foreground hover:text-blue-600",
                "dark:hover:bg-blue-950",
                className
              )}
            >
              <Share2 className={iconSize} />
            </Button>
          </motion.div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Share this idea</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
} 