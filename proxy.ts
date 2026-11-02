import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createHash, timingSafeEqual } from 'crypto';
import { SESSION_COOKIE_NAME } from '@/lib/types';
import { verifyToken, TOKEN_PREFIX } from '@/lib/api-tokens';

// Routes that don't require authentication
const publicPaths = ['/login', '/api/auth/login', '/api/auth/logout', '/api/auth/me'];

// The key a client presented, from "Authorization: Bearer <key>" or "X-API-Key: <key>"
function providedKey(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);
  return request.headers.get('x-api-key');
}

// Constant-time comparison (hashing first makes the lengths equal)
function safeEqual(a: string, b: string): boolean {
  return timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest());
}

// Check if request has the valid legacy global API key
function hasValidApiKey(request: NextRequest): boolean {
  const apiKey = process.env.API_KEY;
  const key = providedKey(request);
  return !!apiKey && !!key && safeEqual(key, apiKey);
}

// Check if request has a valid, enabled scoped API token. Scope is enforced by
// each route; this only decides whether the request may reach the API at all.
async function hasValidScopedToken(request: NextRequest): Promise<boolean> {
  const key = providedKey(request);
  if (!key?.startsWith(TOKEN_PREFIX)) return false;
  return (await verifyToken(key, { touch: false })) !== null;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Allow static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // For API routes, also allow API key / scoped token authentication
  if (pathname.startsWith('/api/') && (hasValidApiKey(request) || await hasValidScopedToken(request))) {
    return NextResponse.next();
  }

  // Check for session cookie
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);

  if (!sessionCookie?.value) {
    // For API routes without session, return 401 instead of redirect
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }
    // Redirect to login if no session
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Validate cookie is valid JSON
  try {
    JSON.parse(sessionCookie.value);
  } catch {
    // Invalid cookie, redirect to login
    const loginUrl = new URL('/login', request.url);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
