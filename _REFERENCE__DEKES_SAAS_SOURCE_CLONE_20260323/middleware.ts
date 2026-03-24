import { NextRequest, NextResponse } from 'next/server'

// Routes that require authentication
const PROTECTED_PREFIXES = ['/dashboard', '/leads', '/runs', '/settings', '/ecobe']

// Auth routes — authenticated users should be sent to the app
const AUTH_ROUTES = ['/auth/login', '/auth/signup']

function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return true
    // Base64url decode the payload (no crypto needed — just expiry check)
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
    if (!payload.exp) return false
    return Date.now() / 1000 > payload.exp
  } catch {
    return true
  }
}

export function middleware(req: NextRequest) {
  const { pathname, hostname } = req.nextUrl

  // Redirect bare 127.0.0.1 requests to localhost
  if (hostname === '127.0.0.1') {
    const url = req.nextUrl.clone()
    url.hostname = 'localhost'
    return NextResponse.redirect(url)
  }

  const token = req.cookies.get('DEKES_SESSION')?.value
  const hasValidSession = token && !isTokenExpired(token)

  // Redirect authenticated users away from auth pages
  if (AUTH_ROUTES.some((r) => pathname.startsWith(r))) {
    if (hasValidSession) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    return NextResponse.next()
  }

  // Protect app routes — redirect unauthenticated users to login
  if (PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    if (!hasValidSession) {
      const loginUrl = new URL('/auth/login', req.url)
      loginUrl.searchParams.set('from', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
