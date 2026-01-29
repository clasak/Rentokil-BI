/**
 * BigQuery Queries for Organization Hierarchy
 *
 * Provides real market, region, and branch data from BigQuery.
 *
 * PRODUCTION TABLE: S2.VwUnf_Branch (verified and working)
 * Note: This replaces the dev-only S2.VwUnf_Branch view
 * which doesn't exist in production. S2.VwUnf_Branch has identical schema.
 *
 * Real Markets Found (33 total):
 * - Atlantic Market (198 branches)
 * - Florida Market (133 branches)
 * - Midwest Market (338 branches)
 * - Northeast Market (213 branches)
 * - Pacific Market (183 branches)
 * - Plus Canada markets, specialty brands, etc.
 */

import { bigQueryClient, BIGQUERY_CONFIG } from '../client'
import { handleBigQueryError } from '../error-handler'
import { validateOrgCode, validateNumeric, validateString } from '../validation'

// =============================================================================
// Types
// =============================================================================

export interface OrganizationMarket {
  market_code: string
  market_name: string
  region_count: number
  branch_count: number
}

export interface OrganizationRegion {
  region_code: string
  region_name: string
  market_code: string
  market_name: string
  branch_count: number
}

export interface OrganizationBranch {
  branch_code: string
  branch_name: string
  region_code: string
  region_name: string
  market_code: string
  market_name: string
  brand: string
  city: string
  state: string
}

export interface OrganizationHierarchy {
  markets: OrganizationMarket[]
  regions: OrganizationRegion[]
  branches: OrganizationBranch[]
}

export interface OrganizationQueryOptions {
  marketCode?: string
  regionCode?: string
  includeInactive?: boolean
  limit?: number
}

// =============================================================================
// Security Helpers
// =============================================================================

/**
 * Validate that input matches expected patterns (alphanumeric + spaces)
 * Used for validation before parameterized queries
 */
function isValidIdentifier(input: string): boolean {
  if (!input) return true
  return /^[a-zA-Z0-9\s\-_.,()&']+$/.test(input)
}

// =============================================================================
// Queries
// =============================================================================

const PROJECT = BIGQUERY_CONFIG.projectId

/**
 * Get all markets with region and branch counts
 */
export async function getMarkets(
  options: OrganizationQueryOptions = {}
): Promise<OrganizationMarket[]> {
  const { limit = 100 } = options

  const sql = `
    SELECT
      RTX_Market_Code as market_code,
      RTX_Market_Name as market_name,
      COUNT(DISTINCT RTX_Region_Code) as region_count,
      COUNT(DISTINCT Current_State_Branch_Code) as branch_count
    FROM \`${PROJECT}.S2.VwUnf_Branch\`
    WHERE RTX_Market_Code IS NOT NULL
      AND RTX_Market_Name IS NOT NULL
    GROUP BY RTX_Market_Code, RTX_Market_Name
    ORDER BY RTX_Market_Name
    LIMIT @limit
  `

  const params = { limit }
  const result = await bigQueryClient.queryWithParams<OrganizationMarket>(sql, params)
  return result.rows
}

/**
 * Get all regions with their market association
 */
export async function getRegions(
  options: OrganizationQueryOptions = {}
): Promise<OrganizationRegion[]> {
  const { marketCode, limit = 500 } = options

  // Validate input
  if (marketCode && !isValidIdentifier(marketCode)) {
    throw new Error('Invalid market code format')
  }

  const sql = `
    SELECT
      RTX_Region_Code as region_code,
      RTX_Region_Name as region_name,
      RTX_Market_Code as market_code,
      RTX_Market_Name as market_name,
      COUNT(DISTINCT Current_State_Branch_Code) as branch_count
    FROM \`${PROJECT}.S2.VwUnf_Branch\`
    WHERE RTX_Region_Code IS NOT NULL
      AND RTX_Region_Name IS NOT NULL
      ${marketCode ? 'AND RTX_Market_Code = @marketCode' : ''}
    GROUP BY RTX_Region_Code, RTX_Region_Name, RTX_Market_Code, RTX_Market_Name
    ORDER BY RTX_Market_Name, RTX_Region_Name
    LIMIT @limit
  `

  const params: Record<string, string | number> = { limit }
  if (marketCode) params.marketCode = marketCode

  const result = await bigQueryClient.queryWithParams<OrganizationRegion>(sql, params)
  return result.rows
}

/**
 * Get all branches with full hierarchy information
 */
export async function getBranches(
  options: OrganizationQueryOptions = {}
): Promise<OrganizationBranch[]> {
  const { marketCode, regionCode, limit = 2000 } = options

  // Validate inputs
  if (marketCode && !isValidIdentifier(marketCode)) {
    throw new Error('Invalid market code format')
  }
  if (regionCode && !isValidIdentifier(regionCode)) {
    throw new Error('Invalid region code format')
  }

  const sql = `
    SELECT DISTINCT
      Current_State_Branch_Code as branch_code,
      RTX_Branch_Name as branch_name,
      RTX_Region_Code as region_code,
      RTX_Region_Name as region_name,
      RTX_Market_Code as market_code,
      RTX_Market_Name as market_name,
      COALESCE(Brand, 'Unknown') as brand,
      COALESCE(City, '') as city,
      COALESCE(State, '') as state
    FROM \`${PROJECT}.S2.VwUnf_Branch\`
    WHERE Current_State_Branch_Code IS NOT NULL
      AND RTX_Branch_Name IS NOT NULL
      ${marketCode ? 'AND RTX_Market_Code = @marketCode' : ''}
      ${regionCode ? 'AND RTX_Region_Code = @regionCode' : ''}
    ORDER BY RTX_Market_Name, RTX_Region_Name, RTX_Branch_Name
    LIMIT @limit
  `

  const params: Record<string, string | number> = { limit }
  if (marketCode) params.marketCode = marketCode
  if (regionCode) params.regionCode = regionCode

  const result = await bigQueryClient.queryWithParams<OrganizationBranch>(sql, params)
  return result.rows
}

/**
 * Get complete organization hierarchy (markets, regions, branches)
 * Useful for populating selectors and navigation
 */
export async function getOrganizationHierarchy(
  options: OrganizationQueryOptions = {}
): Promise<OrganizationHierarchy> {
  const [markets, regions, branches] = await Promise.all([
    getMarkets(options),
    getRegions(options),
    getBranches({ ...options, limit: 2000 }),
  ])

  return { markets, regions, branches }
}

/**
 * Get market names for selector dropdowns
 * Returns simple array of market names sorted alphabetically
 */
export async function getMarketNames(): Promise<string[]> {
  const sql = `
    SELECT DISTINCT RTX_Market_Name as market_name
    FROM \`${PROJECT}.S2.VwUnf_Branch\`
    WHERE RTX_Market_Name IS NOT NULL
    ORDER BY RTX_Market_Name
  `

  const result = await bigQueryClient.query<{ market_name: string }>(sql)
  return result.rows.map((r) => r.market_name)
}

/**
 * Get region names for a specific market
 */
export async function getRegionNamesForMarket(
  marketCode: string
): Promise<string[]> {
  // Validate input
  if (!marketCode || !isValidIdentifier(marketCode)) {
    throw new Error('Invalid market code format')
  }

  const sql = `
    SELECT DISTINCT RTX_Region_Name as region_name
    FROM \`${PROJECT}.S2.VwUnf_Branch\`
    WHERE RTX_Market_Code = @marketCode
      AND RTX_Region_Name IS NOT NULL
    ORDER BY RTX_Region_Name
  `

  const params = { marketCode }
  const result = await bigQueryClient.queryWithParams<{ region_name: string }>(sql, params)
  return result.rows.map((r) => r.region_name)
}

/**
 * Get branch names for a specific region
 */
export async function getBranchNamesForRegion(
  regionCode: string
): Promise<string[]> {
  // Validate input
  if (!regionCode || !isValidIdentifier(regionCode)) {
    throw new Error('Invalid region code format')
  }

  const sql = `
    SELECT DISTINCT RTX_Branch_Name as branch_name
    FROM \`${PROJECT}.S2.VwUnf_Branch\`
    WHERE RTX_Region_Code = @regionCode
      AND RTX_Branch_Name IS NOT NULL
    ORDER BY RTX_Branch_Name
  `

  const params = { regionCode }
  const result = await bigQueryClient.queryWithParams<{ branch_name: string }>(sql, params)
  return result.rows.map((r) => r.branch_name)
}
