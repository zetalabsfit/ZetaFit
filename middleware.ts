import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'

const PUBLIC = ['/login', '/auth/', '/member/login', '/api/auth/', '/join/', '/w/', '/trial']
const MEMBER_ONLY = ['/member/']
const OWNER_PAGES = ['/dashboard', '/members', '/plans', '/payments', '/attendance', '/reports', '/settings', '/workouts', '/invoice', '/admin']

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

  // Unauthenticated
  if (!user && !isPublic) {
    if (pathname.startsWith('/member/')) {
      return NextResponse.redirect(new URL('/member/login', request.url))
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Authenticated on owner login → dashboard
  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Authenticated on member login → only redirect if no error
  if (user && pathname === '/member/login' && !searchParams.get('error')) {
    return NextResponse.redirect(new URL('/member/home', request.url))
  }

  // Trial gating — check for owner pages only
  if (user && OWNER_PAGES.some(p => pathname.startsWith(p))) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('organizations(platform_status, platform_trial_ends_at)')
      .eq('id', user.id)
      .single()

    const org = profile?.organizations as any
    if (org?.platform_status === 'trial' && org?.platform_trial_ends_at) {
      const trialEnds = new Date(org.platform_trial_ends_at)
      if (trialEnds < new Date()) {
        return NextResponse.redirect(new URL('/trial', request.url))
      }
    }
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
