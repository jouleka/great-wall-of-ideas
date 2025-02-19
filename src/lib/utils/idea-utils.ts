import { Idea } from "@/lib/types/idea"
import { 
  LucideIcon, Lightbulb, Flame, Star, TrendingUp, Rocket, Target, Building, 
  Code, Cpu, Brain, ShoppingCart, HeartHandshake, Gamepad, Pen, Film, 
  Leaf, GraduationCap, Stethoscope, Link, Signal, Cloud, Shield, Settings,
  Wallet, Home, Timer, Users, Music, PenTool, Palette, Video, Camera,
  Heart, Accessibility, Scale, Laptop, Languages, Baby, TestTube, Activity,
  Dumbbell, Apple, Play, Glasses, Ticket, Trophy, Sun, Recycle, Car, Monitor
} from "lucide-react"
import { useMemo, useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

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
export const categoryIcons: Record<string, LucideIcon> = {
  // Technology
  'software-apps': Code,
  'hardware': Cpu,
  'ai-ml': Brain,
  'blockchain': Link,
  'iot': Signal,
  'cloud': Cloud,
  'cybersecurity': Shield,
  'devops': Settings,
  'technology': Monitor,

  // Business
  'startups': Rocket,
  'ecommerce': ShoppingCart,
  'services': HeartHandshake,
  'fintech': Wallet,
  'marketing': Target,
  'real-estate': Home,
  'productivity': Timer,
  'hr': Users,
  'business': Building,

  // Creative
  'games': Gamepad,
  'design': Pen,
  'media': Film,
  'music': Music,
  'writing': PenTool,
  'art': Palette,
  'animation': Video,
  'photography': Camera,
  'creative': Palette,

  // Social Impact
  'community': Users,
  'non-profit': Heart,
  'accessibility': Accessibility,
  'diversity': Users,
  'social-justice': Scale,
  'humanitarian': HeartHandshake,
  'social-impact': Heart,

  // Education
  'elearning': Laptop,
  'edtech': Lightbulb,
  'language': Languages,
  'professional-dev': GraduationCap,
  'early-education': Baby,
  'stem': TestTube,
  'education': GraduationCap,

  // Health
  'digital-health': Activity,
  'mental-health': Brain,
  'fitness': Dumbbell,
  'nutrition': Apple,
  'medical-devices': Stethoscope,
  'telehealth': Video,
  'health': Stethoscope,

  // Entertainment
  'streaming': Play,
  'vr': Glasses,
  'live-events': Ticket,
  'gaming': Gamepad,
  'social-entertainment': Users,
  'sports': Trophy,
  'entertainment': Film,

  // Environment
  'clean-energy': Sun,
  'recycling': Recycle,
  'conservation': Leaf,
  'sustainable-transport': Car,
  'climate-tech': Cloud,
  'green-building': Home,
  'environment': Leaf,

  // Default
  'default': Lightbulb
}

// Status to badge mapping
const statusBadges: Record<string, { text: string; variant: string }> = {
  draft: { text: "Draft", variant: "gray" },
  in_review: { text: "In Review", variant: "yellow" },
  in_progress: { text: "In Progress", variant: "blue" },
  completed: { text: "Completed", variant: "green" },
  cancelled: { text: "Cancelled", variant: "red" },
  on_hold: { text: "On Hold", variant: "orange" }
}

export function useIdeaIcon(categoryId: string): LucideIcon {
  const [categorySlug, setCategorySlug] = useState<string>('default')

  useEffect(() => {
    const fetchCategory = async () => {
      if (!categoryId) return
      
      const supabase = createClientComponentClient()
      const { data: category } = await supabase
        .from('categories')
        .select('slug')
        .eq('id', categoryId)
        .single()

      if (category) {
        setCategorySlug(category.slug)
      }
    }

    fetchCategory()
  }, [categoryId])

  return useMemo(() => {
    return categoryIcons[categorySlug] || categoryIcons.default
  }, [categorySlug])
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
    icon: Lightbulb,
    badge: statusBadges[idea.status] || null 
  }
}

export function calculateEngagementScore(idea: Idea): number {
  const now = Date.now()
  const lastInteraction = new Date(idea.last_interaction_at).getTime()
  const timeFactor = Math.exp(-(now - lastInteraction) / (24 * 60 * 60 * 1000)) // Decay over 24 hours
  
  return (
    (idea.upvotes * 2) + // Upvotes weight
    (idea.views * 0.1) + // Views weight
    (idea.current_viewers * 5) + // Active viewers weight
    (timeFactor * 10) // Time decay factor
  )
}

export function getEngagementLevel(score: number): {
  label: string
  color: string
  intensity: number
} {
  if (score > 100) return { label: "🔥 Viral", color: "red", intensity: 100 }
  if (score > 75) return { label: "⚡ Hot", color: "orange", intensity: 75 }
  if (score > 50) return { label: "🚀 Rising", color: "yellow", intensity: 50 }
  if (score > 25) return { label: "💫 Active", color: "blue", intensity: 25 }
  return { label: "✨ New", color: "gray", intensity: 0 }
}