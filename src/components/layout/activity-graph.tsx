"use client"

import { motion } from "framer-motion"
import { useMemo } from "react"
import { cn } from "@/lib/utils/utils"
import { useAuth } from "@/hooks/use-auth"
import { useActivityData } from "@/hooks/use-activity-data"
import { Skeleton } from "@/components/ui/skeleton"

export function ActivityGraph() {
  const { user } = useAuth()
  const { data, isLoading, error } = useActivityData(user?.id)
  
  const { points, trend, minValue, maxValue } = useMemo(() => {
    if (!data?.length) {
      return { points: '', trend: 'neutral' as const, minValue: 0, maxValue: 0 }
    }

    const width = 1000
    const height = 150
    const padding = 20
    const xStep = (width - padding * 2) / (data.length - 1)
    
    const values = data.map(d => d.total)
    const max = Math.max(...values)
    const min = Math.min(...values)
    const valueRange = Math.max(max - min, 10)
    
    const pointsStr = data.map((point, i) => {
      const x = padding + i * xStep
      const y = height - padding - ((point.total - min) / valueRange) * (height - padding * 2)
      return `${x},${y}`
    }).join(' ')

    // Calculate trend
    const recentAvg = data.slice(-7).reduce((sum, d) => sum + d.total, 0) / 7
    const olderAvg = data.slice(-14, -7).reduce((sum, d) => sum + d.total, 0) / 7
    const change = ((recentAvg - olderAvg) / olderAvg) * 100

    let trend: 'up' | 'down' | 'neutral' = 'neutral'
    if (Math.abs(change) >= 5) {
      trend = change > 0 ? 'up' : 'down'
    }

    return { points: pointsStr, trend, minValue: min, maxValue: max }
  }, [data])

  const trendColors = {
    up: "text-green-500",
    down: "text-red-500",
    neutral: "text-gray-400"
  }

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />
  }

  if (error || !points) {
    return null
  }

  return (
    <div className="absolute inset-0 h-48 overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-background" />
      
      {/* Grid pattern */}
      <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10" />
      
      {/* Activity graph - Added negative z-index to ensure it stays below */}
      <svg
        className="absolute inset-0 w-full h-full -z-10"
        preserveAspectRatio="none"
        viewBox="0 0 1000 150"
      >
        {/* Graph line */}
        <motion.path
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
          d={`M ${points}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn("transition-colors duration-300", trendColors[trend])}
        />
        
        {/* Area under the graph */}
        <motion.path
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5 }}
          d={`M ${points} L 980,150 L 20,150 Z`}
          fill={`url(#gradient-${trend})`}
          className="opacity-20"
        />
        
        {/* Gradient definitions */}
        <defs>
          <linearGradient id="gradient-up" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgb(34, 197, 94)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="rgb(34, 197, 94)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="gradient-down" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgb(239, 68, 68)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="rgb(239, 68, 68)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="gradient-neutral" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgb(156, 163, 175)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="rgb(156, 163, 175)" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
      
      {/* Activity indicators - No z-index needed anymore */}
      <div className="absolute bottom-4 right-4 flex items-center space-x-4 text-sm">
        <div className="flex items-center space-x-2">
          <div className={cn("w-2 h-2 rounded-full", trendColors[trend])} />
          <span className="text-muted-foreground hidden sm:inline-block">
            Activity {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
          </span>
          <span className="text-muted-foreground text-xs">
            {minValue.toFixed(0)} - {maxValue.toFixed(0)}
          </span>
        </div>
      </div>
    </div>
  )
}