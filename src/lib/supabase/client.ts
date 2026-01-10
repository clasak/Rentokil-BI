import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

// Singleton client instance
let supabaseClient: SupabaseClient | null = null

export function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

export function createClient(): SupabaseClient {
  // Return singleton if exists
  if (supabaseClient) return supabaseClient

  // Check if Supabase is configured
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    // Return a mock client that gracefully handles missing config
    // This allows the app to run without Supabase for demos
    console.warn('[Supabase] Not configured - auth features disabled')
    return createMockClient()
  }

  supabaseClient = createBrowserClient(url, key)
  return supabaseClient
}

// Mock client for when Supabase is not configured
function createMockClient(): SupabaseClient {
  const mockAuth = {
    getSession: async () => ({ data: { session: null }, error: null }),
    getUser: async () => ({ data: { user: null }, error: null }),
    signInWithOtp: async () => ({ error: { message: 'Auth not configured. Please set SUPABASE_URL and ANON_KEY.' } }),
    signOut: async () => ({ error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
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
