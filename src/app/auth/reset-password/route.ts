import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const token = requestUrl.searchParams.get('token')
  const type = requestUrl.searchParams.get('type')

  if (!token) {
    return NextResponse.redirect(`${SITE_URL}/auth?error=MissingToken`)
  }

  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

  try {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: type === 'recovery' ? 'recovery' : 'email',
    })

    if (error) {
      return NextResponse.redirect(`${SITE_URL}/auth?error=InvalidToken`)
    }

    // If it's a recovery (password reset), redirect to the reset password page in the auth group
    if (type === 'recovery') {
      return NextResponse.redirect(`${SITE_URL}/auth/reset-password?verified=true`)
    }

    // For other verifications, redirect to auth with success message
    return NextResponse.redirect(`${SITE_URL}/auth?verified=true`)
  } catch (error) {
    console.error('Verification error:', error)
    return NextResponse.redirect(`${SITE_URL}/auth?error=VerificationError`)
  }
} 