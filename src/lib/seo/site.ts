// Canonical, crawler-facing site facts. The origin is fixed (not read from
// NEXT_PUBLIC_SITE_URL) so canonical URLs, sitemap entries and Open Graph
// URLs always point at production, whatever env file a build picked up.
export const SITE_URL = 'https://greatwallofideas.com'
export const SITE_NAME = 'Great Wall of Ideas'
export const SITE_TAGLINE = 'Publish the rough idea. Find the people who can make it better.'
export const SITE_DESCRIPTION =
  'Great Wall of Ideas is a community for sharing unfinished ideas. Publish an idea, discover what resonates, vote and comment on the details, and remix other people\'s ideas into new ones.'
export const SITE_LOGO_PATH = '/icons/android-chrome-512x512.png'

// Served by app/opengraph-image.tsx. Pages that define their own `openGraph`
// replace the inherited one, so they must list this image explicitly.
export const OG_IMAGE = {
  url: '/opengraph-image',
  width: 1200,
  height: 630,
  alt: `${SITE_NAME}: ${SITE_TAGLINE}`,
}

/** WebSite + Organization structured data, rendered site-wide by the root layout. */
export function siteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        logo: new URL(SITE_LOGO_PATH, SITE_URL).toString(),
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        name: SITE_NAME,
        url: SITE_URL,
        description: SITE_DESCRIPTION,
        inLanguage: 'en',
        publisher: { '@id': `${SITE_URL}/#organization` },
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${SITE_URL}/ideas?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  }
}

export function absoluteUrl(path = '/') {
  return new URL(path, SITE_URL).toString()
}

export function ideaPath(id: string) {
  return `/ideas?id=${encodeURIComponent(id)}`
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value)
}

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
}

/** Turns stored rich-text HTML into a single line of plain text. */
export function toPlainText(html: string | null | undefined) {
  if (!html) return ''
  return html
    .replace(/<(br|\/p|\/li|\/h[1-6]|\/blockquote)\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, (entity) => ENTITIES[entity] ?? entity)
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function truncate(text: string, max: number) {
  if (text.length <= max) return text
  const cut = text.slice(0, max - 1)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`
}

/** Serializes JSON-LD for a <script> tag without allowing `</script>` breakouts. */
export function serializeJsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}
