/**
 * BigQuery Queries for Organization Hierarchy with Workforce Breakdown
 *
 * Combines branch hierarchy (S2.VwUnf_Branch) with
 * employee data (S0_TMX.tmx_employee) to provide headcount by role.
 *
 * Role Categories:
 * - Branch Manager (BM): Branch Manager designation
 * - Ops Manager (OM): Service Manager, TMT Manager
 * - Sales Manager (SM): Sales Manager designation
 * - AE/Sales: Outside PC Sale, Outside TC Sale, Com Sales Rep, etc.
 * - Technician: Pest Svc, Commercial Svc, TC Svc LQD FT, etc.
 * - CSR/Office: Inbound CSR, Outbound CSR, Office Staff
 */

import { bigQueryClient, BIGQUERY_CONFIG } from '../client'
import { handleBigQueryError } from '../error-handler'
import { validateOrgCode, validateNumeric, validateString } from '../validation'

// =============================================================================
// Types
// =============================================================================

export type RoleCategory = 'BM' | 'OM' | 'SM' | 'AE' | 'TECH' | 'CSR' | 'OTHER'

export interface WorkforceByRole {
  branch_managers: number
  ops_managers: number
  sales_managers: number
  ae_sales: number
  technicians: number
  csr_office: number
  other: number
  total: number
}

export interface MarketWorkforce extends WorkforceByRole {
  market_code: string
  market_name: string
  region_count: number
  branch_count: number
}

export interface RegionWorkforce extends WorkforceByRole {
  region_code: string
  region_name: string
  market_code: string
  market_name: string
  branch_count: number
}

export interface BranchWorkforce extends WorkforceByRole {
  branch_code: string
  branch_name: string
  region_code: string
  region_name: string
  market_code: string
  market_name: string
}

export interface WorkforceHierarchy {
  markets: MarketWorkforce[]
  regions: RegionWorkforce[]
  branches: BranchWorkforce[]
  totals: WorkforceByRole
}

export interface WorkforceQueryOptions {
  marketCode?: string
  marketName?: string
  regionCode?: string
  regionName?: string
  branchCode?: string
  roles?: RoleCategory[]
  limit?: number
}

// =============================================================================
// SQL Helpers
// =============================================================================

const PROJECT = BIGQUERY_CONFIG.projectId

/**
 * Validate that input matches expected patterns (alphanumeric + spaces)
 * Used for validation before parameterized queries
 */
function isValidIdentifier(input: string): boolean {
  if (!input) return true // Empty is valid (no filter)
  // Allow alphanumeric, spaces, dashes, and common name characters
  return /^[a-zA-Z0-9\s\-_.,()&']+$/.test(input)
}

// Role categorization SQL CASE statement
const ROLE_CASE_SQL = `
  CASE
    WHEN employee_primary_designation_desc = 'Branch Manager' THEN 'BM'
    WHEN employee_primary_designation_desc IN ('Service Manager', 'TMT Manager') THEN 'OM'
    WHEN employee_primary_designation_desc = 'Sales Manager' THEN 'SM'
    WHEN employee_primary_designation_desc LIKE '%Sales%'
      OR employee_primary_designation_desc IN ('Outside PC Sale', 'Outside TC Sale', 'Com Sales Rep', 'In Pc Sales FT', 'Combo Sales', 'Outside TRN Sls') THEN 'AE'
    WHEN employee_primary_designation_desc IN ('Pest Svc', 'Commercial Svc', 'TC Svc LQD FT', 'Bait Svc FT', 'Reinspector', 'Universal Tech', 'Exclusion Tech', 'Fumigator', 'TC Svc LQD PT', 'Bait Svc PT') THEN 'TECH'
    WHEN employee_primary_designation_desc IN ('Inbound CSR', 'Outbound CSR', 'Office Staff') THEN 'CSR'
    ELSE 'OTHER'
  END
`

// Role count aggregation SQL
// IMPORTANT: Use COUNT(DISTINCT) because tmx_employee is a historical snapshot table
const ROLE_COUNTS_SQL = `
  COUNT(DISTINCT CASE WHEN role = 'BM' THEN employee_id END) as branch_managers,
  COUNT(DISTINCT CASE WHEN role = 'OM' THEN employee_id END) as ops_managers,
  COUNT(DISTINCT CASE WHEN role = 'SM' THEN employee_id END) as sales_managers,
  COUNT(DISTINCT CASE WHEN role = 'AE' THEN employee_id END) as ae_sales,
  COUNT(DISTINCT CASE WHEN role = 'TECH' THEN employee_id END) as technicians,
  COUNT(DISTINCT CASE WHEN role = 'CSR' THEN employee_id END) as csr_office,
  COUNT(DISTINCT CASE WHEN role = 'OTHER' THEN employee_id END) as other,
  COUNT(DISTINCT employee_id) as total
`

// =============================================================================
// Queries
// =============================================================================

/**
 * Get workforce breakdown by market
 */
export async function getMarketWorkforce(
  options: WorkforceQueryOptions = {}
): Promise<MarketWorkforce[]> {
  const { marketCode, marketName, limit = 50 } = options

  // Validate inputs
  if (marketCode && !isValidIdentifier(marketCode)) {
    throw new Error('Invalid market code format')
  }
  if (marketName && !isValidIdentifier(marketName)) {
    throw new Error('Invalid market name format')
  }

  const sql = `
    WITH employee_roles AS (
      SELECT
        employee_id,
        TRIM(home_bunit_division_code) as market_code,
        TRIM(home_bunit_division_name) as market_name,
        TRIM(home_bunit_region_code) as region_code,
        TRIM(home_bunit) as branch_code,
        ${ROLE_CASE_SQL} as role
      FROM \`${PROJECT}.S0_TMX.tmx_employee\`
      WHERE employee_status = 'ACT'
        AND curr_ind = 'Y'
        ${marketCode ? 'AND TRIM(home_bunit_division_code) = @marketCode' : ''}
        ${marketName ? 'AND TRIM(home_bunit_division_name) = @marketName' : ''}
    )
    SELECT
      market_code,
      market_name,
      COUNT(DISTINCT region_code) as region_count,
      COUNT(DISTINCT branch_code) as branch_count,
      ${ROLE_COUNTS_SQL}
    FROM employee_roles
    WHERE market_code IS NOT NULL AND market_name IS NOT NULL
    GROUP BY market_code, market_name
    ORDER BY total DESC
    LIMIT @limit
  `

  const params: Record<string, string | number> = { limit }
  if (marketCode) params.marketCode = marketCode
  if (marketName) params.marketName = marketName

  const result = await bigQueryClient.queryWithParams<MarketWorkforce>(sql, params)
  return result.rows
}

/**
 * Get workforce breakdown by region
 */
export async function getRegionWorkforce(
  options: WorkforceQueryOptions = {}
): Promise<RegionWorkforce[]> {
  const { marketCode, marketName, regionCode, regionName, limit = 100 } = options

  // Validate inputs
  if (marketCode && !isValidIdentifier(marketCode)) {
    throw new Error('Invalid market code format')
  }
  if (marketName && !isValidIdentifier(marketName)) {
    throw new Error('Invalid market name format')
  }
  if (regionCode && !isValidIdentifier(regionCode)) {
    throw new Error('Invalid region code format')
  }
  if (regionName && !isValidIdentifier(regionName)) {
    throw new Error('Invalid region name format')
  }

  const sql = `
    WITH employee_roles AS (
      SELECT
        employee_id,
        TRIM(home_bunit_division_code) as market_code,
        TRIM(home_bunit_division_name) as market_name,
        TRIM(home_bunit_region_code) as region_code,
        TRIM(home_bunit_region_name) as region_name,
        TRIM(home_bunit) as branch_code,
        ${ROLE_CASE_SQL} as role
      FROM \`${PROJECT}.S0_TMX.tmx_employee\`
      WHERE employee_status = 'ACT'
        AND curr_ind = 'Y'
        ${marketCode ? 'AND TRIM(home_bunit_division_code) = @marketCode' : ''}
        ${marketName ? 'AND TRIM(home_bunit_division_name) = @marketName' : ''}
        ${regionCode ? 'AND TRIM(home_bunit_region_code) = @regionCode' : ''}
        ${regionName ? 'AND TRIM(home_bunit_region_name) = @regionName' : ''}
    )
    SELECT
      region_code,
      region_name,
      market_code,
      market_name,
      COUNT(DISTINCT branch_code) as branch_count,
      ${ROLE_COUNTS_SQL}
    FROM employee_roles
    WHERE region_code IS NOT NULL AND region_name IS NOT NULL
    GROUP BY region_code, region_name, market_code, market_name
    ORDER BY total DESC
    LIMIT @limit
  `

  const params: Record<string, string | number> = { limit }
  if (marketCode) params.marketCode = marketCode
  if (marketName) params.marketName = marketName
  if (regionCode) params.regionCode = regionCode
  if (regionName) params.regionName = regionName

  const result = await bigQueryClient.queryWithParams<RegionWorkforce>(sql, params)
  return result.rows
}

/**
 * Get workforce breakdown by branch
 */
export async function getBranchWorkforce(
  options: WorkforceQueryOptions = {}
): Promise<BranchWorkforce[]> {
  const { marketCode, marketName, regionCode, regionName, branchCode, limit = 500 } = options

  // Validate inputs
  if (marketCode && !isValidIdentifier(marketCode)) {
    throw new Error('Invalid market code format')
  }
  if (marketName && !isValidIdentifier(marketName)) {
    throw new Error('Invalid market name format')
  }
  if (regionCode && !isValidIdentifier(regionCode)) {
    throw new Error('Invalid region code format')
  }
  if (regionName && !isValidIdentifier(regionName)) {
    throw new Error('Invalid region name format')
  }
  if (branchCode && !isValidIdentifier(branchCode)) {
    throw new Error('Invalid branch code format')
  }

  const sql = `
    WITH employee_roles AS (
      SELECT
        employee_id,
        TRIM(home_bunit_division_code) as market_code,
        TRIM(home_bunit_division_name) as market_name,
        TRIM(home_bunit_region_code) as region_code,
        TRIM(home_bunit_region_name) as region_name,
        TRIM(home_bunit) as branch_code,
        TRIM(home_bunit_description) as branch_name,
        ${ROLE_CASE_SQL} as role
      FROM \`${PROJECT}.S0_TMX.tmx_employee\`
      WHERE employee_status = 'ACT'
        AND curr_ind = 'Y'
        ${marketCode ? 'AND TRIM(home_bunit_division_code) = @marketCode' : ''}
        ${marketName ? 'AND TRIM(home_bunit_division_name) = @marketName' : ''}
        ${regionCode ? 'AND TRIM(home_bunit_region_code) = @regionCode' : ''}
        ${regionName ? 'AND TRIM(home_bunit_region_name) = @regionName' : ''}
        ${branchCode ? 'AND TRIM(home_bunit) = @branchCode' : ''}
    )
    SELECT
      branch_code,
      branch_name,
      region_code,
      region_name,
      market_code,
      market_name,
      ${ROLE_COUNTS_SQL}
    FROM employee_roles
    WHERE branch_code IS NOT NULL
    GROUP BY branch_code, branch_name, region_code, region_name, market_code, market_name
    ORDER BY total DESC
    LIMIT @limit
  `

  const params: Record<string, string | number> = { limit }
  if (marketCode) params.marketCode = marketCode
  if (marketName) params.marketName = marketName
  if (regionCode) params.regionCode = regionCode
  if (regionName) params.regionName = regionName
  if (branchCode) params.branchCode = branchCode

  const result = await bigQueryClient.queryWithParams<BranchWorkforce>(sql, params)
  return result.rows
}

/**
 * Get complete workforce hierarchy with totals
 */
export async function getWorkforceHierarchy(
  options: WorkforceQueryOptions = {}
): Promise<WorkforceHierarchy> {
  const [markets, regions, branches] = await Promise.all([
    getMarketWorkforce(options),
    getRegionWorkforce(options),
    getBranchWorkforce({ ...options, limit: 1000 }),
  ])

  // Calculate totals
  const totals: WorkforceByRole = {
    branch_managers: markets.reduce((sum, m) => sum + m.branch_managers, 0),
    ops_managers: markets.reduce((sum, m) => sum + m.ops_managers, 0),
    sales_managers: markets.reduce((sum, m) => sum + m.sales_managers, 0),
    ae_sales: markets.reduce((sum, m) => sum + m.ae_sales, 0),
    technicians: markets.reduce((sum, m) => sum + m.technicians, 0),
    csr_office: markets.reduce((sum, m) => sum + m.csr_office, 0),
    other: markets.reduce((sum, m) => sum + m.other, 0),
    total: markets.reduce((sum, m) => sum + m.total, 0),
  }

  return { markets, regions, branches, totals }
}

/**
 * Get market names for filtering dropdown
 */
export async function getWorkforceMarketNames(): Promise<string[]> {
  const sql = `
    SELECT DISTINCT TRIM(home_bunit_division_name) as market_name
    FROM \`${PROJECT}.S0_TMX.tmx_employee\`
    WHERE employee_status = 'ACT'
      AND curr_ind = 'Y'
      AND home_bunit_division_name IS NOT NULL
    ORDER BY market_name
  `

  const result = await bigQueryClient.query<{ market_name: string }>(sql)
  return result.rows.map((r) => r.market_name)
}

/**
 * Get region names for a market (for filtering dropdown)
 */
export async function getWorkforceRegionNames(marketName: string): Promise<string[]> {
  // Validate input
  if (!marketName || !isValidIdentifier(marketName)) {
    throw new Error('Invalid market name format')
  }

  const sql = `
    SELECT DISTINCT TRIM(home_bunit_region_name) as region_name
    FROM \`${PROJECT}.S0_TMX.tmx_employee\`
    WHERE employee_status = 'ACT'
      AND curr_ind = 'Y'
      AND TRIM(home_bunit_division_name) = @marketName
      AND home_bunit_region_name IS NOT NULL
    ORDER BY region_name
  `

  const params = { marketName }
  const result = await bigQueryClient.queryWithParams<{ region_name: string }>(sql, params)
  return result.rows.map((r) => r.region_name)
}

/**
 * Get branch names for a region (for filtering dropdown)
 */
export async function getWorkforceBranchNames(
  marketName: string,
  regionName: string
): Promise<string[]> {
  // Validate inputs
  if (!marketName || !isValidIdentifier(marketName)) {
    throw new Error('Invalid market name format')
  }
  if (!regionName || !isValidIdentifier(regionName)) {
    throw new Error('Invalid region name format')
  }

  const sql = `
    SELECT DISTINCT TRIM(home_bunit_description) as branch_name
    FROM \`${PROJECT}.S0_TMX.tmx_employee\`
    WHERE employee_status = 'ACT'
      AND curr_ind = 'Y'
      AND TRIM(home_bunit_division_name) = @marketName
      AND TRIM(home_bunit_region_name) = @regionName
      AND home_bunit_description IS NOT NULL
    ORDER BY branch_name
  `

  const params = { marketName, regionName }
  const result = await bigQueryClient.queryWithParams<{ branch_name: string }>(sql, params)
  return result.rows.map((r) => r.branch_name)
}
