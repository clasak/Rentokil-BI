/**
 * BigQuery Queries for Leads Module
 *
 * Production table: S4.Fact_Leads_Acc_Daily_Dtls_Snp (snapshot table)
 * Note: Using snapshot instead of view (_Vw) due to broken cross-project references in view
 * Pages: /leads/type-pest, /leads/trends, /leads/rankings, /leads/cancels, /leads/geographic
 */

import { bigQueryClient, BigQueryApiError, BIGQUERY_CONFIG } from '../client'
import { handleBigQueryError } from '../error-handler'
import { validateOrgCode, validateNumeric, validateString } from '../validation'
import { buildDateFilter } from './date-filters'

// =============================================================================
// Types
// =============================================================================

export interface LeadsByPestType {
  pest_type: string
  lead_count: number
  converted: number
  conversion_rate: number
}

export interface LeadTrend {
  date: string
  leads: number
  converted: number
  conversion_rate: number
}

export interface LeadRanking {
  market: string
  region: string
  branch: string
  leads: number
  converted: number
  conversion_rate: number
}

export interface LeadCancellation {
  cancel_reason: string
  count: number
  avg_days_to_cancel: number
}

export interface LeadGeographic {
  state: string
  market: string
  region: string
  leads: number
  converted: number
}

export interface LeadFunnel {
  mql_count: number
  scheduled_count: number
  inspected_count: number
  proposed_count: number
  sold_count: number
  canceled_count: number
}

// =============================================================================
// Query Options
// =============================================================================

export interface LeadsQueryOptions {
  daysBack?: number
  market?: string
  region?: string
  branch?: string
  pestType?: string
  limit?: number
}

// =============================================================================
// Queries
// =============================================================================

const PROJECT = BIGQUERY_CONFIG.projectId
const DATASET = 'S4'
// Use snapshot table instead of view - view has broken cross-project references
const LEADS_TABLE = 'Fact_Leads_Acc_Daily_Dtls_Snp'
// Use S2 branch dimension view (verified working in production)
const BRANCH_DATASET = 'S2'
const BRANCH_TABLE = 'VwUnf_Branch'

/**
 * Get leads grouped by pest type
 */
export async function getLeadsByPestType(
  options: LeadsQueryOptions = {}
): Promise<LeadsByPestType[]> {
  const { daysBack = 30, market, region, branch } = options

  // Use standardized date filter with explicit DATE() casting
  let whereClause = buildDateFilter('received_date', { daysBack })
  if (market) whereClause += ` AND market = @market`
  if (region) whereClause += ` AND region = @region`
  if (branch) whereClause += ` AND CAST(report_branch AS STRING) = @branch`

  const sql = `
    SELECT
      COALESCE(primary_pest_report_group, 'Other') as pest_type,
      COUNT(*) as lead_count,
      COUNT(CASE WHEN sold_date IS NOT NULL THEN 1 END) as converted,
      SAFE_DIVIDE(
        COUNT(CASE WHEN sold_date IS NOT NULL THEN 1 END),
        COUNT(*)
      ) as conversion_rate
    FROM \`${PROJECT}.${DATASET}.${LEADS_TABLE}\`
    WHERE ${whereClause}
    GROUP BY primary_pest_report_group
    ORDER BY lead_count DESC
  `

  const params: Record<string, unknown> = {}
  if (market) params.market = market
  if (region) params.region = region
  if (branch) params.branch = branch

  const result = await bigQueryClient.queryWithParams<LeadsByPestType>(sql, params)
  return result.rows
}

/**
 * Get lead trends over time
 */
export async function getLeadTrends(
  options: LeadsQueryOptions = {}
): Promise<LeadTrend[]> {
  const { daysBack = 30, market, region, branch } = options

  // Use standardized date filter with explicit DATE() casting
  let whereClause = buildDateFilter('received_date', { daysBack })
  if (market) whereClause += ` AND market = @market`
  if (region) whereClause += ` AND region = @region`
  if (branch) whereClause += ` AND CAST(report_branch AS STRING) = @branch`

  const sql = `
    SELECT
      FORMAT_DATE('%Y-%m-%d', lead_date) as date,
      COUNT(*) as leads,
      COUNT(CASE WHEN sold_date IS NOT NULL THEN 1 END) as converted,
      SAFE_DIVIDE(
        COUNT(CASE WHEN sold_date IS NOT NULL THEN 1 END),
        COUNT(*)
      ) as conversion_rate
    FROM (
      SELECT *, DATE(received_date) as lead_date
      FROM \`${PROJECT}.${DATASET}.${LEADS_TABLE}\`
      WHERE ${whereClause}
    )
    GROUP BY lead_date
    ORDER BY date
  `

  const params: Record<string, unknown> = {}
  if (market) params.market = market
  if (region) params.region = region
  if (branch) params.branch = branch

  const result = await bigQueryClient.queryWithParams<LeadTrend>(sql, params)
  return result.rows
}

/**
 * Get lead rankings by market/region/branch
 * Joins with branch dimension table for actual market/region names
 * Uses INNER JOIN to exclude leads without valid branch hierarchy
 */
export async function getLeadRankings(
  options: LeadsQueryOptions = {}
): Promise<LeadRanking[]> {
  const {
    daysBack = 30,
    limit = 50,
    market,
    region,
    branch,
    groupBy = 'market'
  } = options as LeadsQueryOptions & { groupBy?: string }

  // Join leads with branch dimension to get market/region hierarchy
  // Group by the selected level (market, region, or branch)
  let groupByClause: string
  let selectClause: string

  switch (groupBy) {
    case 'region':
      selectClause = `
        b.RTX_Market_Name as market,
        b.RTX_Region_Name as region,
        '' as branch`
      groupByClause = 'b.RTX_Market_Name, b.RTX_Region_Name'
      break
    case 'branch':
      selectClause = `
        b.RTX_Market_Name as market,
        b.RTX_Region_Name as region,
        b.RTX_Branch_Name as branch`
      groupByClause = 'b.RTX_Market_Name, b.RTX_Region_Name, b.RTX_Branch_Name'
      break
    case 'market':
    default:
      selectClause = `
        b.RTX_Market_Name as market,
        '' as region,
        '' as branch`
      groupByClause = 'b.RTX_Market_Name'
      break
  }

  // Build WHERE clause with optional filters
  let whereClause = buildDateFilter('l.received_date', { daysBack })
  const params: Record<string, unknown> = {}

  if (market) {
    whereClause += ` AND b.RTX_Market_Name = @market`
    params.market = market
  }
  if (region) {
    whereClause += ` AND b.RTX_Region_Name = @region`
    params.region = region
  }
  if (branch) {
    whereClause += ` AND b.Current_State_Branch_Code = @branch`
    params.branch = branch
  }

  const sql = `
    SELECT
      ${selectClause},
      COUNT(*) as leads,
      COUNT(CASE WHEN l.sold_date IS NOT NULL THEN 1 END) as converted,
      SAFE_DIVIDE(
        COUNT(CASE WHEN l.sold_date IS NOT NULL THEN 1 END),
        COUNT(*)
      ) as conversion_rate
    FROM \`${PROJECT}.${DATASET}.${LEADS_TABLE}\` l
    INNER JOIN \`${PROJECT}.${BRANCH_DATASET}.${BRANCH_TABLE}\` b
      ON CAST(l.report_branch AS STRING) = b.Current_State_Branch_Code
    WHERE ${whereClause}
      AND b.RTX_Market_Name IS NOT NULL
      AND b.RTX_Region_Name IS NOT NULL
    GROUP BY ${groupByClause}
    ORDER BY leads DESC
    LIMIT ${limit}
  `

  const result = await bigQueryClient.queryWithParams<LeadRanking>(sql, params)
  return result.rows
}

/**
 * Get lead cancellation analysis
 */
export async function getLeadCancellations(
  options: LeadsQueryOptions = {}
): Promise<LeadCancellation[]> {
  const { daysBack = 90, market, region, branch } = options

  // Use standardized date filter with explicit DATE() casting
  let whereClause = `
    cancel_date IS NOT NULL
    AND ${buildDateFilter('received_date', { daysBack })}
  `
  if (market) whereClause += ` AND market = @market`
  if (region) whereClause += ` AND region = @region`
  if (branch) whereClause += ` AND CAST(report_branch AS STRING) = @branch`

  const sql = `
    SELECT
      COALESCE(cancel_reason, 'Unknown') as cancel_reason,
      COUNT(*) as count,
      AVG(DATE_DIFF(DATE(cancel_date), DATE(received_date), DAY)) as avg_days_to_cancel
    FROM \`${PROJECT}.${DATASET}.${LEADS_TABLE}\`
    WHERE ${whereClause}
    GROUP BY cancel_reason
    ORDER BY count DESC
  `

  const params: Record<string, unknown> = {}
  if (market) params.market = market
  if (region) params.region = region
  if (branch) params.branch = branch

  const result = await bigQueryClient.queryWithParams<LeadCancellation>(sql, params)
  return result.rows
}

/**
 * Get lead geographic distribution
 * Joins with branch dimension to get actual market/region names
 */
export async function getLeadGeographic(
  options: LeadsQueryOptions = {}
): Promise<LeadGeographic[]> {
  const {
    daysBack = 30,
    limit = 100,
    market,
    region,
    branch,
    groupBy = 'state'
  } = options as LeadsQueryOptions & { groupBy?: string }

  // Build WHERE clause with optional filters
  let whereClause = `${buildDateFilter('l.received_date', { daysBack })} AND l.contact_state IS NOT NULL`
  const params: Record<string, unknown> = {}

  if (market) {
    whereClause += ` AND b.RTX_Market_Name = @market`
    params.market = market
  }
  if (region) {
    whereClause += ` AND b.RTX_Region_Name = @region`
    params.region = region
  }
  if (branch) {
    whereClause += ` AND b.Current_State_Branch_Code = @branch`
    params.branch = branch
  }

  // Join with branch table to get market/region hierarchy
  const sql = `
    SELECT
      COALESCE(l.contact_state, 'Unknown') as state,
      COALESCE(b.RTX_Market_Name, 'Unknown') as market,
      COALESCE(b.RTX_Region_Name, 'Unknown') as region,
      COUNT(*) as leads,
      COUNT(CASE WHEN l.sold_date IS NOT NULL THEN 1 END) as converted
    FROM \`${PROJECT}.${DATASET}.${LEADS_TABLE}\` l
    LEFT JOIN \`${PROJECT}.${BRANCH_DATASET}.${BRANCH_TABLE}\` b
      ON CAST(l.report_branch AS STRING) = b.Current_State_Branch_Code
    WHERE ${whereClause}
    GROUP BY l.contact_state, b.RTX_Market_Name, b.RTX_Region_Name
    ORDER BY leads DESC
    LIMIT ${limit}
  `

  const result = await bigQueryClient.queryWithParams<LeadGeographic>(sql, params)
  return result.rows
}

/**
 * Get lead funnel metrics
 */
export async function getLeadFunnel(
  options: LeadsQueryOptions = {}
): Promise<LeadFunnel> {
  const { daysBack = 30, market, region, branch } = options

  // Use standardized date filter with explicit DATE() casting
  let whereClause = buildDateFilter('received_date', { daysBack })
  if (market) whereClause += ` AND market = @market`
  if (region) whereClause += ` AND region = @region`
  if (branch) whereClause += ` AND CAST(report_branch AS STRING) = @branch`

  const sql = `
    SELECT
      COUNT(CASE WHEN received_date IS NOT NULL THEN 1 END) as mql_count,
      COUNT(CASE WHEN scheduled_date IS NOT NULL THEN 1 END) as scheduled_count,
      COUNT(CASE WHEN inspected_date IS NOT NULL THEN 1 END) as inspected_count,
      COUNT(CASE WHEN proposed_date IS NOT NULL THEN 1 END) as proposed_count,
      COUNT(CASE WHEN sold_date IS NOT NULL THEN 1 END) as sold_count,
      COUNT(CASE WHEN cancel_date IS NOT NULL THEN 1 END) as canceled_count
    FROM \`${PROJECT}.${DATASET}.${LEADS_TABLE}\`
    WHERE ${whereClause}
  `

  const params: Record<string, unknown> = {}
  if (market) params.market = market
  if (region) params.region = region
  if (branch) params.branch = branch

  const result = await bigQueryClient.queryWithParams<LeadFunnel>(sql, params)
  return result.rows[0] || {
    mql_count: 0,
    scheduled_count: 0,
    inspected_count: 0,
    proposed_count: 0,
    sold_count: 0,
    canceled_count: 0,
  }
}
