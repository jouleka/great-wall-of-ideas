import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')
  const redirectUrl = requestUrl.searchParams.get('redirectUrl') ?? '/auth'

  // Return early if no token hash
  if (!token_hash) {
    return NextResponse.redirect(`${requestUrl.origin}/auth?error=InvalidLink`)
  }

  const supabase = createRouteHandlerClient({ cookies })

  if (type === 'recovery') {
    // Verify the OTP and get the session
    const { error } = await supabase.auth.verifyOtp({
      type: 'recovery',
      token_hash,
    })

    if (error) {
      return NextResponse.redirect(
        `${requestUrl.origin}/auth?error=InvalidResetLink`
      )
    }

    // Redirect to reset password page
    return NextResponse.redirect(
      `${requestUrl.origin}/auth/reset-password`
    )
  }

  // Handle other verification types (email, phone, etc.)
  return NextResponse.redirect(redirectUrl)
}
