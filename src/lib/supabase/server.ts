import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

export async function createClient(): Promise<SupabaseClient> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Return mock client if not configured
  if (!url || !key) {
    return createMockServerClient()
  }

  const cookieStore = await cookies()

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  })
}

// Mock server client for when Supabase is not configured
function createMockServerClient(): SupabaseClient {
  const mockAuth = {
    getSession: async () => ({ data: { session: null }, error: null }),
    getUser: async () => ({ data: { user: null }, error: null }),
    exchangeCodeForSession: async () => ({ error: null }),
  }

  const mockFrom = () => ({
    select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }),
    upsert: async () => ({ error: null }),
    insert: async () => ({ error: null }),
  })

  return {
    auth: mockAuth,
    from: mockFrom,
  } as unknown as SupabaseClient
}
