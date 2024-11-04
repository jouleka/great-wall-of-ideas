'use client'

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react'
import { createClientComponentClient, User } from '@supabase/auth-helpers-nextjs'
import { authService } from '@/lib/services/auth-service'

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
  const supabase = createClientComponentClient()

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
      } catch (error) {
        console.error('Error checking user:', error)
      } finally {
        setLoading(false)
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    checkUser()

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  const signIn = useCallback(async (emailOrUsername: string, password: string) => {
    try {
      const { error } = await authService.signInWithEmailOrUsername(emailOrUsername, password)
      if (error) throw error
    } catch (error) {
      throw error
    }
  }, [])

  const signUp = useCallback(async (email: string, password: string, username: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username,
          },
        },
      })

      if (error) throw error

      return { user: data.user, error: null }
    } catch (error) {
      console.error('Error in signUp:', error)
      return { user: null, error: error instanceof Error ? error : new Error('An unknown error occurred') }
    }
  }, [supabase])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }, [supabase])

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) throw error
  }, [supabase])

  const value = useMemo(() => ({
    user,
    loading,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
  }), [user, loading, signIn, signUp, signOut, signInWithGoogle])

  if (loading) {
    return <div>Loading...</div> // Or a more sophisticated loading component
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
