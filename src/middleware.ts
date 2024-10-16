import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // If user is signed in and the current path is /, redirect the user to /ideas
  if (session && req.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/ideas', req.url));
  }

  // If user is not signed in and the current path is not /, /ideas, or /auth, redirect the user to /auth
  if (!session && !['/ideas', '/auth'].includes(req.nextUrl.pathname)) {
    return NextResponse.redirect(new URL('/auth', req.url));
  }

  return res;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
