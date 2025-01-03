import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')
  const redirectUrl = requestUrl.searchParams.get('redirectUrl') || '/auth'

  if (!token_hash) {
    return NextResponse.redirect(`${SITE_URL}/auth?error=InvalidLink`)
  }

  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

  try {
    if (type === 'recovery') {
      const { error } = await supabase.auth.verifyOtp({
        type: 'recovery',
        token_hash,
      })

      if (error) {
        return NextResponse.redirect(`${SITE_URL}/auth?error=InvalidResetLink`)
      }

      return NextResponse.redirect(`${SITE_URL}/auth/reset-password?verified=true`)
    }

    if (type === 'email_change') {
      const { error } = await supabase.auth.verifyOtp({
        type: 'email_change',
        token_hash,
      })

      if (error) {
        return NextResponse.redirect(`${SITE_URL}/auth?error=InvalidEmailChangeLink`)
      }

      return NextResponse.redirect(`${SITE_URL}/profile?emailChanged=true`)
    }

    // Handle signup confirmation
    const { error } = await supabase.auth.verifyOtp({
      type: 'email',
      token_hash,
    })

    if (error) {
      return NextResponse.redirect(`${SITE_URL}/auth?error=InvalidSignupLink`)
    }

    return NextResponse.redirect(`${SITE_URL}${redirectUrl}?verified=true`)
  } catch (error) {
    console.error('Verification error:', error)
    return NextResponse.redirect(`${SITE_URL}/auth?error=VerificationError`)
  }
} 