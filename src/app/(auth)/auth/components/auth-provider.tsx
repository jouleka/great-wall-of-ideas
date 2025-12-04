'use client'

import React, { useEffect, useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'
import { Loading } from "@/components/ui/loading"
import { useAppStore } from '@/lib/store/use-app-store'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const supabase = createSupabaseClient()
  const { setUser } = useAppStore()

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    if (!mounted) return

    let isSubscribed = true

    const checkUser = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error checking session:', error)
          if (isSubscribed) {
            setUser(null)
            setLoading(false)
          }
          return
        }
        
        if (isSubscribed) {
          setUser(session?.user ?? null)
          setLoading(false)
        }
      } catch (error) {
        console.error('Error checking user:', error)
        if (isSubscribed) {
          setUser(null)
          setLoading(false)
        }
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
      if (!isSubscribed) return

      switch (event) {
        case 'SIGNED_OUT':
          setUser(null)
          setLoading(false)
          break
        case 'SIGNED_IN':
          if (session?.user) {
            setUser(session.user)
          }
          setLoading(false)
          break
        case 'TOKEN_REFRESHED':
          if (!session) {
            setUser(null)
          } else if (session.user) {
            setUser(session.user)
          }
          setLoading(false)
          break
        default:
          setLoading(false)
          break
      }
    })

    checkUser()

    return () => {
      isSubscribed = false
      subscription.unsubscribe()
    }
  }, [supabase, mounted, setUser])

  // Only show loading when we're checking the initial session
  if (!mounted || (loading && !useAppStore.getState().user)) {
    return (
      <div className="min-h-screen">
        <Loading text="Setting things up..." />
      </div>
    )
  }

  return <>{children}</>
}
