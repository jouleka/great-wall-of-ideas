"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { AuthForm } from "./components/auth-form"
import { Loading } from "@/components/ui/loading"

export default function AuthPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isLoading } = useAuth()
  const redirectTo = searchParams.get('redirectTo') || '/ideas'

  useEffect(() => {
    if (!isLoading && user) {
      router.push(redirectTo)
    }
  }, [user, isLoading, router, redirectTo])

  if (isLoading) {
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
