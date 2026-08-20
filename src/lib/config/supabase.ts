interface Config {
  url: string
  anonKey: string
}

const config: Config = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
}

export const supabaseConfig = config
