/**
 * Employee Lookup API
 *
 * Used by SSO callback and admin pages to look up employees in BigQuery
 * and map their job titles to dashboard roles.
 *
 * POST /api/employee/lookup
 *
 * Request body:
 * - email?: string - Look up by email
 * - employeeNumber?: string - Look up by employee number (preferred)
 * - firstName?: string - Look up by name (requires lastName)
 * - lastName?: string - Look up by name (requires firstName)
 *
 * Response:
 * - employee: EmployeeRecord | null
 * - role: Role
 * - roleMapping: { matchedPattern, confidence }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getEmployeeByEmail,
  getEmployeeByNumber,
  getEmployeeByName,
} from '@/lib/bigquery/queries/employee'
import { mapJobTitleToRole, DEFAULT_ROLE } from '@/lib/role-mapping'
import { isAdminEmail } from '@/lib/admin'

export async function POST(request: NextRequest) {
  try {
    // Authentication check - only authenticated users or admins can use this API
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false },
        { status: 401 }
      )
    }

    // For non-admin users, only allow looking up their own data
    const body = await request.json()
    const { email, employeeNumber, firstName, lastName } = body

    // Non-admins can only look up by their own email
    if (user.email && !isAdminEmail(user.email)) {
      if (email && email.toLowerCase() !== user.email.toLowerCase()) {
        return NextResponse.json(
          { error: 'You can only look up your own employee record', success: false },
          { status: 403 }
        )
      }
    }

    let employee = null

    // Try lookup methods in order of preference
    if (employeeNumber) {
      employee = await getEmployeeByNumber(employeeNumber)
    }

    if (!employee && email) {
      employee = await getEmployeeByEmail(email)
    }

    if (!employee && firstName && lastName) {
      employee = await getEmployeeByName(firstName, lastName)
    }

    // Map job title to role
    const roleMapping = employee
      ? mapJobTitleToRole(employee.job_title)
      : { role: DEFAULT_ROLE, matchedPattern: null, confidence: 'low' as const }

    return NextResponse.json({
      success: true,
      employee,
      role: roleMapping.role,
      roleMapping: {
        matchedPattern: roleMapping.matchedPattern,
        confidence: roleMapping.confidence,
        jobTitle: employee?.job_title || null,
      },
    })
  } catch (error) {
    console.error('[Employee Lookup API] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to lookup employee',
        employee: null,
        role: DEFAULT_ROLE,
        roleMapping: { matchedPattern: null, confidence: 'low' },
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST with email or employeeNumber in body.' },
    { status: 405 }
  )
}
