import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

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
  const publicPaths = ['/login', '/auth/callback', '/api']
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
    url.pathname = '/onboarding'
    return NextResponse.redirect(url)
  }

  // If authenticated and accessing dashboard (not onboarding), check if profile exists
  if (user && !isPublicPath && !isOnboardingPath) {
    // Check localStorage flag or profile - for now, check if role is stored locally
    // The onboarding page will set a flag after completing
    const hasCompletedOnboarding = request.cookies.get('onboarding_complete')?.value === 'true'

    if (!hasCompletedOnboarding) {
      // Check Supabase for profile
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      // If no profile with role, redirect to onboarding
      if (!profile?.role) {
        const url = request.nextUrl.clone()
        url.pathname = '/onboarding'
        return NextResponse.redirect(url)
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
