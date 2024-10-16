"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "./hooks/use-auth"
import { AuthForm } from "./components/auth-form"

export default function AuthPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && user) {
      router.push('/ideas')
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (user) {
    return null // This will prevent a flash of content before redirecting
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <AuthForm />
    </div>
  )
}
