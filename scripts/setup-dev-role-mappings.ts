/**
 * Setup Dev Role Mappings Script
 *
 * Queries BigQuery to find real organizational assignments for specific people
 * and generates the dev-role-mappings.ts file with their actual market/region/branch codes.
 *
 * Usage:
 *   npx tsx scripts/setup-dev-role-mappings.ts
 *
 * This script should be run:
 * - Initially to set up dev role mappings
 * - When people change roles or org assignments
 * - Periodically to stay in sync with BigQuery
 */

import { promises as fs } from 'fs'
import type { EmployeeRecord } from '../src/lib/bigquery/queries/employee'
import type { Role } from '../src/types'

// =============================================================================
// Configuration: People to Role Mappings
// =============================================================================

interface PersonConfig {
  firstName: string
  lastName: string
  displayName?: string // Optional: Override full name (e.g., "Adam" for Jacob)
  email: string
  role: Role
}

const PEOPLE: PersonConfig[] = [
  {
    firstName: 'Susan',
    lastName: 'Michael',
    email: 'susan.michael@rentokil.com',
    role: 'exec',
  },
  {
    firstName: 'Kenneth',
    lastName: 'Diotte',
    email: 'kenneth.diotte@rentokil.com',
    role: 'market_vp',
  },
  {
    firstName: 'Adam',
    lastName: 'Grier',
    email: 'adam.grier@rentokil.com',
    role: 'market_sales_director',
  },
  {
    firstName: 'Hal',
    lastName: 'Johnson',
    email: 'hal.johnson@rentokil.com',
    role: 'region_director',
  },
  {
    firstName: 'Andrew',
    lastName: 'Kasel',
    email: 'andrew.kasel@rentokil.com',
    role: 'region_sales_manager',
  },
  {
    firstName: 'Joaquin',
    lastName: 'Barrera',
    email: 'joaquin.barrera@prestox.com',
    role: 'manager',
  },
  {
    firstName: 'Jacob',
    lastName: 'Bernal',
    displayName: 'Adam Bernal', // Goes by Adam
    email: 'jacob.bernal@prestox.com',
    role: 'sales_manager',
  },
  {
    firstName: 'Bruce',
    lastName: 'Hockless',
    email: 'bruce.hockless@prestox.com',
    role: 'ops_manager',
  },
  {
    firstName: 'Cody',
    lastName: 'Lytle',
    email: 'cody.lytle@prestox.com',
    role: 'rep',
  },
  {
    firstName: 'Jesus',
    lastName: 'Corral',
    email: 'jesus.corral@prestox.com',
    role: 'technician',
  },
]

// =============================================================================
// Types
// =============================================================================

interface DevRoleMapping {
  email: string
  role: Role
  name: string
  assignedMarkets: string[]
  assignedRegions: string[]
  assignedBranches: string[]
  comment: string
}

interface LookupResult {
  found: boolean
  employee: EmployeeRecord | null
  comment: string
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Look up an employee in BigQuery by name (direct query with correct column names)
 */
async function lookupEmployee(
  firstName: string,
  lastName: string,
  role: Role
): Promise<LookupResult> {
  try {
    console.log(`Looking up: ${firstName} ${lastName} (${role})...`)

    // Direct query with actual column names from Employees_Main
    // Simplified to only essential fields, with explicit CAST to avoid type errors
    // Try both "First Last" and "Last, First" formats
    const sql = `
      SELECT
        CAST(Employee_Number AS STRING) as employee_number,
        First_Name as first_name,
        Last_Name as last_name,
        CONCAT(First_Name, ' ', Last_Name) as full_name,
        LOWER(CAST(Primary_Work_Email AS STRING)) as email,
        CAST(Job_Title AS STRING) as job_title,
        CAST(Job_Code AS STRING) as job_code,
        CAST(Branch AS STRING) as branch,
        CAST(RTX_Branch_Code AS STRING) as branch_code,
        CAST(RTX_Branch_Name AS STRING) as branch_name,
        CAST(Region_Description AS STRING) as region,
        CAST(RTX_Region_Code AS STRING) as region_code,
        CAST(Division_Description AS STRING) as market,
        CAST(RTX_Market_Code AS STRING) as market_code,
        CAST(Division_Description AS STRING) as division,
        CAST(Supervisor_Name AS STRING) as supervisor_name,
        CAST(Supervisor_ID AS STRING) as supervisor_id,
        CAST(Hire_Date AS STRING) as hire_date,
        Pay_Status as status
      FROM \`bidata-sharedus-production.S0_TMX.Employees_Main\`
      WHERE (
        (LOWER(First_Name) = LOWER(@firstName) AND LOWER(Last_Name) = LOWER(@lastName))
        OR
        (LOWER(Last_Name) = LOWER(@firstName) AND LOWER(First_Name) = LOWER(@lastName))
      )
      AND Pay_Status = 'A'
      LIMIT 2
    `

    // Use the bigQueryClient directly with parameters
    const { bigQueryClient } = await import('../src/lib/bigquery/client.js')
    const result = await bigQueryClient.queryWithParams<EmployeeRecord>(sql, {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
    })

    // Only return if exactly one match (avoid ambiguity)
    if (result.rows.length === 0) {
      const comment = `⚠️  ${firstName} ${lastName}: Not found in BigQuery - using empty org codes`
      console.warn(comment)
      return {
        found: false,
        employee: null,
        comment,
      }
    }

    if (result.rows.length > 1) {
      const comment = `⚠️  ${firstName} ${lastName}: Multiple matches found (${result.rows.length}) - using first match`
      console.warn(comment)
    }

    const employee = result.rows[0]
    const comment = `✓ ${firstName} ${lastName}: Found in BigQuery (Market: ${employee.market_code || 'N/A'}, Region: ${employee.region_code || 'N/A'}, Branch: ${employee.branch_code || 'N/A'})`
    console.log(comment)

    return {
      found: true,
      employee,
      comment,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const comment = `❌ ${firstName} ${lastName}: Error during lookup - ${errorMessage}`
    console.error(comment)
    return {
      found: false,
      employee: null,
      comment,
    }
  }
}

/**
 * Map org codes based on role hierarchy
 */
function mapOrgCodes(role: Role, employee: EmployeeRecord | null): {
  assignedMarkets: string[]
  assignedRegions: string[]
  assignedBranches: string[]
} {
  if (!employee) {
    return {
      assignedMarkets: [],
      assignedRegions: [],
      assignedBranches: [],
    }
  }

  switch (role) {
    case 'exec':
      // Exec sees all markets
      return {
        assignedMarkets: [],
        assignedRegions: [],
        assignedBranches: [],
      }

    case 'market_vp':
    case 'market_sales_director':
      // Market-level roles: Only market code needed, BigQuery handles subordinate rollup
      return {
        assignedMarkets: employee.market_code ? [employee.market_code] : [],
        assignedRegions: [],
        assignedBranches: [],
      }

    case 'region_director':
    case 'region_sales_manager':
      // Region-level roles: Only region code needed, BigQuery handles subordinate rollup
      return {
        assignedMarkets: [],
        assignedRegions: employee.region_code ? [employee.region_code] : [],
        assignedBranches: [],
      }

    case 'manager':
    case 'sales_manager':
    case 'ops_manager':
    case 'rep':
      // Branch-level roles: Only branch code needed
      return {
        assignedMarkets: [],
        assignedRegions: [],
        assignedBranches: employee.branch_code ? [employee.branch_code] : [],
      }

    case 'technician':
      // Technicians filtered by employeeId, not org codes
      return {
        assignedMarkets: [],
        assignedRegions: [],
        assignedBranches: [],
      }

    default:
      return {
        assignedMarkets: [],
        assignedRegions: [],
        assignedBranches: [],
      }
  }
}

/**
 * Generate TypeScript code for the dev-role-mappings.ts file
 */
function generateMappingsFile(mappings: DevRoleMapping[]): string {
  const timestamp = new Date().toISOString()

  // Generate mapping entries
  const mappingEntries = mappings
    .map(m => {
      const orgInfo: string[] = []
      if (m.assignedMarkets.length > 0) {
        orgInfo.push(`Market: ${m.assignedMarkets[0]}`)
      }
      if (m.assignedRegions.length > 0) {
        orgInfo.push(`Region: ${m.assignedRegions[0]}`)
      }
      if (m.assignedBranches.length > 0) {
        orgInfo.push(`Branch: ${m.assignedBranches[0]}`)
      }
      const orgInfoStr = orgInfo.length > 0 ? ` (${orgInfo.join(', ')})` : ''

      return `  // ${m.comment}
  '${m.email}': {
    role: '${m.role}',
    name: '${m.name}',
    assignedMarkets: ${JSON.stringify(m.assignedMarkets)},
    assignedRegions: ${JSON.stringify(m.assignedRegions)},
    assignedBranches: ${JSON.stringify(m.assignedBranches)},
  },`
    })
    .join('\n\n')

  return `/**
 * Dev Role Mappings - Auto-generated
 *
 * DO NOT EDIT THIS FILE MANUALLY
 * Run: npx tsx scripts/setup-dev-role-mappings.ts
 *
 * Generated: ${timestamp}
 * Source: BigQuery S0_TMX.Employees_Main
 */

import type { Role } from '@/types'

// =============================================================================
// Types
// =============================================================================

export interface DevRoleMapping {
  role: Role
  name: string
  assignedMarkets: string[]
  assignedRegions: string[]
  assignedBranches: string[]
}

// =============================================================================
// Dev Role Mappings (BigQuery-sourced)
// =============================================================================

/**
 * Email-to-role mappings for local development
 *
 * These mappings use REAL BigQuery organizational codes so dev users
 * see actual data for their market/region/branch and all subordinates.
 *
 * Hierarchical data access:
 * - Market VP sees ALL regions and branches under their market
 * - Region Director sees ALL branches under their region
 * - Branch Manager sees their branch data
 *
 * Only activated when NODE_ENV !== 'production'
 */
export const DEV_ROLE_MAPPINGS: Record<string, DevRoleMapping> = {
${mappingEntries}
}

// =============================================================================
// Lookup Function
// =============================================================================

/**
 * Get dev role override for an email address
 *
 * Returns null if:
 * - Running in production (NODE_ENV === 'production')
 * - Email not in dev mappings
 *
 * @param email - User's email address
 * @returns Dev role mapping or null
 */
export function getDevRoleOverride(email: string): DevRoleMapping | null {
  // Safety check: Never activate in production
  if (process.env.NODE_ENV === 'production') {
    return null
  }

  const normalized = email.toLowerCase().trim()
  const mapping = DEV_ROLE_MAPPINGS[normalized]

  if (mapping) {
    console.log('[DevRoleMapping] Override applied:', {
      email: normalized,
      role: mapping.role,
      name: mapping.name,
    })
  }

  return mapping || null
}
`
}

// =============================================================================
// Main Script
// =============================================================================

async function main() {
  console.log('═══════════════════════════════════════════════════════════')
  console.log('  Dev Role Mappings Setup')
  console.log('═══════════════════════════════════════════════════════════')
  console.log()
  console.log(`Querying BigQuery for ${PEOPLE.length} people...`)
  console.log()

  const mappings: DevRoleMapping[] = []
  let successCount = 0
  let failureCount = 0

  // Look up each person
  for (const person of PEOPLE) {
    const result = await lookupEmployee(person.firstName, person.lastName, person.role)

    const displayName = person.displayName || `${person.firstName} ${person.lastName}`
    const orgCodes = mapOrgCodes(person.role, result.employee)

    mappings.push({
      email: person.email,
      role: person.role,
      name: displayName,
      ...orgCodes,
      comment: result.comment,
    })

    if (result.found) {
      successCount++
    } else {
      failureCount++
    }

    console.log()
  }

  console.log('═══════════════════════════════════════════════════════════')
  console.log(`  Lookup Complete: ${successCount} found, ${failureCount} not found`)
  console.log('═══════════════════════════════════════════════════════════')
  console.log()

  // Generate TypeScript file
  const fileContent = generateMappingsFile(mappings)
  const filePath = 'src/lib/dev-role-mappings.ts'

  await fs.writeFile(filePath, fileContent, 'utf-8')

  console.log(`✓ Generated ${filePath}`)
  console.log()
  console.log('Next steps:')
  console.log('  1. Review the generated file: cat src/lib/dev-role-mappings.ts')
  console.log('  2. Verify org codes are correct')
  console.log('  3. Commit to git if changes look good')
  console.log()
}

// Run the script
main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
