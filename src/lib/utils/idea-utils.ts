import { Idea } from "@/lib/types/idea"
import { LucideIcon, Lightbulb, Flame, Star, TrendingUp, Rocket, Target, Building } from "lucide-react"
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

// Category to icon mapping
const categoryIcons: Record<string, LucideIcon> = {
  feature: Rocket,
  improvement: Target,
  bug: Building,
  default: Lightbulb
}

// Status to badge mapping
const statusBadges: Record<string, { text: string; variant: string }> = {
  pending: { text: "Published", variant: "yellow" },
  approved: { text: "Approved", variant: "green" },
  rejected: { text: "Not Planned", variant: "red" },
  implemented: { text: "Shipped", variant: "blue" },
  planned: { text: "Coming Soon", variant: "purple" }
}

export function useIdeaIcon(category: string): LucideIcon {
  return useMemo(() => {
    return categoryIcons[category.toLowerCase()] || categoryIcons.default
  }, [category])
}

export function useIdeaBadge(status: string): { text: string; variant: string } | null {
  return useMemo(() => {
    // First check status badges
    if (status in statusBadges) {
      return statusBadges[status]
    }

    // If no status badge, calculate dynamic badge based on votes and time
    const dynamicStatus = getIdeaStatus({ status } as Idea).badge
    return dynamicStatus
  }, [status])
}

function getIdeaStatus(idea: Idea): IdeaStatus {
  const score = idea.upvotes - idea.downvotes
  const createdAt = new Date(idea.created_at).getTime()
  const now = Date.now()

  // Dynamic badges based on popularity and time
  if (now - createdAt <= MONTH_IN_MS && score > IDEA_OF_MONTH_THRESHOLD) {
    return { 
      icon: Star, 
      badge: { text: "Idea of the Month", variant: "purple" } 
    }
  }
  if (now - createdAt <= WEEK_IN_MS && score > IDEA_OF_WEEK_THRESHOLD) {
    return { 
      icon: Flame, 
      badge: { text: "Idea of the Week", variant: "indigo" } 
    }
  }
  if (score > TOP_IDEA_THRESHOLD) {
    return { 
      icon: TrendingUp, 
      badge: { text: "Top Idea", variant: "yellow" } 
    }
  }
  if (score > HOT_IDEA_THRESHOLD) {
    return { 
      icon: Flame, 
      badge: { text: "Hot Idea", variant: "orange" } 
    }
  }
  if (score > TRENDING_IDEA_THRESHOLD) {
    return { 
      icon: TrendingUp, 
      badge: { text: "Trending", variant: "green" } 
    }
  }

  // Default status
  return { 
    icon: categoryIcons[idea.category?.toLowerCase()] || categoryIcons.default, 
    badge: statusBadges[idea.status] || null 
  }
}