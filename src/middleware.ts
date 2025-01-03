import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  try {
    const res = NextResponse.next();
    const supabase = createMiddlewareClient({ req, res });
    
    // Quick check for static routes
    const { pathname } = req.nextUrl;
    if (pathname.startsWith('/_next') || 
        pathname.startsWith('/favicon.ico') ||
        pathname.startsWith('/public')) {
      return res;
    }

    // Get session without waiting if possible
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // Public routes - return early
    if (pathname.startsWith('/ideas') && !pathname.includes('/api')) {
      return res;
    }

    // Public API routes
    if (pathname.match(/^\/api\/ideas\/[^/]+\/comments$/)) {
      return res;
    }

    // OAuth callback route - always allow
    if (pathname === '/auth/callback') {
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

    // Handle auth pages
    if (pathname.startsWith('/auth')) {
      // Special handling for reset password page
      if (pathname === '/auth/reset-password') {
        const verified = new URL(req.url).searchParams.get('verified')
        
        // Allow access if verified parameter is present
        if (verified === 'true') {
          return res;
        }
        
        // Otherwise redirect to auth
        return NextResponse.redirect(new URL('/auth', req.url))
      }
      
      // Redirect other auth pages if logged in
      if (session && !pathname.includes('reset-password')) {
        return NextResponse.redirect(new URL('/ideas', req.url));
      }
      return res;
    }

    // For all other routes, check session
    if (!session) {
      const redirectUrl = new URL('/auth', req.url);
      redirectUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(redirectUrl);
    }

    return res;
  } catch (error) {
    console.error('Middleware error:', error);
    return NextResponse.redirect(new URL('/auth', req.url));
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
