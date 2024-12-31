import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  try {
    // Initialize response first
    const res = NextResponse.next();
    
    // Initialize Supabase client
    const supabase = createMiddlewareClient({ req, res });
    const { data: { session } } = await supabase.auth.getSession();

    const { pathname } = req.nextUrl;

    // Static and public routes - return early
    if (pathname.startsWith('/_next') || 
        pathname.startsWith('/favicon.ico') ||
        pathname.startsWith('/public')) {
      return res;
    }

    // Public routes
    if (pathname.startsWith('/ideas') && !pathname.includes('/api')) {
      return res;
    }

    // Public API routes
    if (pathname.match(/^\/api\/ideas\/[^/]+\/comments$/)) {
      return res;
    }

    // OAuth callback and reset password routes
    if (pathname === '/auth/callback' || 
        pathname.startsWith('/auth/reset-password')) {
      return res;
    }

    // Protected API routes
    if ((pathname.startsWith('/api/ideas/vote') || 
         pathname.startsWith('/api/ideas/create')) && 
         !session) {
      return new NextResponse(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'content-type': 'application/json' } }
      );
    }

    // Redirect from auth pages if logged in
    if (pathname.startsWith('/auth')) {
      if (session) {
        return NextResponse.redirect(new URL('/ideas', req.url));
      }
      return res;
    }

    // For all other routes, check session
    if (!session) {
      // Store the original URL as a search param
      const redirectUrl = new URL('/auth', req.url);
      redirectUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(redirectUrl);
    }

    return res;
  } catch (error) {
    console.error('Middleware error:', error);
    // On error, redirect to auth page
    return NextResponse.redirect(new URL('/auth', req.url));
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
