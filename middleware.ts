import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'

const PUBLIC = ['/login', '/auth/', '/member/login', '/api/auth/', '/join/']

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options ?? {}),
          )
        },
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()
  const isPublic = PUBLIC.some(r => pathname.startsWith(r))

  // Unauthenticated — redirect to appropriate login
  if (!user && !isPublic) {
    if (pathname.startsWith('/member/')) {
      return NextResponse.redirect(new URL('/member/login', request.url))
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Authenticated on owner login — go to dashboard
  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Authenticated on member login — only redirect if no error param
  if (user && pathname === '/member/login' && !searchParams.get('error')) {
    return NextResponse.redirect(new URL('/member/home', request.url))
  }

  // Root redirect
  if (pathname === '/') {
    return NextResponse.redirect(new URL(user ? '/dashboard' : '/login', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
