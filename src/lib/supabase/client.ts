import { createBrowserClient } from '@supabase/ssr'

// Ensuring client is only created once in browser
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let supabaseInstance: ReturnType<typeof createBrowserClient> | null = null

export function createSupabaseClient() {
  if (typeof window === 'undefined') {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  
  if (!supabaseInstance) {
    supabaseInstance = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return supabaseInstance
}

export const supabase = createSupabaseClient()

export type SupabaseClient = ReturnType<typeof createSupabaseClient>
export type RealtimeChannel = ReturnType<SupabaseClient['channel']>