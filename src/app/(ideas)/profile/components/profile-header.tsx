"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Camera, Loader2 } from "lucide-react"
import { useAppStore } from "@/lib/store/use-app-store"
import { getInitials } from "@/lib/utils/string-utils"
import { motion } from "framer-motion"
import { ActivityGraph } from "@/components/layout/activity-graph"
import { Skeleton } from "@/components/ui/skeleton"
import { useActivityData } from "@/hooks/use-activity-data"
import { useCallback, useState } from 'react'
import { uploadProfileImage } from '@/lib/utils/image-utils'
import { toast } from 'sonner'

export function ProfileHeader() {
  const { user, refreshSession } = useAppStore()
  const { data } = useActivityData(user?.id)
  const [isUploading, setIsUploading] = useState(false)
  
  const handleImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user?.id) return
    
    setIsUploading(true)
    try {
      await uploadProfileImage(file, user.id)
      await refreshSession()
      toast.success('Profile image updated')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update image')
    } finally {
      setIsUploading(false)
      event.target.value = ''
    }
  }, [user?.id, refreshSession])
  
  if (!user?.profile) {
    return (
      <div className="relative w-full mb-4 sm:mb-8">
        <div className="h-32 bg-muted rounded-lg animate-pulse" />
        <div className="relative pt-16 sm:pt-20 pb-6 sm:pb-8 px-3 sm:px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col items-center sm:flex-row sm:items-end sm:space-x-6">
              <div className="relative -mt-20 sm:-mt-24 mb-3 sm:mb-0">
                <Skeleton className="h-24 w-24 sm:h-32 sm:w-32 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  const initials = getInitials(user.profile.full_name || user.profile.username || '')
  
  // Calculate totals from activity data with safe default
  const totals = (data || []).reduce((acc, day) => ({
    ideas: acc.ideas + day.ideas,
    comments: acc.comments + day.comments,
    votes: acc.votes + day.votes
  }), { ideas: 0, comments: 0, votes: 0 })
  
  return (
    <div className="relative w-full mb-4 sm:mb-8">
      <ActivityGraph />
      
      <div className="relative pt-16 sm:pt-20 pb-6 sm:pb-8 px-3 sm:px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col items-center sm:flex-row sm:items-end sm:space-x-6">
            {/* Avatar Upload Section */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="relative -mt-20 sm:-mt-24 mb-3 sm:mb-0"
            >
              <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-background shadow-xl">
                <AvatarImage 
                  src={user.profile.avatar_url || ''} 
                  alt={user.profile.username || ''}
                  onError={(e) => e.currentTarget.src = ''}
                />
                <AvatarFallback className="text-2xl sm:text-4xl">{initials}</AvatarFallback>
              </Avatar>
              
              <label 
                htmlFor="avatar-upload" 
                className={`absolute -bottom-2 -right-2 rounded-full p-1.5 bg-background border-2 border-border hover:bg-accent transition-colors cursor-pointer ${isUploading ? 'pointer-events-none' : ''}`}
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={isUploading}
                />
              </label>
            </motion.div>

            {/* User Info Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="text-center sm:text-left flex-1"
            >
              <h1 className="text-2xl sm:text-3xl font-semibold">
                {user.profile.full_name || user.profile.username}
              </h1>
              <p className="text-muted-foreground mt-1">@{user.profile.username}</p>
              {user.profile.bio && (
                <p className="mt-2 text-sm sm:text-base max-w-2xl">
                  {user.profile.bio}
                </p>
              )}
            </motion.div>

            {/* Stats Section */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="flex gap-4 sm:gap-6 mt-4 sm:mt-0"
            >
              <div className="text-center">
                <p className="text-2xl sm:text-3xl font-semibold">{totals.ideas}</p>
                <p className="text-sm text-muted-foreground">Ideas</p>
              </div>
              <div className="text-center">
                <p className="text-2xl sm:text-3xl font-semibold">{totals.comments}</p>
                <p className="text-sm text-muted-foreground">Comments</p>
              </div>
              <div className="text-center">
                <p className="text-2xl sm:text-3xl font-semibold">{totals.votes}</p>
                <p className="text-sm text-muted-foreground">Votes</p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
