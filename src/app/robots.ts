import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo/site'

// One rule for every crawler, AI assistants included: public pages are open,
// account and API endpoints are not useful to index.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/auth', '/auth/', '/profile'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
