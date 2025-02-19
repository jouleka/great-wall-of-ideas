import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://greatwallofideas.xyz'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const type = requestUrl.searchParams.get('type')
  const next = requestUrl.searchParams.get('next') || '/ideas'

  if (!code) {
    return NextResponse.redirect(`${siteUrl}/auth?error=MissingCode`)
  }

  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
  
  try {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('Auth code exchange error:', error)
      return NextResponse.redirect(`${siteUrl}/auth?error=InvalidCode`)
    }

    if (type === 'recovery') {
      return NextResponse.redirect(`${siteUrl}/auth/reset-password?verified=true`)
    } else if (type === 'signup') {
      return NextResponse.redirect(`${siteUrl}/auth?verified=true`)
    }

    return NextResponse.redirect(`${siteUrl}${next}`)
  } catch (error) {
    console.error('Auth callback error:', error)
    return NextResponse.redirect(`${siteUrl}/auth?error=AuthCallbackError`)
  }
} 