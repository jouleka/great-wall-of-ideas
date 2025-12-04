import { updateSession } from '@/lib/supabase/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  try {
    const { pathname } = req.nextUrl;
    
    if (pathname.startsWith('/_next') || 
        pathname.startsWith('/favicon.ico') ||
        pathname.startsWith('/public')) {
      return NextResponse.next();
    }

    const { user, response } = await updateSession(req);

    if (pathname === '/' || pathname.startsWith('/ideas') && !pathname.includes('/api')) {
      return response;
    }

    if (pathname.match(/^\/api\/ideas\/[^/]+\/comments$/)) {
      return response;
    }

    if (pathname === '/auth/callback' || pathname.includes('/auth/callback')) {
      return response;
    }

    if ((pathname.startsWith('/api/ideas/vote') || 
         pathname.startsWith('/api/ideas/create')) && 
         !user) {
      return new NextResponse(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'content-type': 'application/json' } }
      );
    }

    if (pathname.startsWith('/auth')) {
      if (pathname === '/auth/reset-password') {
        const verified = new URL(req.url).searchParams.get('verified')
        
        if (verified === 'true') {
          return response;
        }
        
        return NextResponse.redirect(new URL('/auth', req.url))
      }
      
      if (user && !pathname.includes('reset-password')) {
        return NextResponse.redirect(new URL('/ideas', req.url));
      }
      return response;
    }

    if (!user) {
      const redirectUrl = new URL('/auth', req.url);
      redirectUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(redirectUrl);
    }

    return response;
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
