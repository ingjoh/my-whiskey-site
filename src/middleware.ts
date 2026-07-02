import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function decodeJwtPayload(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (err) {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get('firebase_token')?.value;
  const { pathname } = request.nextUrl;

  // Protect /admin and /owner routes
  if (pathname.startsWith('/admin') || pathname.startsWith('/owner')) {
    if (!token) {
      console.log(`[Middleware] Unauthorized access attempt to ${pathname}. Redirecting to /login.`);
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    const payload = decodeJwtPayload(token);
    if (!payload) {
      console.warn('[Middleware] Failed to decode token payload. Redirecting to /login.');
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Role-based authorization rules
    const roles = payload.roles || {};
    const orgRole = roles['org-whiskey']; // Default tenant boundary for V1.0
    const isPlatformAdmin = payload.admin === true;

    if (pathname.startsWith('/owner')) {
      // /owner requires owner/admin status in the tenant or platform admin
      const hasOwnerAccess = isPlatformAdmin || ['owner', 'admin'].includes(orgRole);
      if (!hasOwnerAccess) {
        console.log(`[Middleware] User lacks owner/admin permissions for ${pathname}. Redirecting to login.`);
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
      }
    } else if (pathname.startsWith('/admin')) {
      // /admin requires operator (owner/admin/staff) status in the tenant or platform admin
      const hasAdminAccess = isPlatformAdmin || ['owner', 'admin', 'staff'].includes(orgRole);
      if (!hasAdminAccess) {
        console.log(`[Middleware] User lacks staff/admin permissions for ${pathname}. Redirecting to login.`);
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
      }
    }
  }

  return NextResponse.next();
}

// Config matcher to optimize middleware execution only on admin and owner paths
export const config = {
  matcher: [
    '/admin/:path*',
    '/owner/:path*'
  ],
};
