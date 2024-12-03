import { supabase } from './supabase'
import { User } from '@supabase/supabase-js'
import { toast } from 'sonner'

export async function signUp(email: string, password: string, name: string) {
  try {
    console.log('Starting signup with:', { email, name })
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: name,
          full_name: name
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`
      },
    })

    console.log('Signup response:', { data, error })

    if (error) throw error

    toast.success("Registration successful!", {
      description: "Please check your email to confirm your account."
    })
    return { user: data.user, error: null }
  } catch (error) {
    console.error('Signup error:', error)
    toast.error("Registration failed", {
      description: error instanceof Error ? error.message : "Please try again later."
    })
    return { user: null, error }
  }
}

export async function signIn(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error

    toast.success("Welcome back!")
    return { session: data.session, error: null }
  } catch (error) {
    toast.error("Login failed", {
      description: error instanceof Error ? error.message : "Please check your credentials."
    })
    return { session: null, error }
  }
}

export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error

    toast.success("Signed out successfully")
  } catch (error) {
    toast.error("Error signing out", {
      description: "Please try again."
    })
    throw error
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export async function signInWithGoogle() {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) throw error
    return data
  } catch (error) {
    toast.error("Google sign in failed", {
      description: "Please try again later."
    })
    throw error
  }
} 