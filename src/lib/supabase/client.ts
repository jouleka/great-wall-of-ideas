import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/lib/types/database'
import { supabaseConfig } from '@/lib/config/supabase'

export function createSupabaseClient() {
  return createClientComponentClient<Database>({
    supabaseUrl: supabaseConfig.url,
    supabaseKey: supabaseConfig.anonKey
  })
}