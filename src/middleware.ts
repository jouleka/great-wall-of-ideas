import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define route patterns
const protectedActions = ['/api/ideas/vote', '/api/ideas/create'];
const authRoutes = ['/auth'];
const publicAuthRoutes = ['/auth/reset-password'];

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  const { pathname } = req.nextUrl;

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Allow guest access to /ideas
  if (pathname.startsWith('/ideas') && !pathname.includes('/api')) {
    return res;
  }

  // Protect API routes for voting and creating ideas
  if (protectedActions.some(route => pathname.startsWith(route)) && !session) {
    return new NextResponse(
      JSON.stringify({ error: 'Authentication required' }),
      { status: 401 }
    );
  }

  // Allow access to reset password page even when authenticated
  if (publicAuthRoutes.some(route => pathname.startsWith(route))) {
    return res;
  }

  // Redirect from auth page if already logged in
  if (authRoutes.some(route => pathname.startsWith(route)) && session) {
    return NextResponse.redirect(new URL('/ideas', req.url));
  }

  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
