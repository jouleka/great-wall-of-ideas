"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Camera, Loader2 } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { getInitials } from "@/lib/utils/string-utils"
import { motion } from "framer-motion"
import { ActivityGraph } from "@/components/layout/activity-graph"
import { Skeleton } from "@/components/ui/skeleton"
import { useActivityData } from "@/hooks/use-activity-data"
import { useCallback, useState } from 'react'
import { uploadProfileImage } from '@/lib/utils/image-utils'
import { toast } from 'sonner'

export function ProfileHeader() {
  const { user, refreshUser } = useAuth()
  const { data, isLoading } = useActivityData(user?.id)
  const [isUploading, setIsUploading] = useState(false)
  
  const handleImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user?.id) return
    
    setIsUploading(true)
    try {
      await uploadProfileImage(file, user.id)
      await refreshUser()
      toast.success('Profile image updated')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update image')
    } finally {
      setIsUploading(false)
      event.target.value = '' // Reset input
    }
  }, [user?.id, refreshUser])
  
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
      <ActivityGraph />
      
      <div className="relative pt-20 pb-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col items-center sm:flex-row sm:items-end sm:space-x-6">
            {/* Avatar Upload Section */}
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
                  onError={(e) => e.currentTarget.src = ''}
                />
                <AvatarFallback className="text-4xl">{initials}</AvatarFallback>
              </Avatar>
              <div className="absolute bottom-0 right-0 z-10">
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={isUploading}
                />
                <Button
                  size="icon"
                  variant="secondary"
                  className="rounded-full"
                  disabled={isUploading}
                  onClick={() => document.getElementById('avatar-upload')?.click()}
                  type="button"
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </Button>
              </div>
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
