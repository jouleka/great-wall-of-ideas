"use client"

import { memo } from 'react'
import { cn } from "@/lib/utils/utils"
import { Flame, TrendingUp, Award } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useVotesStore } from '@/lib/store/use-votes-store'

export interface VoteIndicatorProps {
  ideaId: string
  size?: 'default' | 'lg'
  showTrend?: boolean
  className?: string
}

const VoteIndicator = memo(({ 
  ideaId,
  size = 'default',
  showTrend = false,
  className
}: VoteIndicatorProps) => {
  // Just read from store - no subscriptions, no initialization
  // Vote counts are synced when ideas are loaded and updated via global subscription
  const votes = useVotesStore(state => state.votes)
  const voteCounts = votes[ideaId] || { upvotes: 0, downvotes: 0 }
  const { upvotes, downvotes } = voteCounts
  const netVotes = upvotes - downvotes
  const isTrending = netVotes > 5
  
  const getBadgeStatus = () => {
    if (netVotes >= 100) return { text: "Community Favorite 🏆", icon: Award }
    if (netVotes >= 50) return { text: "Rising Star ⭐", icon: TrendingUp }
    if (netVotes >= 10) return { text: "Promising 🔥", icon: Flame }
    return null
  }
  
  const badge = getBadgeStatus()

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {/* Main support count */}
      <Badge 
        variant="secondary" 
        className={cn(
          "font-medium whitespace-nowrap",
          size === 'lg' ? "text-base px-3 py-1" : "text-sm px-2 py-0.5",
          netVotes > 0 ? "bg-green-100 text-green-700" :
          netVotes < 0 ? "bg-red-100 text-red-700" :
          "bg-muted text-muted-foreground"
        )}
      >
        <Flame className={cn(
          "mr-1",
          size === 'lg' ? "h-5 w-5" : "h-4 w-4"
        )} />
        {netVotes > 0 ? `${netVotes} supports` : 
         netVotes < 0 ? `${Math.abs(netVotes)} against` :
         "Neutral"}
      </Badge>

      {/* Trending indicator */}
      {showTrend && isTrending && (
        <Badge variant="secondary" className="bg-orange-100 text-orange-700">
          <TrendingUp className="w-3 h-3 mr-1" />
          Trending
        </Badge>
      )}

      {/* Achievement badge */}
      {badge && (
        <Badge 
          variant="secondary" 
          className={cn(
            "text-xs gap-1",
            size === 'lg' ? "text-sm px-3 py-1" : "px-2 py-0.5"
          )}
        >
          <badge.icon className={cn(
            "text-primary",
            size === 'lg' ? "w-4 h-4" : "w-3 h-3"
          )} />
          {badge.text}
        </Badge>
      )}
    </div>
  )
})

VoteIndicator.displayName = 'VoteIndicator'

export { VoteIndicator }
