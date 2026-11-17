import { cache } from 'react'
import { createClient } from '@supabase/supabase-js'
import { isUuid } from './site'

// Read-only access to public ideas for metadata, structured data and the
// sitemap. The client carries no user session, so Supabase evaluates RLS as
// `anon`: private ideas are never returned. The explicit is_private filter is
// defence in depth, not the access control.

const REQUEST_TIMEOUT_MS = 5000

export interface PublicIdea {
  id: string
  title: string
  description: string
  target_audience: string | null
  author_name: string | null
  is_anonymous: boolean | null
  created_at: string
  updated_at: string | null
  upvotes: number | null
  tags: string[] | null
}

export interface PublicIdeaSitemapEntry {
  id: string
  created_at: string
  updated_at: string | null
}

function createAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) return null

  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}

export const getPublicIdea = cache(async (id: string): Promise<PublicIdea | null> => {
  if (!isUuid(id)) return null

  const supabase = createAnonClient()
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from('ideas')
      .select('id, title, description, target_audience, author_name, is_anonymous, created_at, updated_at, upvotes, tags')
      .eq('id', id)
      .eq('is_private', false)
      .abortSignal(AbortSignal.timeout(REQUEST_TIMEOUT_MS))
      .maybeSingle()

    if (error) {
      console.error('SEO: failed to load public idea', error.message)
      return null
    }
    return (data as PublicIdea | null) ?? null
  } catch (error) {
    console.error('SEO: failed to load public idea', error)
    return null
  }
})

export async function getPublicIdeasForSitemap(limit: number): Promise<PublicIdeaSitemapEntry[]> {
  const supabase = createAnonClient()
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from('ideas')
      .select('id, created_at, updated_at')
      .eq('is_private', false)
      .order('created_at', { ascending: false })
      .limit(limit)
      .abortSignal(AbortSignal.timeout(REQUEST_TIMEOUT_MS))

    if (error) {
      console.error('SEO: failed to list public ideas for sitemap', error.message)
      return []
    }
    return (data as PublicIdeaSitemapEntry[] | null) ?? []
  } catch (error) {
    console.error('SEO: failed to list public ideas for sitemap', error)
    return []
  }
}
