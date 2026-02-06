import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isAdminEmail } from '@/lib/admin'

export async function middleware(request: NextRequest) {
  // Check if Supabase is configured FIRST, before trying to create client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // If Supabase is not configured, allow access (demo mode)
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very
  // hard to debug issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Public routes that don't require authentication
  // Note: /api/bigquery/query handles its own auth via getUser() - only exempt truly public APIs
  const publicPaths = ['/login', '/auth/callback', '/api/health', '/api/bigquery/health']
  const isPublicPath = publicPaths.some(path => request.nextUrl.pathname.startsWith(path))

  // Onboarding is accessible only to authenticated users
  const isOnboardingPath = request.nextUrl.pathname === '/onboarding'

  // If not authenticated and trying to access protected route
  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // If authenticated and trying to access login page
  if (user && request.nextUrl.pathname === '/login') {
    const url = request.nextUrl.clone()
    // Admin users skip onboarding entirely
    if (user.email && isAdminEmail(user.email)) {
      // Set onboarding complete cookie for admin
      supabaseResponse.cookies.set('onboarding_complete', 'true', {
        path: '/',
        maxAge: 31536000, // 1 year
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      })
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
    url.pathname = '/onboarding'
    return NextResponse.redirect(url)
  }

  // If authenticated and accessing dashboard (not onboarding), check if profile exists
  if (user && !isPublicPath && !isOnboardingPath) {
    // Admin users always have access - set cookie and allow
    if (user.email && isAdminEmail(user.email)) {
      supabaseResponse.cookies.set('onboarding_complete', 'true', {
        path: '/',
        maxAge: 31536000, // 1 year
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      })
      return supabaseResponse
    }

    // Check if this is an SSO user (they skip onboarding - role auto-detected)
    const identities = user.identities || []
    const isSSOUser = identities.some(
      (i) => i.provider?.startsWith('sso') || i.provider === 'azure' || i.provider === 'okta' || i.provider === 'saml'
    )

    if (isSSOUser) {
      // SSO users have auto-detected roles from BigQuery lookup - skip onboarding
      supabaseResponse.cookies.set('onboarding_complete', 'true', {
        path: '/',
        maxAge: 31536000, // 1 year
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      })
      return supabaseResponse
    }

    // Check cookie flag first
    const hasCompletedOnboarding = request.cookies.get('onboarding_complete')?.value === 'true'

    if (!hasCompletedOnboarding) {
      // Check Supabase for profile
      try {
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('role, auth_provider')
          .eq('id', user.id)
          .single()

        // If profile exists with role, set cookie and continue (don't redirect to onboarding)
        if (profile?.role) {
          // Profile exists - set cookie so we don't check DB every request
          supabaseResponse.cookies.set('onboarding_complete', 'true', {
            path: '/',
            maxAge: 31536000, // 1 year
          })
          return supabaseResponse
        }

        // SSO users with auth_provider = 'sso' also skip onboarding
        if (profile?.auth_provider === 'sso') {
          supabaseResponse.cookies.set('onboarding_complete', 'true', {
            path: '/',
            maxAge: 31536000, // 1 year
          })
          return supabaseResponse
        }

        // If no profile with role (and no error that profile table doesn't exist), redirect to onboarding
        if (!profile?.role && !error?.message?.includes('does not exist')) {
          const url = request.nextUrl.clone()
          url.pathname = '/onboarding'
          return NextResponse.redirect(url)
        }
      } catch (e) {
        // If table doesn't exist or other error, allow access (demo mode)
        console.log('Profile check error, allowing access:', e)
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
