import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { ExtendedUser } from '../lib/types/auth'
import useSWR from 'swr'

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

  const { 
    data: user, 
    error, 
    isLoading, 
    mutate 
  } = useSWR<ExtendedUser | null>('auth-user', fetchUserAndProfile)

  async function signOut() {
    try {
      await supabase.auth.signOut()
      await mutate(null, false)
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
    refreshUser: () => mutate()
  }
}
