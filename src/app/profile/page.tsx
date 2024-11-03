import { Suspense } from "react"
import { ProfileContent } from "./components/profile-content"
import { ProfileSkeleton } from "./components/profile-skeleton"
import { ProfileHeader } from "./components/profile-header"
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export const metadata = {
  title: "Profile - Your App Name",
  description: "Manage your profile settings and preferences",
}

export default async function ProfilePage() {
  const supabase = createServerComponentClient({ cookies })
  
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/auth?redirectTo=/profile')
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4 space-y-8">
      <Suspense fallback={<ProfileSkeleton />}>
        <ProfileHeader />
        <ProfileContent />
      </Suspense>
    </div>
  )
}
