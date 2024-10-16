// This file would contain the actual implementation of authentication methods
// You'll need to integrate with your chosen authentication provider (e.g., Firebase, Auth0, or a custom backend)

import { supabase } from './supabase'
import { User } from '@supabase/supabase-js'

export async function signUp(email: string, password: string, name: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: name,
      },
    },
  })

  if (error) throw error

  return data
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) throw error

  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
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
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
  })

  if (error) throw error

  return data
}

export async function signInWithGithub() {
  // Implement GitHub sign in logic
}
