# Great Wall of Ideas

**Publish the rough idea. Find the people who can make it better.**

Great Wall of Ideas is a community product for sharing unfinished ideas,
discovering what resonates, discussing the details, and branching an existing
idea into a remix. It treats an idea as the beginning of a conversation—not a
polished pitch that must already have every answer.

[Open the live product](https://greatwallofideas.com) ·
[Browse the source](https://github.com/jouleka/great-wall-of-ideas)

## The product loop

1. **Publish** — write with a rich-text editor, then choose a category and
   tags that make the idea discoverable.
2. **Discover** — browse categories, search the wall, or sort by recent,
   popular, and trending activity.
3. **Discuss** — vote, comment, reply, and receive realtime notifications.
4. **Remix** — fork someone else's thought into a new idea while preserving
   the relationship to its origin.

## What is implemented

| Area | Capabilities |
|---|---|
| Identity | Email/password authentication, Google OAuth, public profiles and avatars |
| Publishing | Rich text, categories, tags, anonymous posting, idea status |
| Community | Votes, nested comments, comment likes, reports, notifications |
| Discovery | Search, category browsing, trending ranking, personalized feeds |
| Remix graph | Idea remixes, origin links, remix history and counts |
| Experience | Responsive UI, dark/light themes, realtime updates |

## Architecture

```text
Next.js App Router
├── server and client product flows
├── Supabase Auth
├── PostgreSQL + row-level security
├── Realtime notifications
├── Storage-backed uploads
└── OpenNext deployment on Cloudflare
```

The database behavior is versioned in `supabase/migrations`, including tables,
indexes, triggers, notification functions, ranking queries, and row-level
security policies. The frontend uses typed service and store layers rather
than calling Supabase directly from every component.

## Stack

- Next.js 16, React 19, and TypeScript
- Supabase Auth, PostgreSQL, Realtime, and Storage
- Tailwind CSS, Radix primitives, and shadcn/ui
- TipTap for rich-text editing
- SWR and Zustand for client data/state
- React Hook Form and Zod for forms and validation
- OpenNext and Wrangler for Cloudflare deployment

## Run locally

Requirements: Node.js 24 and a Supabase project.

```bash
git clone https://github.com/jouleka/great-wall-of-ideas.git
cd great-wall-of-ideas
npm ci
cp .env.example .env.local
npm run dev
```

Open <http://localhost:3000>.

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser-safe anonymous key; RLS still applies |
| `NEXT_PUBLIC_SITE_URL` | Application origin used for auth redirects |

Apply the SQL files in `supabase/migrations` to the target Supabase project
before exercising authenticated product flows.

## Verify

```bash
npm run lint
npm run test:security
npm audit --audit-level=low
npm run build
```

## Cloudflare deployment

The repository includes OpenNext and Wrangler configuration:

```bash
npm run build:cloudflare
npm run preview
npm run deploy
```

Keep production credentials in Cloudflare/Supabase configuration. Do not add
service-role keys or local environment files to Git.

## License

[MIT](LICENSE)
