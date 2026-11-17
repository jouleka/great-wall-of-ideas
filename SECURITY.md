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

`picomatch` has an unpatched ReDoS advisory (GHSA-fc5q-39xc-vjpf), and both
`fast-glob` and `tinyglobby` depend on it. The tooling that needs them (Next's
ESLint plugin, typescript-eslint, eslint-import-resolver-typescript and
OpenNext's minifier) only uses a small synchronous glob surface, so the local
`tools/node-glob` adapter implements it on Node's built-in `fs.globSync` and is
installed in place of both packages through `overrides`. Keep the adapter only
while upstream still pulls in picomatch; verify lint and the Cloudflare build
after any change. The file dependencies and overrides are in the lockfile.

Cloudflare preview and deploy scripts now run the server Worker configured in
`wrangler.jsonc`, with the required self-reference binding. They previously
uploaded only static assets to Pages, which omitted the authentication/API
handlers. Preview is local; deployment is a separate explicit command. This
security update does not publish the service or change remote Supabase settings.
