"use client"

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User as SupabaseUser, Session, AuthChangeEvent } from '@supabase/supabase-js'
import { Role, User as AppUser } from '@/types'
import { useAppStore } from '@/store'
import { isAdminEmail } from '@/lib/admin'
import { getMarkets } from '@/lib/data'

interface UserProfile {
  id: string
  email: string
  name: string
  role: Role
  department?: string
  // SSO fields
  auth_provider?: string
  sso_provider?: string | null
  employee_number?: string | null
  workday_job_title?: string | null
  auto_detected_role?: Role | null
  role_override?: boolean
  role_override_by?: string | null
  // Organization hierarchy
  branch_code?: string | null
  region_code?: string | null
  market_code?: string | null
  last_synced_at?: string | null
  created_at: string
  updated_at: string
}

interface AuthContextType {
  user: SupabaseUser | null
  profile: UserProfile | null
  session: Session | null
  loading: boolean
  signIn: (email: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: Error | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const { setRole, setCurrentUser, setIsAdmin } = useAppStore()

  const supabase = createClient()

  useEffect(() => {
    // Check for existing session
    const initAuth = async () => {
      try {
        // DEV MODE: If DEV_USER_EMAIL is set, simulate that user
        const devUserEmail = process.env.NEXT_PUBLIC_DEV_USER_EMAIL
        if (process.env.NODE_ENV !== 'production' && devUserEmail) {
          // Import dev role mappings
          const { getDevRoleOverride } = await import('@/lib/dev-role-mappings')
          const devOverride = getDevRoleOverride(devUserEmail)

          if (devOverride) {
            // CRITICAL: Clear any existing admin preview state from localStorage
            // This prevents old preview employees (Nancy More, Andrew Taylor, etc.) from showing
            const { exitRolePreview } = useAppStore.getState()
            exitRolePreview()

            // Create simulated user
            const simulatedUser: SupabaseUser = {
              id: 'dev-user-' + devUserEmail.replace(/[^a-zA-Z0-9]/g, '-'),
              email: devUserEmail,
              aud: 'authenticated',
              role: 'authenticated',
              created_at: new Date().toISOString(),
              app_metadata: {},
              user_metadata: {},
            } as SupabaseUser

            setUser(simulatedUser)

            // Check if dev user is also an admin
            const isDevAdmin = isAdminEmail(devUserEmail)

            // Admins always get exec role, non-admins use dev mapping
            const effectiveRole = isDevAdmin ? 'exec' : devOverride.role
            setRole(effectiveRole)
            setIsAdmin(isDevAdmin)

            const devUser: AppUser = {
              id: simulatedUser.id,
              email: devUserEmail,
              name: devOverride.name,
              role: effectiveRole,
              title: isDevAdmin ? 'Administrator (Dev Mode)' : `${devOverride.role.replace(/_/g, ' ')} (Dev Mode)`,
              // Preserve org assignments even for admins - they need a "home" location
              // for defaulting role previews (admin can still see all data via exec role)
              assignedMarkets: devOverride.assignedMarkets,
              assignedRegions: devOverride.assignedRegions,
              assignedBranches: devOverride.assignedBranches,
              assignedTeams: [],
            }
            setCurrentUser(devUser)

            setProfile({
              id: simulatedUser.id,
              email: devUserEmail,
              name: devOverride.name,
              role: effectiveRole,
              department: isDevAdmin ? 'Administration (Dev Mode)' : 'Dev Mode',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })

            setLoading(false)
            return // Skip normal auth flow
          } else {
            console.warn('[AuthProvider] DEV_USER_EMAIL set but not found in dev-role-mappings.ts:', devUserEmail)
          }
        }

        // Normal auth flow
        const { data: { session } } = await supabase.auth.getSession()
        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          await loadProfile(session.user.id, session.user)
        }
      } catch (error) {
        console.error('Auth init error:', error)
      } finally {
        setLoading(false)
      }
    }

    initAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, session: Session | null) => {
        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          await loadProfile(session.user.id, session.user)
        } else {
          setProfile(null)
          setCurrentUser(null)
          setIsAdmin(false)
        }

        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const loadProfile = async (userId: string, supabaseUser?: SupabaseUser | null) => {
    try {
      // Check if this is an admin user first
      const userEmail = supabaseUser?.email
      if (userEmail && isAdminEmail(userEmail)) {
        // Admin users get exec role and their actual identity
        // NOTE: Don't assign mock market IDs - admin sees all data, org filtering is done via dropdown
        const adminUser: AppUser = {
          id: userId,
          name: extractNameFromEmail(userEmail),
          email: userEmail,
          role: 'exec',
          title: 'Administrator',
          assignedMarkets: [], // Empty = sees all (org filtering via dropdown)
          assignedRegions: [],
          assignedBranches: [],
          assignedTeams: [],
        }
        setRole('exec')
        setCurrentUser(adminUser)
        setIsAdmin(true)

        // Also set profile state for context consumers
        setProfile({
          id: userId,
          email: userEmail,
          name: adminUser.name,
          role: 'exec',
          department: 'Administration',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        return
      }

      // Dev-only: Check for dev role mappings (local development only)
      if (process.env.NODE_ENV !== 'production' && userEmail) {
        const { getDevRoleOverride } = await import('@/lib/dev-role-mappings')
        const devOverride = getDevRoleOverride(userEmail)

        if (devOverride) {
          setRole(devOverride.role)
          setIsAdmin(false)

          // Create AppUser with dev mapping
          const devUser: AppUser = {
            id: userId,
            email: userEmail,
            name: devOverride.name,
            role: devOverride.role,
            title: `${devOverride.role.replace(/_/g, ' ')} (Dev Override)`,
            assignedMarkets: devOverride.assignedMarkets,
            assignedRegions: devOverride.assignedRegions,
            assignedBranches: devOverride.assignedBranches,
            assignedTeams: [],
          }
          setCurrentUser(devUser)

          // Also set profile state for context consumers
          setProfile({
            id: userId,
            email: userEmail,
            name: devOverride.name,
            role: devOverride.role,
            department: 'Dev Override',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })

          return // Early return - skip database lookup
        }
      }

      // For non-admin users, load from database
      const { data, error} = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading profile:', error)
        return
      }

      if (data) {
        const profileData = data as UserProfile
        setProfile(profileData)

        // Determine effective role (use override if set, otherwise auto-detected or manual)
        const effectiveRole = profileData.role_override
          ? profileData.role
          : (profileData.auto_detected_role || profileData.role)

        // Sync role with app store
        if (effectiveRole) {
          setRole(effectiveRole as Role)
        }

        // Build AppUser with organization hierarchy from SSO/BigQuery
        const appUser: AppUser = {
          id: userId,
          name: profileData.name,
          email: profileData.email,
          role: effectiveRole as Role,
          title: profileData.workday_job_title || '',
          assignedMarkets: profileData.market_code ? [profileData.market_code] : [],
          assignedRegions: profileData.region_code ? [profileData.region_code] : [],
          assignedBranches: profileData.branch_code ? [profileData.branch_code] : [],
          assignedTeams: [],
        }
        setCurrentUser(appUser)

        // Set admin flag if SSO user has admin role (unlikely but possible)
        setIsAdmin(false)
      }
    } catch (error) {
      console.error('Profile load error:', error)
    }
  }

  // Helper to extract display name from email
  const extractNameFromEmail = (email: string): string => {
    const localPart = email.split('@')[0]
    // Handle common formats: first.last, first_last, firstlast
    const parts = localPart.split(/[._]/)
    if (parts.length >= 2) {
      return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ')
    }
    // Single name, just capitalize
    return localPart.charAt(0).toUpperCase() + localPart.slice(1)
  }

  const signIn = async (email: string): Promise<{ error: Error | null }> => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        return { error: new Error(error.message) }
      }

      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setSession(null)
    setCurrentUser(null)
    setIsAdmin(false)
  }

  const updateProfile = async (updates: Partial<UserProfile>): Promise<{ error: Error | null }> => {
    if (!user) {
      return { error: new Error('Not authenticated') }
    }

    try {
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          id: user.id,
          email: user.email,
          ...updates,
          updated_at: new Date().toISOString(),
        })

      if (error) {
        return { error: new Error(error.message) }
      }

      // Reload profile
      await loadProfile(user.id)

      // Sync role with app store
      if (updates.role) {
        setRole(updates.role)
      }

      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      session,
      loading,
      signIn,
      signOut,
      updateProfile,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
