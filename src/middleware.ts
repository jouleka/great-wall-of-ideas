import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define route patterns
const protectedRoutes = ['/profile', '/ideas'];
const authRoutes = ['/auth'];

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { pathname } = req.nextUrl;

  // Check route types
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  const isAuthRoute = authRoutes.some(route => pathname === route); // Exact match for /auth
  const isPasswordReset = pathname.startsWith('/auth/reset-password');
  const isAuthCallback = pathname.startsWith('/auth/callback') || pathname.startsWith('/api/auth/confirm');

  // Always allow callback and password reset routes
  if (isAuthCallback || isPasswordReset) {
    return res;
  }

  // Redirect to auth if accessing protected route without session
  if (isProtectedRoute && !session) {
    const redirectUrl = new URL('/auth', req.url);
    redirectUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Only redirect to /ideas from /auth if there's a session
  if (isAuthRoute && session) {
    return NextResponse.redirect(new URL('/ideas', req.url));
  }

  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
