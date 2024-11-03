import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useEffect, useState } from "react"

export interface ActivityData {
  date: string
  ideas: number
  comments: number
  votes: number
  total: number
}

export function useActivityData(userId: string | undefined) {
  const [data, setData] = useState<ActivityData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const supabase = createClientComponentClient()

  useEffect(() => {
    async function fetchActivityData() {
      if (!userId) return

      try {
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        
        // Fetch ideas, comments, and votes in parallel
        const [ideasRes, commentsRes, votesRes] = await Promise.all([
          supabase
            .from('ideas')
            .select('created_at')
            .eq('user_id', userId)
            .gte('created_at', thirtyDaysAgo.toISOString()),
          
          supabase
            .from('comments')
            .select('created_at')
            .eq('user_id', userId)
            .gte('created_at', thirtyDaysAgo.toISOString()),
          
          supabase
            .from('votes')
            .select('voted_at')
            .eq('user_id', userId)
            .gte('voted_at', thirtyDaysAgo.toISOString())
        ])

        // Process the data into daily counts
        const activityMap = new Map<string, ActivityData>()
        
        // Initialize the last 30 days
        for (let i = 0; i < 30; i++) {
          const date = new Date()
          date.setDate(date.getDate() - i)
          const dateStr = date.toISOString().split('T')[0]
          activityMap.set(dateStr, {
            date: dateStr,
            ideas: 0,
            comments: 0,
            votes: 0,
            total: 0
          })
        }

        // Count ideas
        ideasRes.data?.forEach(idea => {
          const date = new Date(idea.created_at).toISOString().split('T')[0]
          const data = activityMap.get(date)
          if (data) {
            data.ideas++
            data.total++
          }
        })

        // Count comments
        commentsRes.data?.forEach(comment => {
          const date = new Date(comment.created_at).toISOString().split('T')[0]
          const data = activityMap.get(date)
          if (data) {
            data.comments++
            data.total++
          }
        })

        // Count votes
        votesRes.data?.forEach(vote => {
          const date = new Date(vote.voted_at).toISOString().split('T')[0]
          const data = activityMap.get(date)
          if (data) {
            data.votes++
            data.total++
          }
        })

        // Convert map to array and sort by date
        const sortedData = Array.from(activityMap.values())
          .sort((a, b) => a.date.localeCompare(b.date))

        setData(sortedData)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch activity data'))
      } finally {
        setIsLoading(false)
      }
    }

    fetchActivityData()
  }, [userId, supabase])

  return { data, isLoading, error }
}