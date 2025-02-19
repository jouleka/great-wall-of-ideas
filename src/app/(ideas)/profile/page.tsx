"use client"

import { useEffect } from "react"
import { ProfileContent } from "./components/profile-content"
import { ProfileHeader } from "./components/profile-header"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useAuth } from "@/hooks/use-auth"

export default function ProfilePage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && !user) {
      toast.error("Please sign in to view your profile")
      router.push('/auth?redirectTo=/profile')
    }
  }, [router, user, isLoading])

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4 space-y-8">
        <div className="animate-pulse space-y-8">
          <div className="h-32 bg-muted rounded-lg" />
          <div className="h-64 bg-muted rounded-lg" />
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4 space-y-8">
      <ProfileHeader />
      <ProfileContent />
    </div>
  )
}
