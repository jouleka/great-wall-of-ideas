import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://greatwallofideas.xyz'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const type = requestUrl.searchParams.get('type')
  const next = requestUrl.searchParams.get('next') || '/ideas'

  if (code) {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    try {
      // Exchange the code for a session
      await supabase.auth.exchangeCodeForSession(code)

      // Handle different verification types
      if (type === 'recovery') {
        // For password reset, redirect to reset password page in auth group
        return NextResponse.redirect(`${siteUrl}/auth/reset-password?verified=true`)
      } else if (type === 'signup') {
        // For signup verification, redirect to auth with success message
        return NextResponse.redirect(`${siteUrl}/auth?verified=true`)
      }
    } catch (error) {
      console.error('Auth callback error:', error)
      // Redirect to auth page with error
      return NextResponse.redirect(`${siteUrl}/auth?error=AuthCallbackError`)
    }
  }

  // Default redirect to the next page
  return NextResponse.redirect(`${siteUrl}${next}`)
} 