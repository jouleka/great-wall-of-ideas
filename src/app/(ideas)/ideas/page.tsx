import type { Metadata } from "next"
import IdeasWall from "./components/ideas-wall"
import { getPublicIdea, type PublicIdea } from "@/lib/seo/public-ideas"
import {
  OG_IMAGE,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
  absoluteUrl,
  ideaPath,
  serializeJsonLd,
  toPlainText,
  truncate,
} from "@/lib/seo/site"

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

const WALL_TITLE = "Explore, vote on and remix ideas"

function sharedIdeaId(params: Awaited<SearchParams>) {
  const id = params.id
  return typeof id === "string" ? id : undefined
}

function ideaAuthorName(idea: PublicIdea) {
  return idea.is_anonymous || !idea.author_name ? "Anonymous" : idea.author_name
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams
}): Promise<Metadata> {
  const id = sharedIdeaId(await searchParams)
  const idea = id ? await getPublicIdea(id) : null

  if (!idea) {
    // The wall itself; filter/search variants (?q=, unknown ?id=) collapse to it.
    return {
      title: { absolute: `${SITE_NAME}: Share, Discuss & Remix Ideas` },
      description: SITE_DESCRIPTION,
      alternates: { canonical: "/ideas" },
      openGraph: {
        type: "website",
        siteName: SITE_NAME,
        locale: "en_US",
        url: "/ideas",
        title: `${SITE_NAME}: ${WALL_TITLE}`,
        description: SITE_DESCRIPTION,
        images: [OG_IMAGE],
      },
      twitter: {
        card: "summary_large_image",
        title: `${SITE_NAME}: ${WALL_TITLE}`,
        description: SITE_DESCRIPTION,
        images: [OG_IMAGE],
      },
    }
  }

  const path = ideaPath(idea.id)
  const plain = toPlainText(idea.description)
  const description = truncate(plain || `An idea shared on ${SITE_NAME}.`, 160)
  const author = ideaAuthorName(idea)

  return {
    title: truncate(idea.title, 70),
    description,
    authors: [{ name: author }],
    keywords: idea.tags ?? undefined,
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      siteName: SITE_NAME,
      locale: "en_US",
      url: path,
      title: idea.title,
      description,
      publishedTime: idea.created_at,
      modifiedTime: idea.updated_at ?? undefined,
      authors: [author],
      tags: idea.tags ?? undefined,
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: idea.title,
      description,
      images: [OG_IMAGE],
    },
  }
}

function ideaJsonLd(idea: PublicIdea) {
  const url = absoluteUrl(ideaPath(idea.id))
  const text = toPlainText(idea.description)

  return {
    "@context": "https://schema.org",
    "@type": "DiscussionForumPosting",
    "@id": url,
    url,
    mainEntityOfPage: url,
    headline: truncate(idea.title, 110),
    text: truncate(text, 5000),
    datePublished: idea.created_at,
    ...(idea.updated_at ? { dateModified: idea.updated_at } : {}),
    author: { "@type": "Person", name: ideaAuthorName(idea) },
    ...(idea.target_audience ? { audience: { "@type": "Audience", audienceType: idea.target_audience } } : {}),
    ...(idea.tags?.length ? { keywords: idea.tags.join(", ") } : {}),
    interactionStatistic: {
      "@type": "InteractionCounter",
      interactionType: "https://schema.org/LikeAction",
      userInteractionCount: Math.max(0, idea.upvotes ?? 0),
    },
    isPartOf: { "@id": `${SITE_URL}/#website` },
  }
}

export default async function IdeasPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const id = sharedIdeaId(await searchParams)
  const idea = id ? await getPublicIdea(id) : null

  return (
    <>
      {/* Site-wide WebSite/Organization JSON-LD lives in the root layout. */}
      {idea && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(ideaJsonLd(idea)) }}
        />
      )}
      <IdeasWall />
    </>
  )
}
