import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const type = requestUrl.searchParams.get('type');
  const next = requestUrl.searchParams.get('next') ?? '/';

  // If no code, redirect to auth
  if (!code) {
    return NextResponse.redirect(`${requestUrl.origin}/auth`);
  }

  const supabase = createRouteHandlerClient({ cookies });

  // For password reset, redirect directly to reset-password page
  if (type === 'recovery') {
    // Sign out any existing session
    await supabase.auth.signOut();
    
    // Get email from hash fragment
    const email = requestUrl.hash.split('&').find(param => param.startsWith('email='))?.split('=')[1]
    
    // Redirect to reset password page with the code and email
    return NextResponse.redirect(
      `${requestUrl.origin}/auth/reset-password?code=${code}&email=${email}`
    );
  }

  try {
    // For other auth flows, exchange the code for a session
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      console.error('Error exchanging code:', error);
      return NextResponse.redirect(`${requestUrl.origin}/auth?error=AuthError`);
    }
    
    // Redirect to the next parameter or default route
    return NextResponse.redirect(`${requestUrl.origin}${next}`);
  } catch (error) {
    console.error('Error in auth callback:', error);
    return NextResponse.redirect(`${requestUrl.origin}/auth?error=AuthError`);
  }
}
