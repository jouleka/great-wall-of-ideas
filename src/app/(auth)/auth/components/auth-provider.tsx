'use client'

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react'
import { createClientComponentClient, User } from '@supabase/auth-helpers-nextjs'
import { authService } from '@/lib/services/auth-service'
import { Loading } from "@/components/ui/loading"

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

  // Function to clear auth state
  const clearAuthState = useCallback(async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      
      // Only access localStorage after component is mounted
      if (typeof window !== 'undefined') {
        localStorage.removeItem('supabase.auth.token')
        window.location.reload()
      }
    } catch (error) {
      console.error('Error clearing auth state:', error)
    }
  }, [supabase])

  // Handle mounting state
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const checkUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        
        if (error) {
          console.error('Error checking user:', error)
          await clearAuthState()
          return
        }
        
        setUser(user)
      } catch (error) {
        console.error('Error checking user:', error)
        await clearAuthState()
      } finally {
        setLoading(false)
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        await clearAuthState()
      } else if (event === 'TOKEN_REFRESHED' && !session) {
        await clearAuthState()
      } else if (session?.user) {
        setUser(session.user)
      }
      
      setLoading(false)
    })

    checkUser()

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, clearAuthState, mounted])

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

  const signOut = useCallback(async () => {
    if (!mounted) return
    await clearAuthState()
  }, [clearAuthState, mounted])

  const signInWithGoogle = useCallback(async () => {
    if (!mounted) return
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
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

  // Only show loading when we have a user and are verifying their session
  if (!mounted || (loading && user !== null)) {
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
