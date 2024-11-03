import { useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { ExtendedUser } from '@/lib/types/auth'
import useSWR from 'swr'

// Move fetcher logic outside the hook for reusability
async function fetchUserAndProfile() {
  const supabase = createClientComponentClient()
  const [{ data: { user } }, { data: profiles }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('profiles').select('*')
  ])

  if (!user) return null

  const profile = profiles?.find(p => p.id === user.id)
  return { ...user, profile } as ExtendedUser
}

export function useAuth() {
  const supabase = createClientComponentClient()
  const router = useRouter()

  // Use SWR for data fetching and caching
  const { 
    data: user, 
    error, 
    isLoading, 
    mutate 
  } = useSWR<ExtendedUser | null>('auth-user', fetchUserAndProfile, {
    revalidateOnFocus: false, // Disable revalidation on window focus
    dedupingInterval: 60000, // Dedupe requests within 1 minute
    shouldRetryOnError: false // Don't retry on auth errors
  })

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_IN') {
        // Revalidate the cache when user signs in
        await mutate()
      } else if (event === 'SIGNED_OUT') {
        // Clear the cache when user signs out
        await mutate(null, false)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, mutate])

  async function signOut() {
    try {
      await supabase.auth.signOut()
      await mutate(null, false) // Clear cache without revalidation
      router.refresh()
      router.push('/auth')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return { 
    user, 
    isLoading, 
    isError: error,
    signOut,
    refreshUser: () => mutate() // Expose method to manually refresh
  }
}
