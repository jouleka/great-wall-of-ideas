interface Config {
  url: string
  anonKey: string
  serviceRole: string
}

const productionConfig: Config = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  serviceRole: process.env.NEXT_PUBLIC_SERVICE_SUPABASE_ROLE_KEY!
}

const developmentConfig: Config = {
  url: process.env.NEXT_PUBLIC_SUPABASE_DEV_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_DEV_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  serviceRole: process.env.NEXT_PUBLIC_SERVICE_SUPABASE_ROLE_KEY!
}

export const supabaseConfig = 
  process.env.NEXT_PUBLIC_APP_ENV === 'production' 
    ? productionConfig 
    : developmentConfig 