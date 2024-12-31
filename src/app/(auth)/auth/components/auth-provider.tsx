'use client'

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react'
import { createClientComponentClient, User } from '@supabase/auth-helpers-nextjs'
import { authService } from '@/lib/services/auth-service'
import { Loading } from "@/components/ui/loading"
import { toast } from "sonner"
import { useRouter } from 'next/navigation'

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (emailOrUsername: string, password: string) => Promise<void>
  signUp: (email: string, password: string, username: string) => Promise<{ user: User | null; error: Error | null }>
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

  // Function to clear auth state
  const clearAuthState = useCallback(async () => {
    try {
      setLoading(true)
      
      // First sign out from Supabase
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      // Then clear local state
      setUser(null)
      
      // Clear any stored tokens and session data
      if (typeof window !== 'undefined') {
        // Clear all Supabase-related items from localStorage
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

      toast.success('Logged out successfully')
    } catch (error) {
      console.error('Error clearing auth state:', error)
      toast.error('Error during logout', {
        description: 'Some session data may not have been cleared properly.'
      })
      throw error
    } finally {
      setLoading(false)
    }
  }, [supabase, router])

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
        
        if (error || !session) {
          console.error('Error checking session:', error)
          if (isSubscribed) {
            setUser(null)
            setLoading(false)
          }
          return
        }
        
        if (isSubscribed) {
          setUser(session.user)
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, !!session)
      
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
          // For any other event, just update the loading state
          setLoading(false)
          break
      }
    })

    checkUser()

    return () => {
      isSubscribed = false
      subscription.unsubscribe()
    }
  }, [supabase, mounted])

  const signOut = useCallback(async () => {
    if (!mounted) return
    await clearAuthState()
  }, [clearAuthState, mounted])

  const signIn = useCallback(async (emailOrUsername: string, password: string) => {
    if (!mounted) return
    try {
      const { error } = await authService.signInWithEmailOrUsername(emailOrUsername, password)
      if (error) throw error
    } catch (error) {
      throw error
    }
  }, [mounted])

  const signUp = useCallback(async (email: string, password: string, username: string) => {
    if (!mounted) return { user: null, error: new Error('Component not mounted') }
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            full_name: username,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) throw error

      return { user: data.user, error: null }
    } catch (error) {
      console.error('Error in signUp:', error)
      return { user: null, error: error instanceof Error ? error : new Error('An unknown error occurred') }
    }
  }, [supabase, mounted])

  const signInWithGoogle = useCallback(async () => {
    if (!mounted) return
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/ideas`,
        },
      })
      if (error) throw error
    } catch (error) {
      console.error('Error signing in with Google:', error)
      throw error
    }
  }, [supabase, mounted])

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
