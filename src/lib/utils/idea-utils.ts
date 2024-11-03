import { Idea } from "@/lib/types/idea"
import { LucideIcon, Lightbulb, Flame, Star, TrendingUp } from "lucide-react"
import { useMemo } from 'react'

const WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000
const MONTH_IN_MS = 30 * 24 * 60 * 60 * 1000
const IDEA_OF_WEEK_THRESHOLD = 50
const IDEA_OF_MONTH_THRESHOLD = 100
const TOP_IDEA_THRESHOLD = 100
const HOT_IDEA_THRESHOLD = 75
const TRENDING_IDEA_THRESHOLD = 50

interface IdeaStatus {
  icon: LucideIcon
  badge: { text: string; variant: string } | null
}

function getIdeaStatus(idea: Idea): IdeaStatus {
  const score = idea.upvotes - idea.downvotes
  const createdAt = new Date(idea.created_at).getTime()
  const now = Date.now()

  if (now - createdAt <= MONTH_IN_MS && score > IDEA_OF_MONTH_THRESHOLD) {
    return { icon: Star, badge: { text: "Idea of the Month", variant: "purple" } }
  }
  if (now - createdAt <= WEEK_IN_MS && score > IDEA_OF_WEEK_THRESHOLD) {
    return { icon: Flame, badge: { text: "Idea of the Week", variant: "indigo" } }
  }
  if (score > TOP_IDEA_THRESHOLD) {
    return { icon: TrendingUp, badge: { text: "Top Idea", variant: "yellow" } }
  }
  if (score > HOT_IDEA_THRESHOLD) {
    return { icon: TrendingUp, badge: { text: "Hot Idea", variant: "orange" } }
  }
  if (score > TRENDING_IDEA_THRESHOLD) {
    return { icon: TrendingUp, badge: { text: "Trending", variant: "green" } }
  }
  return { icon: Lightbulb, badge: null }
}

export function useIdeaIcon(idea: Idea): LucideIcon {
  return useMemo(() => getIdeaStatus(idea).icon, [idea])
}

export function useIdeaBadge(idea: Idea): { text: string; variant: string } | null {
  return useMemo(() => getIdeaStatus(idea).badge, [idea])
}