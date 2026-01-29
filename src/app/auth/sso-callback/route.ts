/**
 * SSO Callback Handler
 *
 * Handles callbacks from Okta and Microsoft Entra ID (Azure AD) SSO.
 *
 * Flow:
 * 1. Exchange code for session
 * 2. Extract employee_id from SSO claims (if available)
 * 3. Look up employee in BigQuery
 * 4. Map job title to dashboard role
 * 5. Create/update user profile with auto-detected role
 * 6. Redirect to dashboard (skip onboarding)
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getEmployeeByEmail, getEmployeeByNumber } from '@/lib/bigquery/queries/employee'
import { mapJobTitleToRole, DEFAULT_ROLE } from '@/lib/role-mapping'
import { isAdminEmail } from '@/lib/admin'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // Handle SSO errors
  if (error) {
    console.error('[SSO Callback] SSO error:', error, errorDescription)
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error)}&message=${encodeURIComponent(errorDescription || '')}`
    )
  }

  if (!code) {
    console.error('[SSO Callback] No code provided')
    return NextResponse.redirect(`${origin}/login?error=no_code`)
  }

  const supabase = await createClient()

  // Exchange code for session
  const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)

  if (sessionError || !sessionData.session) {
    console.error('[SSO Callback] Session exchange failed:', sessionError)
    return NextResponse.redirect(`${origin}/login?error=session_failed`)
  }

  const user = sessionData.user
  const email = user.email

  if (!email) {
    console.error('[SSO Callback] No email in user data')
    return NextResponse.redirect(`${origin}/login?error=no_email`)
  }

  // Check if admin - admins get exec role automatically
  if (isAdminEmail(email)) {
    await createOrUpdateProfile(supabase, {
      userId: user.id,
      email,
      name: user.user_metadata?.full_name || user.user_metadata?.name || email.split('@')[0],
      role: 'exec',
      authProvider: 'sso',
      ssoProvider: detectSSOProvider(user),
      employeeNumber: null,
      workdayJobTitle: null,
      autoDetectedRole: 'exec',
      branchCode: null,
      regionCode: null,
      marketCode: null,
    })

    const response = NextResponse.redirect(`${origin}/`)
    response.cookies.set('onboarding_complete', 'true', {
      path: '/',
      maxAge: 31536000, // 1 year
    })
    return response
  }

  // Extract employee_id from SSO claims
  // Different IdPs use different claim names
  const employeeNumber =
    user.user_metadata?.employee_id ||
    user.user_metadata?.employeeId ||
    user.user_metadata?.employeeNumber ||
    user.user_metadata?.employee_number ||
    user.user_metadata?.EmployeeID ||
    user.user_metadata?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/employeeid'] ||
    null

  // Look up employee in BigQuery
  let employee = null

  try {
    // Prefer lookup by employee number (most reliable)
    if (employeeNumber) {
      employee = await getEmployeeByNumber(String(employeeNumber))
    }

    // Fallback to email lookup
    if (!employee && email) {
      employee = await getEmployeeByEmail(email)
    }
  } catch (lookupError) {
    console.error('[SSO Callback] Employee lookup failed:', lookupError)
    // Continue without employee data - will use default role
  }

  // Map job title to role
  const roleMapping = employee
    ? mapJobTitleToRole(employee.job_title)
    : { role: DEFAULT_ROLE, matchedPattern: null, confidence: 'low' as const }

  // Determine user's name
  const userName = employee
    ? `${employee.first_name} ${employee.last_name}`.trim()
    : user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      formatNameFromEmail(email)

  // Create/update user profile
  await createOrUpdateProfile(supabase, {
    userId: user.id,
    email,
    name: userName,
    role: roleMapping.role,
    authProvider: 'sso',
    ssoProvider: detectSSOProvider(user),
    employeeNumber: employee?.employee_number || employeeNumber,
    workdayJobTitle: employee?.job_title || null,
    autoDetectedRole: roleMapping.role,
    branchCode: employee?.branch_code || null,
    regionCode: employee?.region_code || null,
    marketCode: employee?.market_code || null,
  })

  // Set onboarding complete cookie (SSO users skip onboarding)
  const response = NextResponse.redirect(`${origin}/`)
  response.cookies.set('onboarding_complete', 'true', {
    path: '/',
    maxAge: 31536000, // 1 year
  })

  return response
}

/**
 * Detect SSO provider from user identity
 */
function detectSSOProvider(user: { identities?: Array<{ provider?: string }> }): string | null {
  const identities = user.identities || []

  for (const identity of identities) {
    const provider = identity.provider?.toLowerCase()
    if (provider?.includes('azure') || provider?.includes('microsoft')) {
      return 'azure'
    }
    if (provider?.includes('okta')) {
      return 'okta'
    }
    if (provider?.startsWith('saml') || provider?.startsWith('sso')) {
      // Try to detect from metadata
      return 'sso'
    }
  }

  return null
}

/**
 * Format a name from email address (first.last@domain.com → First Last)
 */
function formatNameFromEmail(email: string): string {
  const localPart = email.split('@')[0] || ''
  return localPart
    .split(/[._-]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}

/**
 * Create or update user profile in Supabase
 */
async function createOrUpdateProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  data: {
    userId: string
    email: string
    name: string
    role: string
    authProvider: string
    ssoProvider: string | null
    employeeNumber: string | null
    workdayJobTitle: string | null
    autoDetectedRole: string
    branchCode: string | null
    regionCode: string | null
    marketCode: string | null
  }
) {
  const { error } = await supabase.from('user_profiles').upsert(
    {
      id: data.userId,
      email: data.email,
      name: data.name,
      role: data.role,
      auth_provider: data.authProvider,
      sso_provider: data.ssoProvider,
      employee_number: data.employeeNumber,
      workday_job_title: data.workdayJobTitle,
      auto_detected_role: data.autoDetectedRole,
      branch_code: data.branchCode,
      region_code: data.regionCode,
      market_code: data.marketCode,
      last_synced_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  )

  if (error) {
    console.error('[SSO Callback] Failed to upsert profile:', error)
    // Don't throw - user can still access with cookie
  }
}
