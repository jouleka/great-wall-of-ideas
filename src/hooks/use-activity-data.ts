import { useEffect } from "react"
import { useAppStore } from "@/lib/store/use-app-store"

export interface ActivityData {
  date: string
  ideas: number
  comments: number
  votes: number
  total: number
}

export function useActivityData(userId: string | undefined) {
  const { activityData: data, activityLoading: isLoading, activityError: error, fetchActivityData } = useAppStore()

  useEffect(() => {
    if (userId) {
      fetchActivityData(userId)
    }
  }, [userId, fetchActivityData])

  return { data, isLoading, error }
}