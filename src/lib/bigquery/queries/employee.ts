/**
 * BigQuery Queries for Employee Lookup (SSO Auto-Role Detection)
 *
 * Data Source: S0_TMX.Employees_Main (29K rows) - from Workday HRIS
 *
 * Key Fields:
 * - Employee_Number: Unique employee ID
 * - First_Name, Last_Name: Employee name
 * - Email_Address: Corporate email (may not always be populated)
 * - Job_Title: Workday job title (used for role mapping)
 * - Branch, Branch_Code: Branch assignment
 * - Region_Description, Region_Code: Region
 * - Division_Description: Market/division
 * - Supervisor_Name: Direct manager
 *
 * Used by:
 * - SSO callback for auto-role detection
 * - Admin user management page
 */

import { bigQueryClient, BIGQUERY_CONFIG } from '../client'
import { handleBigQueryError } from '../error-handler'
import { validateOrgCode, validateNumeric, validateString } from '../validation'

// =============================================================================
// Types
// =============================================================================

export interface EmployeeRecord {
  employee_number: string
  first_name: string
  last_name: string
  full_name: string
  email: string
  job_title: string
  job_code: string
  branch: string
  branch_code: string
  branch_name: string
  region: string
  region_code: string
  market: string
  market_code: string
  division: string
  supervisor_name: string
  supervisor_id: string
  hire_date: string
  status: string
}

export interface EmployeeSearchResult {
  employees: EmployeeRecord[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// =============================================================================
// Queries
// =============================================================================

const PROJECT = BIGQUERY_CONFIG.projectId

/**
 * Look up an employee by their email address
 *
 * Tries multiple matching strategies:
 * 1. Direct email match (if Email_Address field is populated)
 * 2. Constructed email match (first.last@domain)
 *
 * @param email - User's email address from SSO
 * @returns Employee record or null if not found
 */
export async function getEmployeeByEmail(email: string): Promise<EmployeeRecord | null> {
  if (!email) return null

  const emailLower = email.toLowerCase()
  const [localPart, domain] = emailLower.split('@')

  // Parse first.last or first_last from email
  const nameParts = localPart.split(/[._-]/)
  const firstName = nameParts[0] || ''
  const lastName = nameParts.slice(1).join(' ') || ''

  const sql = `
    WITH email_matches AS (
      -- Try direct email match first
      SELECT
        CAST(e.Employee_Number AS STRING) as employee_number,
        COALESCE(e.First_Name, '') as first_name,
        COALESCE(e.Last_Name, '') as last_name,
        TRIM(CONCAT(COALESCE(e.First_Name, ''), ' ', COALESCE(e.Last_Name, ''))) as full_name,
        LOWER(COALESCE(e.Email_Address, '')) as email,
        COALESCE(e.Job_Title, '') as job_title,
        COALESCE(e.Job_Code, '') as job_code,
        COALESCE(e.Branch, '') as branch,
        COALESCE(e.Branch, '') as branch_code,
        COALESCE(e.Business_Unit_Description, e.Branch, '') as branch_name,
        COALESCE(e.Region_Description, '') as region,
        COALESCE(e.Region_Code, '') as region_code,
        COALESCE(e.Division_Description, '') as market,
        COALESCE(e.Division_Code, '') as market_code,
        COALESCE(e.Division_Description, '') as division,
        -- Convert supervisor name from "LAST, FIRST" to "First Last"
        CASE
          WHEN e.Supervisor_Name LIKE '%,%' THEN
            CONCAT(
              TRIM(SPLIT(e.Supervisor_Name, ',')[SAFE_OFFSET(1)]),  -- First name
              ' ',
              TRIM(SPLIT(e.Supervisor_Name, ',')[SAFE_OFFSET(0)])   -- Last name
            )
          ELSE COALESCE(e.Supervisor_Name, '')
        END as supervisor_name,
        COALESCE(CAST(e.Supervisor_ID AS STRING), '') as supervisor_id,
        '' as hire_date,
        'Active' as status,
        1 as match_priority
      FROM \`${PROJECT}.S0_TMX.Employees_Main\` e
      WHERE LOWER(e.Email_Address) = @email

      UNION ALL

      -- Try name-based match (first.last pattern)
      SELECT
        CAST(e.Employee_Number AS STRING) as employee_number,
        COALESCE(e.First_Name, '') as first_name,
        COALESCE(e.Last_Name, '') as last_name,
        TRIM(CONCAT(COALESCE(e.First_Name, ''), ' ', COALESCE(e.Last_Name, ''))) as full_name,
        LOWER(CONCAT(e.First_Name, '.', e.Last_Name, '@', @domain)) as email,
        COALESCE(e.Job_Title, '') as job_title,
        COALESCE(e.Job_Code, '') as job_code,
        COALESCE(e.Branch, '') as branch,
        COALESCE(e.Branch, '') as branch_code,
        COALESCE(e.Business_Unit_Description, e.Branch, '') as branch_name,
        COALESCE(e.Region_Description, '') as region,
        COALESCE(e.Region_Code, '') as region_code,
        COALESCE(e.Division_Description, '') as market,
        COALESCE(e.Division_Code, '') as market_code,
        COALESCE(e.Division_Description, '') as division,
        -- Convert supervisor name from "LAST, FIRST" to "First Last"
        CASE
          WHEN e.Supervisor_Name LIKE '%,%' THEN
            CONCAT(
              TRIM(SPLIT(e.Supervisor_Name, ',')[SAFE_OFFSET(1)]),  -- First name
              ' ',
              TRIM(SPLIT(e.Supervisor_Name, ',')[SAFE_OFFSET(0)])   -- Last name
            )
          ELSE COALESCE(e.Supervisor_Name, '')
        END as supervisor_name,
        COALESCE(CAST(e.Supervisor_ID AS STRING), '') as supervisor_id,
        '' as hire_date,
        'Active' as status,
        2 as match_priority
      FROM \`${PROJECT}.S0_TMX.Employees_Main\` e
      WHERE LOWER(e.First_Name) = @firstName
        AND LOWER(e.Last_Name) = @lastName
    )
    SELECT * EXCEPT(match_priority)
    FROM email_matches
    ORDER BY match_priority
    LIMIT 1
  `

  try {
    const result = await bigQueryClient.queryWithParams<EmployeeRecord>(sql, {
      email: emailLower,
      domain: domain || 'rentokil.com',
      firstName,
      lastName,
    })
    return result.rows[0] || null
  } catch (error) {
    console.error('[Employee Lookup] Failed to query by email:', error)
    return null
  }
}

/**
 * Look up an employee by their employee number
 *
 * Used when SSO provides employee_id in claims (preferred method)
 *
 * @param employeeNumber - Employee number from SSO claims
 * @returns Employee record or null if not found
 */
export async function getEmployeeByNumber(employeeNumber: string): Promise<EmployeeRecord | null> {
  if (!employeeNumber) return null

  const sql = `
    SELECT
      CAST(e.Employee_Number AS STRING) as employee_number,
      COALESCE(e.First_Name, '') as first_name,
      COALESCE(e.Last_Name, '') as last_name,
      TRIM(CONCAT(COALESCE(e.First_Name, ''), ' ', COALESCE(e.Last_Name, ''))) as full_name,
      LOWER(COALESCE(e.Email_Address, CONCAT(e.First_Name, '.', e.Last_Name, '@rentokil.com'))) as email,
      COALESCE(e.Job_Title, '') as job_title,
      COALESCE(e.Job_Code, '') as job_code,
      COALESCE(e.Branch, '') as branch,
      COALESCE(e.Branch, '') as branch_code,
      COALESCE(e.Business_Unit_Description, e.Branch, '') as branch_name,
      COALESCE(e.Region_Description, '') as region,
      COALESCE(e.Region_Code, '') as region_code,
      COALESCE(e.Division_Description, '') as market,
      COALESCE(e.Division_Code, '') as market_code,
      COALESCE(e.Division_Description, '') as division,
      -- Convert supervisor name from "LAST, FIRST" to "First Last"
      CASE
        WHEN e.Supervisor_Name LIKE '%,%' THEN
          CONCAT(
            TRIM(SPLIT(e.Supervisor_Name, ',')[SAFE_OFFSET(1)]),  -- First name
            ' ',
            TRIM(SPLIT(e.Supervisor_Name, ',')[SAFE_OFFSET(0)])   -- Last name
          )
        ELSE COALESCE(e.Supervisor_Name, '')
      END as supervisor_name,
      COALESCE(CAST(e.Supervisor_ID AS STRING), '') as supervisor_id,
      '' as hire_date,
      'Active' as status
    FROM \`${PROJECT}.S0_TMX.Employees_Main\` e
    WHERE CAST(e.Employee_Number AS STRING) = @employeeNumber
    LIMIT 1
  `

  try {
    const result = await bigQueryClient.queryWithParams<EmployeeRecord>(sql, { employeeNumber })
    return result.rows[0] || null
  } catch (error) {
    console.error('[Employee Lookup] Failed to query by employee number:', error)
    return null
  }
}

/**
 * Look up an employee by name (fallback when email/ID not available)
 *
 * @param firstName - First name
 * @param lastName - Last name
 * @returns Employee record or null if not found (or multiple matches)
 */
export async function getEmployeeByName(
  firstName: string,
  lastName: string
): Promise<EmployeeRecord | null> {
  if (!firstName || !lastName) return null

  const sql = `
    SELECT
      CAST(e.Employee_Number AS STRING) as employee_number,
      COALESCE(e.First_Name, '') as first_name,
      COALESCE(e.Last_Name, '') as last_name,
      TRIM(CONCAT(COALESCE(e.First_Name, ''), ' ', COALESCE(e.Last_Name, ''))) as full_name,
      LOWER(COALESCE(e.Email_Address, CONCAT(e.First_Name, '.', e.Last_Name, '@rentokil.com'))) as email,
      COALESCE(e.Job_Title, '') as job_title,
      COALESCE(e.Job_Code, '') as job_code,
      COALESCE(e.Branch, '') as branch,
      COALESCE(e.Branch, '') as branch_code,
      COALESCE(e.Business_Unit_Description, e.Branch, '') as branch_name,
      COALESCE(e.Region_Description, '') as region,
      COALESCE(e.Region_Code, '') as region_code,
      COALESCE(e.Division_Description, '') as market,
      COALESCE(e.Division_Code, '') as market_code,
      COALESCE(e.Division_Description, '') as division,
      -- Convert supervisor name from "LAST, FIRST" to "First Last"
      CASE
        WHEN e.Supervisor_Name LIKE '%,%' THEN
          CONCAT(
            TRIM(SPLIT(e.Supervisor_Name, ',')[SAFE_OFFSET(1)]),  -- First name
            ' ',
            TRIM(SPLIT(e.Supervisor_Name, ',')[SAFE_OFFSET(0)])   -- Last name
          )
        ELSE COALESCE(e.Supervisor_Name, '')
      END as supervisor_name,
      COALESCE(CAST(e.Supervisor_ID AS STRING), '') as supervisor_id,
      '' as hire_date,
      'Active' as status
    FROM \`${PROJECT}.S0_TMX.Employees_Main\` e
    WHERE LOWER(e.First_Name) = LOWER(@firstName)
      AND LOWER(e.Last_Name) = LOWER(@lastName)
    LIMIT 2
  `

  try {
    const result = await bigQueryClient.queryWithParams<EmployeeRecord>(sql, {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
    })

    // Only return if exactly one match (avoid ambiguity)
    if (result.rows.length === 1) {
      return result.rows[0]
    }

    return null
  } catch (error) {
    console.error('[Employee Lookup] Failed to query by name:', error)
    return null
  }
}

/**
 * Search employees for admin user management page
 *
 * @param options - Search and pagination options
 * @returns Paginated employee search results
 */
export async function searchEmployees(options: {
  search?: string
  branch?: string
  region?: string
  market?: string
  jobTitle?: string
  page?: number
  pageSize?: number
}): Promise<EmployeeSearchResult> {
  const { search, branch, region, market, jobTitle, page = 1, pageSize = 50 } = options

  const offset = (page - 1) * pageSize
  const params: Record<string, unknown> = {}

  let whereClause = 'WHERE 1=1'

  if (search) {
    whereClause += ` AND (
      LOWER(CONCAT(e.First_Name, ' ', e.Last_Name)) LIKE LOWER(@search)
      OR LOWER(e.Email_Address) LIKE LOWER(@search)
      OR CAST(e.Employee_Number AS STRING) LIKE @search
      OR LOWER(e.Job_Title) LIKE LOWER(@search)
    )`
    params.search = `%${search}%`
  }

  if (branch) {
    whereClause += ' AND e.Branch = @branch'
    params.branch = branch
  }

  if (region) {
    whereClause += ' AND e.Region_Description = @region'
    params.region = region
  }

  if (market) {
    whereClause += ' AND e.Division_Description = @market'
    params.market = market
  }

  if (jobTitle) {
    whereClause += ' AND LOWER(e.Job_Title) LIKE LOWER(@jobTitle)'
    params.jobTitle = `%${jobTitle}%`
  }

  const countSql = `
    SELECT COUNT(*) as total
    FROM \`${PROJECT}.S0_TMX.Employees_Main\` e
    ${whereClause}
  `

  const dataSql = `
    SELECT
      CAST(e.Employee_Number AS STRING) as employee_number,
      COALESCE(e.First_Name, '') as first_name,
      COALESCE(e.Last_Name, '') as last_name,
      TRIM(CONCAT(COALESCE(e.First_Name, ''), ' ', COALESCE(e.Last_Name, ''))) as full_name,
      LOWER(COALESCE(e.Email_Address, CONCAT(e.First_Name, '.', e.Last_Name, '@rentokil.com'))) as email,
      COALESCE(e.Job_Title, '') as job_title,
      COALESCE(e.Job_Code, '') as job_code,
      COALESCE(e.Branch, '') as branch,
      COALESCE(e.Branch, '') as branch_code,
      COALESCE(e.Business_Unit_Description, e.Branch, '') as branch_name,
      COALESCE(e.Region_Description, '') as region,
      COALESCE(e.Region_Code, '') as region_code,
      COALESCE(e.Division_Description, '') as market,
      COALESCE(e.Division_Code, '') as market_code,
      COALESCE(e.Division_Description, '') as division,
      -- Convert supervisor name from "LAST, FIRST" to "First Last"
      CASE
        WHEN e.Supervisor_Name LIKE '%,%' THEN
          CONCAT(
            TRIM(SPLIT(e.Supervisor_Name, ',')[SAFE_OFFSET(1)]),  -- First name
            ' ',
            TRIM(SPLIT(e.Supervisor_Name, ',')[SAFE_OFFSET(0)])   -- Last name
          )
        ELSE COALESCE(e.Supervisor_Name, '')
      END as supervisor_name,
      COALESCE(CAST(e.Supervisor_ID AS STRING), '') as supervisor_id,
      '' as hire_date,
      'Active' as status
    FROM \`${PROJECT}.S0_TMX.Employees_Main\` e
    ${whereClause}
    ORDER BY e.Last_Name, e.First_Name
    LIMIT ${pageSize}
    OFFSET ${offset}
  `

  try {
    const [countResult, dataResult] = await Promise.all([
      bigQueryClient.queryWithParams<{ total: number }>(countSql, params),
      bigQueryClient.queryWithParams<EmployeeRecord>(dataSql, params),
    ])

    const total = countResult.rows[0]?.total || 0

    return {
      employees: dataResult.rows,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  } catch (error) {
    console.error('[Employee Lookup] searchEmployees failed:', error)
    return {
      employees: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0,
    }
  }
}

/**
 * Get employees by dashboard role for role preview selector
 *
 * Maps dashboard roles to job title patterns and returns matching employees.
 * Used by admin to select a specific person to "preview as".
 *
 * @param role - Dashboard role (e.g., 'region_director', 'rep', 'technician')
 * @param options - Optional filters for market/region/branch
 * @returns List of employees with that role
 */
export async function getEmployeesByRole(
  role: string,
  options: {
    market?: string
    region?: string
    branch?: string
    limit?: number
  } = {}
): Promise<EmployeeRecord[]> {
  const { market, region, branch, limit = 100 } = options

  // Map dashboard roles to job title patterns
  const rolePatterns: Record<string, string[]> = {
    exec: ['%Chief%', '%CEO%', '%President%', '%SVP%', '%Executive%'],
    market_vp: ['%VP%', '%Vice President%', '%Division%President%'],
    market_sales_director: ['%Sales Director%', '%Director%Sales%'],
    region_director: ['%Region%Director%', '%Regional Director%', '%Area Director%'],
    region_sales_manager: ['%Regional Sales%', '%Region Sales Manager%'],
    manager: ['%Branch Manager%', '%General Manager%', '%Office Manager%'],
    sales_manager: ['%Sales Manager%', '%Inside Sales Manager%'],
    ops_manager: ['%Operations Manager%', '%Service Manager%', '%Ops Manager%'],
    rep: ['%Account Executive%', '%Sales Rep%', '%Account Manager%', '%Commercial Sales%', '%AE%'],
    technician: ['%Technician%', '%Service Specialist%', '%Pest Control%', '%Route%'],
  }

  const patterns = rolePatterns[role] || ['%']

  // Build WHERE clause for job title patterns
  const patternConditions = patterns.map((_, i) => `LOWER(e.Job_Title) LIKE LOWER(@pattern${i})`).join(' OR ')

  const params: Record<string, unknown> = {}
  patterns.forEach((pattern, i) => {
    params[`pattern${i}`] = pattern
  })

  let whereClause = `WHERE (${patternConditions})`

  if (market) {
    whereClause += ' AND e.Division_Description = @market'
    params.market = market
  }

  if (region) {
    whereClause += ' AND e.Region_Description = @region'
    params.region = region
  }

  if (branch) {
    whereClause += ' AND e.Branch = @branch'
    params.branch = branch
  }

  const sql = `
    SELECT
      CAST(e.Employee_Number AS STRING) as employee_number,
      COALESCE(e.First_Name, '') as first_name,
      COALESCE(e.Last_Name, '') as last_name,
      TRIM(CONCAT(COALESCE(e.First_Name, ''), ' ', COALESCE(e.Last_Name, ''))) as full_name,
      LOWER(COALESCE(e.Email_Address, CONCAT(e.First_Name, '.', e.Last_Name, '@rentokil.com'))) as email,
      COALESCE(e.Job_Title, '') as job_title,
      COALESCE(e.Job_Code, '') as job_code,
      COALESCE(e.Branch, '') as branch,
      COALESCE(e.Branch, '') as branch_code,
      COALESCE(e.Business_Unit_Description, e.Branch, '') as branch_name,
      COALESCE(e.Region_Description, '') as region,
      COALESCE(e.Region_Code, '') as region_code,
      COALESCE(e.Division_Description, '') as market,
      COALESCE(e.Division_Code, '') as market_code,
      COALESCE(e.Division_Description, '') as division,
      -- Convert supervisor name from "LAST, FIRST" to "First Last"
      CASE
        WHEN e.Supervisor_Name LIKE '%,%' THEN
          CONCAT(
            TRIM(SPLIT(e.Supervisor_Name, ',')[SAFE_OFFSET(1)]),  -- First name
            ' ',
            TRIM(SPLIT(e.Supervisor_Name, ',')[SAFE_OFFSET(0)])   -- Last name
          )
        ELSE COALESCE(e.Supervisor_Name, '')
      END as supervisor_name,
      COALESCE(CAST(e.Supervisor_ID AS STRING), '') as supervisor_id,
      '' as hire_date,
      'Active' as status
    FROM \`${PROJECT}.S0_TMX.Employees_Main\` e
    ${whereClause}
    ORDER BY e.Last_Name, e.First_Name
    LIMIT ${limit}
  `

  try {
    const result = await bigQueryClient.queryWithParams<EmployeeRecord>(sql, params)
    return result.rows
  } catch (error) {
    console.error(`[Employee Lookup] getEmployeesByRole(${role}) failed:`, error)
    return []
  }
}

/**
 * Get unique values for filter dropdowns (branches, regions, markets)
 */
export async function getEmployeeFilterOptions(): Promise<{
  branches: string[]
  regions: string[]
  markets: string[]
  jobTitles: string[]
}> {
  const sql = `
    SELECT
      ARRAY_AGG(DISTINCT e.Branch IGNORE NULLS ORDER BY e.Branch LIMIT 500) as branches,
      ARRAY_AGG(DISTINCT e.Region_Description IGNORE NULLS ORDER BY e.Region_Description LIMIT 100) as regions,
      ARRAY_AGG(DISTINCT e.Division_Description IGNORE NULLS ORDER BY e.Division_Description LIMIT 50) as markets,
      ARRAY_AGG(DISTINCT e.Job_Title IGNORE NULLS ORDER BY e.Job_Title LIMIT 200) as job_titles
    FROM \`${PROJECT}.S0_TMX.Employees_Main\` e
  `

  try {
    const result = await bigQueryClient.query<{
      branches: string[]
      regions: string[]
      markets: string[]
      job_titles: string[]
    }>(sql)

    const row = result.rows[0]
    return {
      branches: row?.branches || [],
      regions: row?.regions || [],
      markets: row?.markets || [],
      jobTitles: row?.job_titles || [],
    }
  } catch (error) {
    console.error('[Employee Lookup] getEmployeeFilterOptions failed:', error)
    return {
      branches: [],
      regions: [],
      markets: [],
      jobTitles: [],
    }
  }
}
