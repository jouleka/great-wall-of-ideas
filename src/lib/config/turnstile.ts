// Cloudflare Turnstile sitekeys are public. Supabase Auth verifies the token
// server-side once CAPTCHA protection is enabled for the project.
const PRODUCTION_SITE_KEY = '0x4AAAAAAGFnnXUAXbH46XCq'

// Cloudflare's documented "always passes" test sitekey for local development.
const TEST_SITE_KEY = '1x00000000000000000000AA'

export const TURNSTILE_SITE_KEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ||
  (process.env.NODE_ENV === 'production' ? PRODUCTION_SITE_KEY : TEST_SITE_KEY)

export const TURNSTILE_SCRIPT_URL =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
