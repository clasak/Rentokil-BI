/**
 * BigQuery Queries for Sales Module
 *
 * Production table (verified working):
 * - W3_Contract_Checker.T0_unf_Contract_All (7.8M rows, 88 columns)
 *   - Contains: SellDate, StartDate, CancelDate, ContractValue, StartedInd, DaysToStart, etc.
 *   - Supports: speed-to-install, today, backlog, canceled-agreements, start-rate
 *
 * Key columns from T0_unf_Contract_All:
 * - SellDate, SellDateYearMonth, StartDate, CancelDate
 * - ContractValue, ContractCount
 * - StartedInd (Y/N), DaysToStart
 * - RawCancelInd (Y/N), CancelReasonCode, DaysToRawCancel
 * - customer_name, SalesPerson
 * - AssignedBranchCode, RegionCode, MarketCode
 * - ProductGroup, ServiceType
 * - salesID
 *
 * Pages: /sales/speed-to-install, /sales/today, /sales/backlog, /sales/canceled-agreements, /sales/start-rate
 */

import { bigQueryClient, BIGQUERY_CONFIG } from '../client'
import { handleBigQueryError } from '../error-handler'
import { validateOrgCode, validateNumeric, validateString } from '../validation'
import { buildDateFilter, buildYearMonthFilter, buildTodayFilter } from './date-filters'

// =============================================================================
// Input Validation Helpers (SQL Injection Prevention)
// =============================================================================

/**
 * Validate and sanitize organization code (market/region/branch)
 * Only allows alphanumeric characters, underscores, and hyphens
 * Returns undefined if invalid to safely skip the filter
 */
function sanitizeOrgCode(code: string | undefined): string | undefined {
  if (!code) return undefined
  // Only allow alphanumeric, underscore, hyphen (common in org codes)
  const sanitized = String(code).trim()
  if (!/^[a-zA-Z0-9_-]+$/.test(sanitized)) {
    console.warn(`[Sales] Invalid org code rejected: "${code}"`)
    return undefined
  }
  // Limit length to prevent abuse
  if (sanitized.length > 50) {
    console.warn(`[Sales] Org code too long, rejected: "${code}"`)
    return undefined
  }
  return sanitized
}

/**
 * Validate numeric parameter (daysBack, limit, yearMonth)
 * Returns safe default if invalid
 */
function sanitizeNumeric(value: number | undefined, defaultValue: number, min: number, max: number): number {
  if (value === undefined || value === null) return defaultValue
  const num = Number(value)
  if (!Number.isFinite(num) || !Number.isInteger(num)) return defaultValue
  return Math.max(min, Math.min(max, num))
}

// =============================================================================
// Types
// =============================================================================

export interface SpeedToInstall {
  period: number // YYYYMM
  total_sold: number
  total_started: number
  within_48_hours: number
  within_7_days: number
  within_14_days: number
  avg_days_to_start: number
}

export interface SalesToday {
  closed_won: number
  closed_won_value: number
  canceled: number
  canceled_value: number
  new_contracts: number
}

export interface BacklogItem {
  sales_id: string
  customer_name: string
  service_type: string
  sold_date: string
  days_since_sold: number
  amount: number
  branch: string
  sales_person: string
}

export interface CanceledAgreement {
  sales_id: string
  customer_name: string
  service_type: string
  sold_date: string
  cancel_date: string
  cancel_reason: string
  days_to_cancel: number
  amount: number
}

export interface StartRateMetric {
  period: number // YYYYMM
  total_sold: number
  total_started: number
  start_rate: number
  started_value: number
  sold_value: number
}

// =============================================================================
// Query Options
// =============================================================================

export interface SalesQueryOptions {
  daysBack?: number
  startYearMonth?: number // YYYYMM
  market?: string
  marketCode?: string  // Alternative name
  region?: string
  regionCode?: string  // Alternative name
  branch?: string
  branchCode?: string  // Alternative name
  limit?: number
}

/**
 * Build WHERE clause for market/region/branch filters with SQL injection prevention
 * Returns both the SQL clause fragment and the parameter values for parameterized queries
 */
interface OrgFilterResult {
  clause: string
  params: Record<string, string>
}

function buildOrgFilterClause(options: SalesQueryOptions): OrgFilterResult {
  const clauses: string[] = []
  const params: Record<string, string> = {}

  // Sanitize all inputs to prevent SQL injection
  const marketCode = sanitizeOrgCode(options.marketCode || options.market)
  const regionCode = sanitizeOrgCode(options.regionCode || options.region)
  const branchCode = sanitizeOrgCode(options.branchCode || options.branch)

  if (marketCode) {
    clauses.push(`MarketCode = @marketCode`)
    params.marketCode = marketCode
  }
  if (regionCode) {
    clauses.push(`RegionCode = @regionCode`)
    params.regionCode = regionCode
  }
  if (branchCode) {
    clauses.push(`AssignedBranchCode = @branchCode`)
    params.branchCode = branchCode
  }

  return {
    clause: clauses.length > 0 ? clauses.join(' AND ') : '',
    params
  }
}

// =============================================================================
// Table Configuration
// =============================================================================

const PROJECT = BIGQUERY_CONFIG.projectId

// Primary production table (verified working with 7.8M rows)
const CONTRACT_DATASET = 'W3_Contract_Checker'
const CONTRACT_TABLE = 'T0_unf_Contract_All'

// =============================================================================
// Sales Organization Filter Options
// =============================================================================

export interface SalesFilterOption {
  code: string
  name: string
  count: number
}

export interface SalesFilterHierarchy {
  markets: SalesFilterOption[]
  regions: SalesFilterOption[]
  branches: SalesFilterOption[]
}

/**
 * Get distinct markets from the contract table for filter dropdowns
 * Returns actual market codes/names that match the data
 */
export async function getSalesMarkets(): Promise<SalesFilterOption[]> {
  const sql = `
    SELECT
      MarketCode as code,
      MarketCode as name,
      COUNT(*) as count
    FROM \`${PROJECT}.${CONTRACT_DATASET}.${CONTRACT_TABLE}\`
    WHERE MarketCode IS NOT NULL
      AND SellDate >= DATE_SUB(CURRENT_DATE('America/New_York'), INTERVAL 365 DAY)
    GROUP BY MarketCode
    ORDER BY MarketCode
  `

  try {
    const result = await bigQueryClient.query<SalesFilterOption>(sql)
    return result.rows
  } catch (error) {
    console.error('[Sales] getSalesMarkets failed:', error)
    return []
  }
}

/**
 * Get distinct regions for a specific market (or all if no market specified)
 */
export async function getSalesRegions(
  options: { marketCode?: string } = {}
): Promise<SalesFilterOption[]> {
  const sanitizedMarket = sanitizeOrgCode(options.marketCode)
  const params: Record<string, string> = {}

  let whereClause = `
    WHERE RegionCode IS NOT NULL
      AND SellDate >= DATE_SUB(CURRENT_DATE('America/New_York'), INTERVAL 365 DAY)
  `
  if (sanitizedMarket) {
    whereClause += ` AND MarketCode = @marketCode`
    params.marketCode = sanitizedMarket
  }

  const sql = `
    SELECT
      RegionCode as code,
      RegionCode as name,
      COUNT(*) as count
    FROM \`${PROJECT}.${CONTRACT_DATASET}.${CONTRACT_TABLE}\`
    ${whereClause}
    GROUP BY RegionCode
    ORDER BY RegionCode
  `

  try {
    const result = Object.keys(params).length > 0
      ? await bigQueryClient.queryWithParams<SalesFilterOption>(sql, params)
      : await bigQueryClient.query<SalesFilterOption>(sql)
    return result.rows
  } catch (error) {
    console.error('[Sales] getSalesRegions failed:', error)
    return []
  }
}

/**
 * Get distinct branches for a specific region (or all if no region specified)
 */
export async function getSalesBranches(
  options: { marketCode?: string; regionCode?: string } = {}
): Promise<SalesFilterOption[]> {
  const sanitizedMarket = sanitizeOrgCode(options.marketCode)
  const sanitizedRegion = sanitizeOrgCode(options.regionCode)
  const params: Record<string, string> = {}

  let whereClause = `
    WHERE AssignedBranchCode IS NOT NULL
      AND SellDate >= DATE_SUB(CURRENT_DATE('America/New_York'), INTERVAL 365 DAY)
  `
  if (sanitizedMarket) {
    whereClause += ` AND MarketCode = @marketCode`
    params.marketCode = sanitizedMarket
  }
  if (sanitizedRegion) {
    whereClause += ` AND RegionCode = @regionCode`
    params.regionCode = sanitizedRegion
  }

  const sql = `
    SELECT
      AssignedBranchCode as code,
      AssignedBranchCode as name,
      COUNT(*) as count
    FROM \`${PROJECT}.${CONTRACT_DATASET}.${CONTRACT_TABLE}\`
    ${whereClause}
    GROUP BY AssignedBranchCode
    ORDER BY AssignedBranchCode
    LIMIT 500
  `

  try {
    const result = Object.keys(params).length > 0
      ? await bigQueryClient.queryWithParams<SalesFilterOption>(sql, params)
      : await bigQueryClient.query<SalesFilterOption>(sql)
    return result.rows
  } catch (error) {
    console.error('[Sales] getSalesBranches failed:', error)
    return []
  }
}

/**
 * Get complete filter hierarchy for sales dropdowns
 * Returns actual values from the contract table
 */
export async function getSalesFilterHierarchy(
  options: { marketCode?: string; regionCode?: string } = {}
): Promise<SalesFilterHierarchy> {
  const [markets, regions, branches] = await Promise.all([
    getSalesMarkets(),
    getSalesRegions({ marketCode: options.marketCode }),
    getSalesBranches(options),
  ])

  return { markets, regions, branches }
}

/**
 * Get speed to install metrics by period
 * Uses W3_Contract_Checker.T0_unf_Contract_All with DaysToStart column
 */
export async function getSpeedToInstall(
  options: SalesQueryOptions = {}
): Promise<SpeedToInstall[]> {
  // Sanitize numeric input (YYYYMM format, valid range 200001 to 209912)
  const safeStartYearMonth = sanitizeNumeric(options.startYearMonth, 202401, 200001, 209912)
  const orgFilter = buildOrgFilterClause(options)

  // Build params object with both org filters and numeric values
  const params: Record<string, unknown> = {
    ...orgFilter.params,
    startYearMonth: safeStartYearMonth
  }

  let whereClause = `SellDateYearMonth >= @startYearMonth
      AND ServiceType IN ('C', 'I', 'J')`
  if (orgFilter.clause) whereClause += ` AND ${orgFilter.clause}`

  const sql = `
    SELECT
      SellDateYearMonth as period,
      COUNT(*) as total_sold,
      COUNTIF(StartedInd = 'Y') as total_started,
      COUNTIF(DaysToStart IS NOT NULL AND DaysToStart <= 2) as within_48_hours,
      COUNTIF(DaysToStart IS NOT NULL AND DaysToStart <= 7) as within_7_days,
      COUNTIF(DaysToStart IS NOT NULL AND DaysToStart <= 14) as within_14_days,
      AVG(CASE WHEN DaysToStart IS NOT NULL AND DaysToStart > 0 THEN DaysToStart END) as avg_days_to_start
    FROM \`${PROJECT}.${CONTRACT_DATASET}.${CONTRACT_TABLE}\`
    WHERE ${whereClause}
    GROUP BY SellDateYearMonth
    ORDER BY SellDateYearMonth
  `

  try {
    const result = await bigQueryClient.queryWithParams<SpeedToInstall>(sql, params)
    return result.rows
  } catch (error) {
    console.error('[Sales] getSpeedToInstall failed:', error)
    return []
  }
}

/**
 * Get today's sales summary
 * Uses W3_Contract_Checker.T0_unf_Contract_All
 */
export async function getSalesToday(
  options: SalesQueryOptions = {}
): Promise<SalesToday> {
  const orgFilter = buildOrgFilterClause(options)

  let whereClause = 'SellDate = CURRENT_DATE(\'America/New_York\')'
  if (orgFilter.clause) whereClause += ` AND ${orgFilter.clause}`

  const sql = `
    SELECT
      COUNTIF(StartedInd = 'Y') as closed_won,
      COALESCE(SUM(CASE WHEN StartedInd = 'Y' THEN ContractValue END), 0) as closed_won_value,
      COUNTIF(RawCancelInd = 'Y') as canceled,
      COALESCE(SUM(CASE WHEN RawCancelInd = 'Y' THEN ContractValue END), 0) as canceled_value,
      COUNT(*) as new_contracts
    FROM \`${PROJECT}.${CONTRACT_DATASET}.${CONTRACT_TABLE}\`
    WHERE ${whereClause}
  `

  try {
    const result = Object.keys(orgFilter.params).length > 0
      ? await bigQueryClient.queryWithParams<SalesToday>(sql, orgFilter.params)
      : await bigQueryClient.query<SalesToday>(sql)
    return result.rows[0] || getDefaultSalesToday()
  } catch (error) {
    console.error('[Sales] getSalesToday failed:', error)
    return getDefaultSalesToday()
  }
}

function getDefaultSalesToday(): SalesToday {
  return {
    closed_won: 0,
    closed_won_value: 0,
    canceled: 0,
    canceled_value: 0,
    new_contracts: 0,
  }
}

/**
 * Get backlog items (sold but not started)
 * Uses W3_Contract_Checker.T0_unf_Contract_All
 */
export async function getBacklog(
  options: SalesQueryOptions = {}
): Promise<BacklogItem[]> {
  // Sanitize limit (1-1000 range)
  const safeLimit = sanitizeNumeric(options.limit, 100, 1, 1000)
  const orgFilter = buildOrgFilterClause(options)

  const params: Record<string, unknown> = {
    ...orgFilter.params,
    resultLimit: safeLimit
  }

  let whereClause = `
    StartedInd = 'N'
    AND (RawCancelInd IS NULL OR RawCancelInd = 'N')
    AND SellDate >= DATE_SUB(CURRENT_DATE('America/New_York'), INTERVAL 90 DAY)
  `
  if (orgFilter.clause) whereClause += ` AND ${orgFilter.clause}`

  const sql = `
    SELECT
      CAST(salesID AS STRING) as sales_id,
      COALESCE(customer_name, 'Customer') as customer_name,
      COALESCE(ProductGroup, 'Service') as service_type,
      FORMAT_DATE('%Y-%m-%d', SellDate) as sold_date,
      DATE_DIFF(CURRENT_DATE('America/New_York'), SellDate, DAY) as days_since_sold,
      COALESCE(ContractValue, 0) as amount,
      COALESCE(AssignedBranchCode, '') as branch,
      COALESCE(SalesPerson, '') as sales_person
    FROM \`${PROJECT}.${CONTRACT_DATASET}.${CONTRACT_TABLE}\`
    WHERE ${whereClause}
    ORDER BY days_since_sold DESC
    LIMIT @resultLimit
  `

  try {
    const result = await bigQueryClient.queryWithParams<BacklogItem>(sql, params)
    return result.rows
  } catch (error) {
    console.error('[Sales] getBacklog failed:', error)
    return []
  }
}

/**
 * Get canceled agreements
 * Uses W3_Contract_Checker.T0_unf_Contract_All
 */
export async function getCanceledAgreements(
  options: SalesQueryOptions = {}
): Promise<CanceledAgreement[]> {
  // Sanitize numeric inputs
  const safeDaysBack = sanitizeNumeric(options.daysBack, 30, 1, 365)
  const safeLimit = sanitizeNumeric(options.limit, 100, 1, 1000)
  const orgFilter = buildOrgFilterClause(options)

  const params: Record<string, unknown> = {
    ...orgFilter.params,
    daysBack: safeDaysBack,
    resultLimit: safeLimit
  }

  let whereClause = `
    CancelDate IS NOT NULL
    AND CancelDate >= DATE_SUB(CURRENT_DATE('America/New_York'), INTERVAL @daysBack DAY)
  `
  if (orgFilter.clause) whereClause += ` AND ${orgFilter.clause}`

  const sql = `
    SELECT
      CAST(salesID AS STRING) as sales_id,
      COALESCE(customer_name, 'Customer') as customer_name,
      COALESCE(ProductGroup, 'Service') as service_type,
      FORMAT_DATE('%Y-%m-%d', SellDate) as sold_date,
      FORMAT_DATE('%Y-%m-%d', CancelDate) as cancel_date,
      COALESCE(CancelReasonCode, 'Unknown') as cancel_reason,
      COALESCE(DaysToRawCancel, DATE_DIFF(CancelDate, SellDate, DAY)) as days_to_cancel,
      COALESCE(ContractValue, 0) as amount
    FROM \`${PROJECT}.${CONTRACT_DATASET}.${CONTRACT_TABLE}\`
    WHERE ${whereClause}
    ORDER BY CancelDate DESC
    LIMIT @resultLimit
  `

  try {
    const result = await bigQueryClient.queryWithParams<CanceledAgreement>(sql, params)
    return result.rows
  } catch (error) {
    console.error('[Sales] getCanceledAgreements failed:', error)
    return []
  }
}

/**
 * Get start rate metrics by period
 * Uses W3_Contract_Checker.T0_unf_Contract_All
 */
export async function getStartRate(
  options: SalesQueryOptions = {}
): Promise<StartRateMetric[]> {
  // Sanitize numeric input (YYYYMM format, valid range 200001 to 209912)
  const safeStartYearMonth = sanitizeNumeric(options.startYearMonth, 202401, 200001, 209912)
  const orgFilter = buildOrgFilterClause(options)

  const params: Record<string, unknown> = {
    ...orgFilter.params,
    startYearMonth: safeStartYearMonth
  }

  let whereClause = `SellDateYearMonth >= @startYearMonth
      AND ServiceType IN ('C', 'I', 'J')`
  if (orgFilter.clause) whereClause += ` AND ${orgFilter.clause}`

  const sql = `
    SELECT
      SellDateYearMonth as period,
      COUNT(*) as total_sold,
      COUNTIF(StartedInd = 'Y') as total_started,
      SAFE_DIVIDE(COUNTIF(StartedInd = 'Y'), COUNT(*)) as start_rate,
      COALESCE(SUM(CASE WHEN StartedInd = 'Y' THEN ContractValue END), 0) as started_value,
      COALESCE(SUM(ContractValue), 0) as sold_value
    FROM \`${PROJECT}.${CONTRACT_DATASET}.${CONTRACT_TABLE}\`
    WHERE ${whereClause}
    GROUP BY SellDateYearMonth
    ORDER BY SellDateYearMonth
  `

  try {
    const result = await bigQueryClient.queryWithParams<StartRateMetric>(sql, params)
    return result.rows
  } catch (error) {
    console.error('[Sales] getStartRate failed:', error)
    return []
  }
}
