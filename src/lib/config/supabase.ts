interface Config {
  url: string
  anonKey: string
  serviceRole: string
}

const config: Config = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  serviceRole: process.env.NEXT_PUBLIC_SERVICE_SUPABASE_ROLE_KEY!
}

export const supabaseConfig = config