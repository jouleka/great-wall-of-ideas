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

    // OAuth callback
    if (pathname === '/api/auth/callback-route') {
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

    // Public auth routes
    if (pathname.startsWith('/auth/reset-password')) {
      return res;
    }

    // Redirect from auth pages if logged in
    if (pathname.startsWith('/auth') && session) {
      const redirectUrl = new URL('/ideas', req.url);
      return NextResponse.redirect(redirectUrl);
    }

    return res;
  } catch (error) {
    console.error('Middleware error:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    );
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
