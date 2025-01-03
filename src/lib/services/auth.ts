import { supabase } from './supabase'
import { User } from '@supabase/supabase-js'
import { toast } from 'sonner'
import { getBaseUrl } from '@/lib/utils/get-base-url'

export async function signUp(email: string, password: string, name: string) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: name,
          full_name: name
        },
        emailRedirectTo: `${getBaseUrl()}/auth/callback`
      },
    })

    if (error) throw error

    toast.success("Check your email!", {
      description: "We've sent you a confirmation link to activate your account."
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

    toast.success("Welcome back!", {
      description: "Successfully signed in"
    })
    return { session: data.session, error: null }
  } catch (error) {
    console.error('Sign in error:', error)
    toast.error("Login failed", {
      description: error instanceof Error ? error.message : "Please check your credentials."
    })
    return { session: null, error }
  }
}

export async function signInWithEmailOrUsername(emailOrUsername: string, password: string) {
  try {
    // First, check if input is an email
    const isEmail = emailOrUsername.includes('@')
    
    if (isEmail) {
      return await signIn(emailOrUsername, password)
    } else {
      // If it's a username, use our database function to get the email
      const { data: emailData, error: emailError } = await supabase
        .rpc('get_user_email_by_username', {
          username_input: emailOrUsername
        })

      if (emailError || !emailData) {
        throw new Error('Username not found')
      }

      // Sign in with the retrieved email
      return await signIn(emailData, password)
    }
  } catch (error) {
    console.error('Error in signInWithEmailOrUsername:', error)
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

    toast.success("Signed out successfully", {
      description: "Come back soon!"
    })
  } catch (error) {
    console.error('Sign out error:', error)
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
        redirectTo: `${getBaseUrl()}/ideas`,
      },
    })

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Google sign in error:', error)
    toast.error("Google sign in failed", {
      description: error instanceof Error ? error.message : "Please try again later."
    })
    return { data: null, error }
  }
} 