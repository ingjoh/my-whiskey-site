import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const token = request.cookies.get('firebase_token')?.value;
  const { pathname } = request.nextUrl;

  // Protect /admin and /owner routes
  if (pathname.startsWith('/admin') || pathname.startsWith('/owner')) {
    if (!token) {
      console.log(`[Proxy] Unauthorized access attempt to ${pathname}. Redirecting to /login.`);
      const loginUrl = new URL('/login', request.url);
      
      // Store redirect target URL in search params so login page can redirect back after successful auth
      loginUrl.searchParams.set('redirect', pathname);
      
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

// Config matcher to optimize proxy execution only on admin and owner paths
export const config = {
  matcher: [
    '/admin/:path*',
    '/owner/:path*'
  ],
};
