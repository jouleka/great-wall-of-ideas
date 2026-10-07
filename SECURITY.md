# Security maintenance

Use Node 24, install with `npm ci`, then run `npm audit`, `npm run test:security`,
`npm run lint` and `npm run build:cloudflare`. All public Supabase environment
variables used by a production build must refer to your actual project. CI uses
clearly named fixtures for compilation only; it never deploys them or contacts
a real identity/database service.

Auth redirects accept only paths within this application. Absolute URLs,
protocol-relative URLs, encoded authority separators and control characters
are rejected before server redirects or client navigation. Tests cover these
cases and ordinary paths with query strings and fragments.

The patched editor uses Tiptap 3 with the separately configured Link extension
and preserves the previous non-emitting content update behavior. Tailwind 4
loads the existing theme configuration explicitly through its maintained
PostCSS plugin. Next.js and the OpenNext Cloudflare adapter are upgraded together.

Next's ESLint plugin uses only the synchronous glob function. The local
`tools/eslint-glob` adapter implements that contract with maintained tinyglobby,
replacing the obsolete vulnerable discovery dependency. Keep this adapter only
while Next's upstream plugin requires that legacy package; verify lint after
any change. The file dependency and override are included in the lockfile.

Cloudflare preview and deploy scripts now run the server Worker configured in
`wrangler.jsonc`, with the required self-reference binding. They previously
uploaded only static assets to Pages, which omitted the authentication/API
handlers. Preview is local; deployment is a separate explicit command. This
security update does not publish the service or change remote Supabase settings.
