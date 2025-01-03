'use client'

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react'
import { createClientComponentClient, User } from '@supabase/auth-helpers-nextjs'
import { Loading } from "@/components/ui/loading"
import { useRouter } from 'next/navigation'
import * as authService from '@/lib/services/auth'

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (emailOrUsername: string, password: string) => Promise<void>
  signUp: (email: string, password: string, username: string) => Promise<{ user: User | null; error: unknown | null }>
  signOut: () => Promise<void>
  signInWithGoogle: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const supabase = createClientComponentClient()
  const router = useRouter()

  // Handle mounting state
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
          
          // If we have a session and we're on the auth page, redirect to ideas
          if (session?.user && window.location.pathname.includes('/auth')) {
            router.push('/ideas')
          }
        }
      } catch (error) {
        console.error('Error checking user:', error)
        if (isSubscribed) {
          setUser(null)
          setLoading(false)
        }
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isSubscribed) return

      switch (event) {
        case 'SIGNED_OUT':
          setUser(null)
          setLoading(false)
          break
        case 'SIGNED_IN':
          if (session?.user) {
            setUser(session.user)
            // Immediate redirect on sign in
            router.push('/ideas')
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
  }, [supabase, mounted, router])

  const signOut = useCallback(async () => {
    if (!mounted) return
    try {
      await authService.signOut()
      
      // Clear local state
      setUser(null)
      
      // Clear any stored tokens and session data
      if (typeof window !== 'undefined') {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('sb-') || 
              key.startsWith('supabase.') || 
              key.includes('token') || 
              key.includes('session')) {
            localStorage.removeItem(key)
          }
        })
      }

      // Force a hard reload of all data
      router.refresh()
      
      // Navigate to auth page
      router.push('/auth')
    } catch (error) {
      console.error('Error clearing auth state:', error)
      throw error
    }
  }, [mounted, router])

  const signIn = useCallback(async (emailOrUsername: string, password: string) => {
    if (!mounted) return
    try {
      const { error } = await authService.signInWithEmailOrUsername(emailOrUsername, password)
      if (error) throw error
      
      // Immediately redirect after successful login
      router.push('/ideas')
      router.refresh()
    } catch (error) {
      throw error
    }
  }, [mounted, router])

  const signUp = useCallback(async (email: string, password: string, username: string) => {
    if (!mounted) return { user: null, error: new Error('Component not mounted') }
    try {
      return await authService.signUp(email, password, username)
    } catch (error) {
      console.error('Error in signUp:', error)
      return { user: null, error: error instanceof Error ? error : new Error('An unknown error occurred') }
    }
  }, [mounted])

  const signInWithGoogle = useCallback(async () => {
    if (!mounted) return
    try {
      const { error } = await authService.signInWithGoogle()
      if (error) throw error
      
      // Redirect is handled by OAuth callback
    } catch (error) {
      throw error
    }
  }, [mounted])

  const value = useMemo(() => ({
    user,
    loading,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
  }), [user, loading, signIn, signUp, signOut, signInWithGoogle])

  // Only show loading when we're checking the initial session
  if (!mounted || (loading && user === null)) {
    return (
      <div className="min-h-screen">
        <Loading text="Setting things up..." />
      </div>
    )
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
