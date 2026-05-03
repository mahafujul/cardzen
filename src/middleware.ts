import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth

  const isAuthPage = nextUrl.pathname.startsWith('/login') || nextUrl.pathname.startsWith('/register')
  const isApiAuth = nextUrl.pathname.startsWith('/api/auth')
  const isProtected = nextUrl.pathname.startsWith('/dashboard') ||
    nextUrl.pathname.startsWith('/cards') ||
    nextUrl.pathname.startsWith('/transactions') ||
    nextUrl.pathname.startsWith('/cashback') ||
    nextUrl.pathname.startsWith('/borrowed') ||
    nextUrl.pathname.startsWith('/annual-fee') ||
    nextUrl.pathname.startsWith('/billing') ||
    nextUrl.pathname.startsWith('/analytics') ||
    nextUrl.pathname.startsWith('/settings')

  if (isApiAuth) return NextResponse.next()

  if (isProtected && !isLoggedIn) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
