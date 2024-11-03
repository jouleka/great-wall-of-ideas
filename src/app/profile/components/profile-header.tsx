"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Camera } from "lucide-react"
import { useAuth } from "@/app/auth/hooks/use-auth"
import { getInitials } from "@/lib/utils/string-utils"
import { motion } from "framer-motion"
import { ActivityGraph } from "./activity-graph"
import { Skeleton } from "@/components/ui/skeleton"
import { useActivityData } from "../hooks/use-activity-data"

export function ProfileHeader() {
  const { user } = useAuth()
  const { data, isLoading } = useActivityData(user?.id)
  
  if (!user?.profile) return null
  
  const initials = getInitials(user.profile.full_name || user.profile.username || '')
  
  // Calculate totals from activity data
  const totals = data.reduce((acc, day) => ({
    ideas: acc.ideas + day.ideas,
    comments: acc.comments + day.comments,
    votes: acc.votes + day.votes
  }), { ideas: 0, comments: 0, votes: 0 })
  
  return (
    <div className="relative w-full mb-8">
      {/* Activity Graph Background */}
      <ActivityGraph />
      
      {/* Profile Content */}
      <div className="relative pt-20 pb-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col items-center sm:flex-row sm:items-end sm:space-x-6">
            {/* Avatar */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="relative -mt-24 mb-4 sm:mb-0"
            >
              <Avatar className="h-32 w-32 border-4 border-background shadow-xl">
                <AvatarImage 
                  src={user.profile.avatar_url || ''} 
                  alt={user.profile.username || ''} 
                />
                <AvatarFallback className="text-4xl">{initials}</AvatarFallback>
              </Avatar>
              <Button
                size="icon"
                variant="secondary"
                className="absolute bottom-0 right-0 rounded-full shadow-lg"
              >
                <Camera className="h-4 w-4" />
              </Button>
            </motion.div>

            {/* Profile Info */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="flex-1 text-center sm:text-left"
            >
              <h1 className="text-3xl font-bold tracking-tight">
                {user.profile.full_name}
              </h1>
              {user.profile.username && (
                <p className="text-muted-foreground">
                  @{user.profile.username}
                </p>
              )}
            </motion.div>

            {/* Stats */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="flex gap-6 mt-4 sm:mt-0"
            >
              {isLoading ? (
                <>
                  <Skeleton className="h-16 w-16" />
                  <Skeleton className="h-16 w-16" />
                  <Skeleton className="h-16 w-16" />
                </>
              ) : (
                <>
                  <div className="text-center">
                    <p className="text-2xl font-semibold">{totals.ideas}</p>
                    <p className="text-sm text-muted-foreground">Ideas</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-semibold">{totals.comments}</p>
                    <p className="text-sm text-muted-foreground">Comments</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-semibold">{totals.votes}</p>
                    <p className="text-sm text-muted-foreground">Votes</p>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
