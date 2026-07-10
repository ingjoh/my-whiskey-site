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

const RESERVED_SUBDOMAINS = [
  'www', 'app', 'admin', 'api', 'auth', 
  'docs', 'status', 'support', 
  'cdn', 'assets', 'media', 
  'dev', 'staging', 'preview', 
  'login', 'account', 'mail'
];

export function proxy(request: NextRequest) {
  const token = request.cookies.get('firebase_token')?.value;
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get('host') || '';

  // 1. Protect /admin and /owner routes
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

    const roles = payload.roles || {};
    const orgRole = roles['org-whiskey']; // Default tenant boundary for V1.0
    const isPlatformAdmin = payload.admin === true;

    if (pathname.startsWith('/owner')) {
      const hasOwnerAccess = isPlatformAdmin || ['owner', 'admin'].includes(orgRole);
      if (!hasOwnerAccess) {
        console.log(`[Middleware] User lacks owner/admin permissions for ${pathname}. Redirecting to login.`);
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
      }
    } else if (pathname.startsWith('/admin')) {
      const hasAdminAccess = isPlatformAdmin || ['owner', 'admin', 'staff'].includes(orgRole);
      if (!hasAdminAccess) {
        console.log(`[Middleware] User lacks staff/admin permissions for ${pathname}. Redirecting to login.`);
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
      }
    }
  }

  // 2. Local Path Fallback: /w/[slug]
  if (pathname.startsWith('/w/')) {
    const parts = pathname.split('/');
    const slug = parts[2];
    const remainingPath = '/' + parts.slice(3).join('/');

    if (slug) {
      const url = request.nextUrl.clone();
      url.pathname = `/site${remainingPath === '/' ? '' : remainingPath}`;
      
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-workspace-slug', slug);
      
      return NextResponse.rewrite(url, {
        request: {
          headers: requestHeaders,
        },
      });
    }
  }

  // 3. Subdomain and Custom Domain Resolution (Production hostnames)
  // Skip Next.js internal assets, api routes, and static asset extensions
  if (
    pathname.startsWith('/_next') || 
    pathname.startsWith('/api') || 
    pathname.startsWith('/login') || 
    pathname.startsWith('/logout') || 
    pathname.startsWith('/auth') || 
    pathname.startsWith('/admin') || 
    pathname.startsWith('/owner') || 
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const platformApex = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || 'tuamotu.life';
  const isLocalhost = hostname.includes('localhost') || hostname.includes('127.0.0.1');

  if (!isLocalhost && hostname !== platformApex) {
    if (hostname.endsWith(`.${platformApex}`)) {
      const subdomain = hostname.split('.')[0];
      if (subdomain && !RESERVED_SUBDOMAINS.includes(subdomain.toLowerCase())) {
        const url = request.nextUrl.clone();
        url.pathname = `/site${pathname === '/' ? '' : pathname}`;

        const requestHeaders = new Headers(request.headers);
        requestHeaders.set('x-workspace-slug', subdomain);

        return NextResponse.rewrite(url, {
          request: {
            headers: requestHeaders,
          },
        });
      }
    } else {
      // Custom Domain
      const url = request.nextUrl.clone();
      url.pathname = `/site${pathname === '/' ? '' : pathname}`;

      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-custom-domain', hostname);

      return NextResponse.rewrite(url, {
        request: {
          headers: requestHeaders,
        },
      });
    }
  }

  return NextResponse.next();
}

// Config matcher
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
