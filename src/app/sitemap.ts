import type { MetadataRoute } from 'next'
import { absoluteUrl, ideaPath } from '@/lib/seo/site'
import { getPublicIdeasForSitemap } from '@/lib/seo/public-ideas'

// Built per request so new ideas appear without a redeploy. A Supabase failure
// degrades to the static entries instead of failing the route.
export const dynamic = 'force-dynamic'

const MAX_IDEAS = 5000

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const ideas = await getPublicIdeasForSitemap(MAX_IDEAS)

  const latest = ideas.reduce<string | undefined>((max, idea) => {
    const value = idea.updated_at ?? idea.created_at
    return !max || value > max ? value : max
  }, undefined)

  return [
    {
      url: absoluteUrl('/ideas'),
      lastModified: latest ? new Date(latest) : undefined,
      changeFrequency: 'hourly',
      priority: 1,
    },
    ...ideas.map((idea) => ({
      url: absoluteUrl(ideaPath(idea.id)),
      lastModified: new Date(idea.updated_at ?? idea.created_at),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  ]
}
