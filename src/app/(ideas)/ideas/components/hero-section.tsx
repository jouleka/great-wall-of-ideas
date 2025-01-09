"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Lightbulb, Users, Trophy, TrendingUp } from "lucide-react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { cn } from "@/lib/utils/utils"

interface Stats {
  totalIdeas: number
  activeUsers: number
  successStories: number
  trendingNow: number
}

interface AnimatedNumberProps {
  value: number
  color: string
  previousValue?: number
}

const AnimatedNumber = ({ value, color, previousValue = 0 }: AnimatedNumberProps) => {
  const hasIncreased = value > previousValue
  
  return (
    <div className="h-8 relative overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={value}
          initial={{ y: hasIncreased ? 20 : -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: hasIncreased ? -20 : 20, opacity: 0 }}
          transition={{ 
            duration: 0.2,
            ease: "easeOut"
          }}
          className={cn("text-2xl font-bold absolute w-full text-center", color)}
        >
          {value.toLocaleString()}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

export function HeroSection() {
  const [stats, setStats] = useState<Stats>({
    totalIdeas: 0,
    activeUsers: 0,
    successStories: 0,
    trendingNow: 0
  })
  const [previousStats, setPreviousStats] = useState<Stats>({
    totalIdeas: 0,
    activeUsers: 0,
    successStories: 0,
    trendingNow: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClientComponentClient()

  const fetchStats = useCallback(async () => {
    try {
      const { count: totalIdeas } = await supabase
        .from('ideas')
        .select('*', { count: 'exact', head: true })

      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const { count: activeUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gt('updated_at', sevenDaysAgo.toISOString())

      const { count: successStories } = await supabase
        .from('ideas')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'implemented')

      const oneDayAgo = new Date()
      oneDayAgo.setDate(oneDayAgo.getDate() - 1)
      const { count: trendingNow } = await supabase
        .from('ideas')
        .select('*', { count: 'exact', head: true })
        .gt('updated_at', oneDayAgo.toISOString())

      // Save current stats as previous before updating
      setPreviousStats(stats)

      // Update with new stats
      setStats({
        totalIdeas: totalIdeas || 0,
        activeUsers: activeUsers || 0,
        successStories: successStories || 0,
        trendingNow: trendingNow || 0
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setIsLoading(false)
    }
  }, [stats])

  useEffect(() => {
    fetchStats()

    const channel = supabase.channel('ideas-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'ideas' 
      }, () => {
        fetchStats()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, fetchStats])

  const statItems = useMemo(() => [
    {
      icon: Lightbulb,
      label: "Total Ideas",
      value: stats.totalIdeas,
      previousValue: previousStats.totalIdeas,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
    },
    {
      icon: Users,
      label: "Active Users",
      value: stats.activeUsers,
      previousValue: previousStats.activeUsers,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      icon: Trophy,
      label: "Success Stories",
      value: stats.successStories,
      previousValue: previousStats.successStories,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      icon: TrendingUp,
      label: "Trending Now",
      value: stats.trendingNow,
      previousValue: previousStats.trendingNow,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
  ], [stats, previousStats])

  return (
    <div className="w-full mb-8 rounded-lg border bg-card p-4 sm:p-6 shadow-lg">
      <div className="text-center mb-6">
        <motion.h1 
          className="text-2xl sm:text-3xl font-bold mb-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Where Ideas Come to Life
        </motion.h1>
        <motion.p 
          className="text-muted-foreground max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          Join our thriving community of innovators and thought leaders. Share your ideas, get feedback, and watch them grow.
        </motion.p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statItems.map((item, index) => (
          <motion.div
            key={item.label}
            className={cn(
              "rounded-lg p-4 text-center",
              item.bgColor,
              isLoading && "animate-pulse"
            )}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <div className="flex justify-center mb-2">
              <item.icon className={cn("w-6 h-6", item.color)} />
            </div>
            <AnimatedNumber 
              value={item.value} 
              color={item.color}
              previousValue={item.previousValue}
            />
            <div className="text-sm text-muted-foreground">
              {item.label}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
} 