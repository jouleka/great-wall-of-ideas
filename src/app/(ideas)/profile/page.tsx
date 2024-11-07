"use client"

import { useEffect } from "react"
import { ProfileContent } from "./components/profile-content"
import { ProfileHeader } from "./components/profile-header"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"
import { sessionUtils } from "@/lib/utils/session-utils"
import { toast } from "sonner"

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    let mounted = true

    async function checkSession() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) throw error
        
        if (!session && mounted) {
          toast.error("Please sign in to view your profile")
          router.push('/auth?redirectTo=/profile')
          return
        }

        // Start session refresh
        sessionUtils.startSessionRefresh()
      } catch (error) {
        console.error('Error checking session:', error)
        if (mounted) {
          toast.error("Failed to load profile")
          router.push('/auth?redirectTo=/profile')
        }
      }
    }

    checkSession()

    // Cleanup
    return () => {
      mounted = false
      sessionUtils.stopSessionRefresh()
    }
  }, [router, supabase.auth])

  // Add activity tracking
  useEffect(() => {
    const handleActivity = () => {
      sessionUtils.updateLastActivity()
    }

    window.addEventListener('mousemove', handleActivity)
    window.addEventListener('keydown', handleActivity)
    window.addEventListener('click', handleActivity)
    window.addEventListener('scroll', handleActivity)

    return () => {
      window.removeEventListener('mousemove', handleActivity)
      window.removeEventListener('keydown', handleActivity)
      window.removeEventListener('click', handleActivity)
      window.removeEventListener('scroll', handleActivity)
    }
  }, [])

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4 space-y-8">
      <ProfileHeader />
      <ProfileContent />
    </div>
  )
}
