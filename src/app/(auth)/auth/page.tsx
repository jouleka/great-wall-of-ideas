"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAppStore } from "@/lib/store/use-app-store"
import { AuthForm } from "./components/auth-form"
import { Loading } from "@/components/ui/loading"

export default function AuthPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading } = useAppStore()
  const redirectTo = searchParams.get('redirectTo') || '/ideas'

  useEffect(() => {
    if (!loading && user) {
      router.push(redirectTo)
    }
  }, [user, loading, router, redirectTo])

  if (loading) {
    return (
      <div className="min-h-screen">
        <Loading text="Getting ready..." />
      </div>
    )
  }

  if (user) {
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <AuthForm defaultTab={searchParams.get('tab') || 'login'} />
    </div>
  )
}
