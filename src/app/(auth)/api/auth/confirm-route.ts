import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')
  const next = requestUrl.searchParams.get('next')
  const redirectUrl = next ?? '/auth'

  if (!token_hash) {
    return NextResponse.redirect(`${requestUrl.origin}/auth?error=InvalidLink`)
  }

  const supabase = createRouteHandlerClient({ cookies })

  if (type === 'recovery') {
    const { error } = await supabase.auth.verifyOtp({
      type: 'recovery',
      token_hash,
    })

    if (error) {
      return NextResponse.redirect(
        `${requestUrl.origin}/auth?error=InvalidResetLink`
      )
    }

    return NextResponse.redirect(
      `${requestUrl.origin}/auth/reset-password?verified=true`
    )
  }

  return NextResponse.redirect(redirectUrl)
}
