'use client'

import { useAppStore } from '@/lib/store/use-app-store'
import { useRouter } from 'next/navigation'
import { ExtendedUser } from '../lib/types/auth'

/**
 * Thin wrapper around useAppStore for auth functionality.
 * This hook provides a consistent interface for components that need auth state.
 * All auth state is managed by useAppStore - this just exposes it.
 */
export function useAuth() {
  const router = useRouter()
  const { user, loading, signOut: storeSignOut, refreshSession } = useAppStore()

  async function signOut() {
    try {
      await storeSignOut()
      router.refresh()
      router.push('/auth')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return { 
    user: user as ExtendedUser | null, 
    isLoading: loading, 
    isError: null,
    signOut,
    refreshUser: refreshSession
  }
}
