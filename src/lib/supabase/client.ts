import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { type Database } from '@/lib/types/database'

// Ensuring client is only created once in browser
let supabaseInstance: ReturnType<typeof createClientComponentClient<Database>> | null = null

export function createSupabaseClient() {
  if (typeof window === 'undefined') {
    return createClientComponentClient<Database>()
  }
  
  if (!supabaseInstance) {
    supabaseInstance = createClientComponentClient<Database>()
  }
  return supabaseInstance
}

export const supabase = createSupabaseClient()

export type SupabaseClient = ReturnType<typeof createClientComponentClient<Database>>
export type RealtimeChannel = ReturnType<SupabaseClient['channel']>