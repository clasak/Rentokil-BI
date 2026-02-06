/**
 * Auto-Detect Role API
 *
 * POST endpoint that automatically detects user roles from Workday job titles
 * by querying S0_TMX.tmx_employee and mapping titles to dashboard roles
 */

import { NextRequest, NextResponse } from 'next/server'
import { bigQueryClient, BIGQUERY_CONFIG } from '@/lib/bigquery/client'
import { createClient } from '@/lib/supabase/server'
import type { Role } from '@/types'

// =============================================================================
// Job Title to Role Mapping
// =============================================================================

interface RoleMapping {
  pattern: RegExp
  role: Role
  priority: number // Lower = higher priority
}

const ROLE_MAPPINGS: RoleMapping[] = [
  // Executive level
  { pattern: /^(ceo|cfo|coo|president|executive)/i, role: 'exec', priority: 1 },
  { pattern: /^(vp|vice president)/i, role: 'market_vp', priority: 2 },

  // Sales leadership
  { pattern: /market.*sales.*director/i, role: 'market_sales_director', priority: 3 },
  { pattern: /region.*director/i, role: 'region_director', priority: 4 },
  { pattern: /region.*sales.*manager/i, role: 'region_sales_manager', priority: 5 },
  { pattern: /sales.*manager/i, role: 'sales_manager', priority: 6 },

  // Operations leadership
  { pattern: /operations.*manager/i, role: 'ops_manager', priority: 7 },
  { pattern: /branch.*manager/i, role: 'manager', priority: 8 },

  // Individual contributors
  { pattern: /(account executive|sales rep|territory manager)/i, role: 'rep', priority: 9 },
  { pattern: /(technician|field tech|service tech)/i, role: 'technician', priority: 10 },
]

/**
 * Maps job title to dashboard role
 */
function mapJobTitleToRole(jobTitle: string): Role | null {
  if (!jobTitle) return null

  // Find first matching pattern (sorted by priority)
  const sorted = ROLE_MAPPINGS.sort((a, b) => a.priority - b.priority)
  for (const mapping of sorted) {
    if (mapping.pattern.test(jobTitle)) {
      return mapping.role
    }
  }

  return null // No match found
}

// =============================================================================
// API Handler
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, bulkSync } = body

    // Verify admin access
    const supabase = await createClient()
    // Use getUser() to validate JWT server-side (getSession() only reads from cookie without validation)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const PROJECT = BIGQUERY_CONFIG.projectId

    if (bulkSync) {
      // Bulk sync all users
      const { data: profiles, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, email')
        .is('auto_detected_role', null)
        .limit(100)

      if (profileError || !profiles) {
        return NextResponse.json(
          { success: false, error: 'Failed to fetch user profiles' },
          { status: 500 }
        )
      }

      const results = []
      for (const profile of profiles) {
        // Query Workday for job title
        const sql = `
          SELECT
            employee_number,
            employee_name,
            job_title
          FROM
            \`${PROJECT}.S0_TMX.tmx_employee\`
          WHERE
            LOWER(email) = LOWER(@email)
          LIMIT 1
        `

        const queryResult = await bigQueryClient.query<{
          employee_number: string
          employee_name: string
          job_title: string
        }>(sql, { params: { email: profile.email } })

        if (queryResult.rows.length > 0) {
          const employee = queryResult.rows[0]
          const detectedRole = mapJobTitleToRole(employee.job_title)

          if (detectedRole) {
            // Update user profile with auto-detected role
            await supabase
              .from('user_profiles')
              .update({
                auto_detected_role: detectedRole,
                job_title: employee.job_title,
              })
              .eq('id', profile.id)

            results.push({
              email: profile.email,
              role: detectedRole,
              jobTitle: employee.job_title,
            })
          }
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          processed: profiles.length,
          detected: results.length,
          results,
        },
      })
    } else if (email) {
      // Single user sync
      const sql = `
        SELECT
          employee_number,
          employee_name,
          job_title,
          branch_code,
          region_code,
          market_code
        FROM
          \`${PROJECT}.S0_TMX.tmx_employee\`
        WHERE
          LOWER(email) = LOWER(@email)
        LIMIT 1
      `

      const result = await bigQueryClient.query<{
        employee_number: string
        employee_name: string
        job_title: string
        branch_code: string
        region_code: string
        market_code: string
      }>(sql, { params: { email } })

      if (result.rows.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Employee not found in Workday',
          },
          { status: 404 }
        )
      }

      const employee = result.rows[0]
      const detectedRole = mapJobTitleToRole(employee.job_title)

      if (!detectedRole) {
        return NextResponse.json({
          success: false,
          error: 'Could not auto-detect role from job title',
          data: {
            jobTitle: employee.job_title,
            suggestion: 'Please manually assign a role',
          },
        })
      }

      // Update user profile
      const { data: profile, error: updateError } = await supabase
        .from('user_profiles')
        .update({
          auto_detected_role: detectedRole,
          job_title: employee.job_title,
        })
        .eq('email', email)
        .select()
        .single()

      if (updateError) {
        console.error('[auto-detect-role] Update error:', updateError)
        return NextResponse.json(
          {
            success: false,
            error: 'Failed to update user profile',
          },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: {
          email,
          detectedRole,
          jobTitle: employee.job_title,
          employee: employee,
        },
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameter: email or bulkSync',
        },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('[auto-detect-role] Error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
