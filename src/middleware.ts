import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  try {
    const res = NextResponse.next();
    const supabase = createMiddlewareClient({ req, res });
    
    const { pathname } = req.nextUrl;
    if (pathname.startsWith('/_next') || 
        pathname.startsWith('/favicon.ico') ||
        pathname.startsWith('/public')) {
      return res;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (pathname === '/' || pathname.startsWith('/ideas') && !pathname.includes('/api')) {
      return res;
    }

    if (pathname.match(/^\/api\/ideas\/[^/]+\/comments$/)) {
      return res;
    }

    if (pathname === '/auth/callback' || pathname.includes('/auth/callback')) {
      return res;
    }

    if ((pathname.startsWith('/api/ideas/vote') || 
         pathname.startsWith('/api/ideas/create')) && 
         !session) {
      return new NextResponse(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'content-type': 'application/json' } }
      );
    }

    if (pathname.startsWith('/auth')) {
      if (pathname === '/auth/reset-password') {
        const verified = new URL(req.url).searchParams.get('verified')
        
        if (verified === 'true') {
          return res;
        }
        
        return NextResponse.redirect(new URL('/auth', req.url))
      }
      
      if (session && !pathname.includes('reset-password')) {
        return NextResponse.redirect(new URL('/ideas', req.url));
      }
      return res;
    }

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
