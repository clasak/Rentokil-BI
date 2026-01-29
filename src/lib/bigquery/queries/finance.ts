/**
 * BigQuery Queries for Finance Module
 *
 * Production table (verified working):
 * - Reports.VwUnf_dim_ar_detail - AR detail with aging
 *   - RTX_Market_Name, RTX_Region_Name, RTX_Branch_Codes, RTX_Branch_Name
 *   - Outstanding_Amount, Original_Amount, Paid_Amount
 *   - Days (days old), Age (aging bucket), SortAge
 *   - invoice_date, Invoice_number, CUSTNUM
 *
 * Pages: /finance/ar
 */

import { bigQueryClient, BIGQUERY_CONFIG } from '../client'
import { handleBigQueryError } from '../error-handler'
import { validateOrgCode, validateNumeric, validateString } from '../validation'

// =============================================================================
// Types
// =============================================================================

export interface ARAging {
  aging_bucket: string
  invoice_count: number
  total_amount: number
  market: string
  region: string
}

export interface ARSummary {
  current_amount: number
  past_due_1_30: number
  past_due_31_60: number
  past_due_61_90: number
  past_due_90_plus: number
  total_ar: number
  total_past_due: number
}

export interface ARByBranch {
  branch_cd: string
  branch_nm: string
  market_nm: string
  region_nm: string
  total_amount: number
  past_due: number
  past_due_pct: number
}

export interface ARDetailRecord {
  invoice_number: string
  customer_number: string
  branch_code: string
  branch_name: string
  market_name: string
  region_name: string
  invoice_date: string
  original_amount: number
  paid_amount: number
  outstanding_amount: number
  days_outstanding: number
  aging_bucket: string
}

// =============================================================================
// Query Options
// =============================================================================

export interface FinanceQueryOptions {
  market?: string
  region?: string
  branch?: string
  limit?: number
}

// =============================================================================
// Table Configuration
// =============================================================================

const PROJECT = BIGQUERY_CONFIG.projectId

// Primary production table (verified working)
const AR_DATASET = 'Reports'
const AR_TABLE = 'VwUnf_dim_ar_detail'

/**
 * Get AR aging by bucket
 * Uses Reports.VwUnf_dim_ar_detail with Age column
 */
export async function getARAging(
  options: FinanceQueryOptions = {}
): Promise<ARAging[]> {
  const { market, region } = options

  let whereClause = 'Outstanding_Amount > 0'
  if (market) whereClause += ` AND RTX_Market_Name = @market`
  if (region) whereClause += ` AND RTX_Region_Name = @region`

  const sql = `
    SELECT
      COALESCE(Age, 'Unknown') as aging_bucket,
      COUNT(*) as invoice_count,
      COALESCE(SUM(Outstanding_Amount), 0) as total_amount,
      COALESCE(RTX_Market_Name, 'Unknown') as market,
      COALESCE(RTX_Region_Name, 'Unknown') as region
    FROM \`${PROJECT}.${AR_DATASET}.${AR_TABLE}\`
    WHERE ${whereClause}
    GROUP BY Age, RTX_Market_Name, RTX_Region_Name
    ORDER BY
      CASE Age
        WHEN 'Current' THEN 1
        WHEN '1-30' THEN 2
        WHEN '31-60' THEN 3
        WHEN '61-90' THEN 4
        WHEN '91-120' THEN 5
        WHEN '120+' THEN 6
        ELSE 7
      END
  `

  try {
    const params: Record<string, unknown> = {}
    if (market) params.market = market
    if (region) params.region = region

    const result = await bigQueryClient.queryWithParams<ARAging>(sql, params)
    return result.rows
  } catch (error) {
    console.error('[Finance] getARAging failed:', error)
    return []
  }
}

/**
 * Get AR summary totals
 * Uses Reports.VwUnf_dim_ar_detail for comprehensive AR data
 */
export async function getARSummary(
  options: FinanceQueryOptions = {}
): Promise<ARSummary> {
  const { market, region } = options

  let whereClause = 'Outstanding_Amount > 0'
  if (market) whereClause += ` AND RTX_Market_Name = @market`
  if (region) whereClause += ` AND RTX_Region_Name = @region`

  const sql = `
    SELECT
      COALESCE(SUM(CASE WHEN Days <= 0 THEN Outstanding_Amount ELSE 0 END), 0) as current_amount,
      COALESCE(SUM(CASE WHEN Days > 0 AND Days <= 30 THEN Outstanding_Amount ELSE 0 END), 0) as past_due_1_30,
      COALESCE(SUM(CASE WHEN Days > 30 AND Days <= 60 THEN Outstanding_Amount ELSE 0 END), 0) as past_due_31_60,
      COALESCE(SUM(CASE WHEN Days > 60 AND Days <= 90 THEN Outstanding_Amount ELSE 0 END), 0) as past_due_61_90,
      COALESCE(SUM(CASE WHEN Days > 90 THEN Outstanding_Amount ELSE 0 END), 0) as past_due_90_plus,
      COALESCE(SUM(Outstanding_Amount), 0) as total_ar,
      COALESCE(SUM(CASE WHEN Days > 0 THEN Outstanding_Amount ELSE 0 END), 0) as total_past_due
    FROM \`${PROJECT}.${AR_DATASET}.${AR_TABLE}\`
    WHERE ${whereClause}
  `

  try {
    const params: Record<string, unknown> = {}
    if (market) params.market = market
    if (region) params.region = region

    const result = await bigQueryClient.queryWithParams<ARSummary>(sql, params)
    return result.rows[0] || getDefaultARSummary()
  } catch (error) {
    console.error('[Finance] getARSummary failed:', error)
    return getDefaultARSummary()
  }
}

function getDefaultARSummary(): ARSummary {
  return {
    current_amount: 0,
    past_due_1_30: 0,
    past_due_31_60: 0,
    past_due_61_90: 0,
    past_due_90_plus: 0,
    total_ar: 0,
    total_past_due: 0,
  }
}

/**
 * Get AR by branch
 * Uses Reports.VwUnf_dim_ar_detail grouped by branch
 */
export async function getARByBranch(
  options: FinanceQueryOptions = {}
): Promise<ARByBranch[]> {
  const { market, region, limit = 50 } = options

  let whereClause = 'Outstanding_Amount > 0'
  if (market) whereClause += ` AND RTX_Market_Name = @market`
  if (region) whereClause += ` AND RTX_Region_Name = @region`

  const sql = `
    SELECT
      COALESCE(RTX_Branch_Codes, '') as branch_cd,
      COALESCE(RTX_Branch_Name, 'Unknown') as branch_nm,
      COALESCE(RTX_Market_Name, 'Unknown') as market_nm,
      COALESCE(RTX_Region_Name, 'Unknown') as region_nm,
      COALESCE(SUM(Outstanding_Amount), 0) as total_amount,
      COALESCE(SUM(CASE WHEN Days > 0 THEN Outstanding_Amount ELSE 0 END), 0) as past_due,
      SAFE_DIVIDE(
        SUM(CASE WHEN Days > 0 THEN Outstanding_Amount ELSE 0 END),
        SUM(Outstanding_Amount)
      ) as past_due_pct
    FROM \`${PROJECT}.${AR_DATASET}.${AR_TABLE}\`
    WHERE ${whereClause}
    GROUP BY RTX_Branch_Codes, RTX_Branch_Name, RTX_Market_Name, RTX_Region_Name
    ORDER BY total_amount DESC
    LIMIT ${limit}
  `

  try {
    const params: Record<string, unknown> = {}
    if (market) params.market = market
    if (region) params.region = region

    const result = await bigQueryClient.queryWithParams<ARByBranch>(sql, params)
    return result.rows
  } catch (error) {
    console.error('[Finance] getARByBranch failed:', error)
    return []
  }
}

/**
 * Get AR invoice-level details with REAL customer data
 * Uses Reports.VwUnf_dim_ar_detail at the invoice level
 */
export async function getARDetails(
  options: FinanceQueryOptions = {}
): Promise<ARDetailRecord[]> {
  const { market, region, branch, limit = 100 } = options

  let whereClause = 'Outstanding_Amount > 0'
  if (market) whereClause += ` AND RTX_Market_Name = @market`
  if (region) whereClause += ` AND RTX_Region_Name = @region`
  if (branch) whereClause += ` AND RTX_Branch_Codes = @branch`

  const sql = `
    SELECT
      COALESCE(Invoice_number, 'Unknown') as invoice_number,
      COALESCE(CAST(CUSTNUM AS STRING), '') as customer_number,
      COALESCE(RTX_Branch_Codes, '') as branch_code,
      COALESCE(RTX_Branch_Name, 'Unknown') as branch_name,
      COALESCE(RTX_Market_Name, 'Unknown') as market_name,
      COALESCE(RTX_Region_Name, 'Unknown') as region_name,
      FORMAT_DATE('%Y-%m-%d', DATE(invoice_date)) as invoice_date,
      COALESCE(Original_Amount, 0) as original_amount,
      COALESCE(Paid_Amount, 0) as paid_amount,
      COALESCE(Outstanding_Amount, 0) as outstanding_amount,
      COALESCE(Days, 0) as days_outstanding,
      COALESCE(Age, 'Unknown') as aging_bucket
    FROM \`${PROJECT}.${AR_DATASET}.${AR_TABLE}\`
    WHERE ${whereClause}
    ORDER BY Outstanding_Amount DESC, Days DESC
    LIMIT ${limit}
  `

  try {
    const params: Record<string, unknown> = {}
    if (market) params.market = market
    if (region) params.region = region
    if (branch) params.branch = branch

    const result = await bigQueryClient.queryWithParams<ARDetailRecord>(sql, params)
    return result.rows
  } catch (error) {
    console.error('[Finance] getARDetails failed:', error)
    return []
  }
}

// =============================================================================
// REVENUE PROJECTIONS (BCG_RTD_DB.DR_RevProjection)
// =============================================================================

export interface RevenueProjectionRecord {
  projection_date: string
  market_name: string
  region_name: string
  branch_id: string
  projected_revenue_30: number
  projected_revenue_60: number
  projected_revenue_90: number
  projected_revenue_120: number
  actual_revenue: number
  confidence_level: string
}

export interface ProjectionAccuracyRecord {
  projection_period: number // 30, 60, 90, 120
  avg_variance_pct: number
  avg_accuracy_pct: number
  total_projections: number
  accurate_projections: number // within 10% variance
}

export interface VarianceAnalysisRecord {
  market_name: string
  region_name: string
  branch_id: string
  projection_period: number
  projected_revenue: number
  actual_revenue: number
  variance_amount: number
  variance_pct: number
  confidence_level: string
}

const BCG_DATASET = 'BCG_RTD_DB'
const PROJECTION_TABLE = 'DR_RevProjection'

/**
 * Get revenue projections with actuals
 * Uses BCG_RTD_DB.DR_RevProjection
 */
export async function getRevenueProjections(
  options: FinanceQueryOptions & { daysBack?: number } = {}
): Promise<RevenueProjectionRecord[]> {
  const { market, region, branch, daysBack = 90 } = options

  let whereClause = `projection_date >= DATE_SUB(CURRENT_DATE(), INTERVAL ${daysBack} DAY)`
  if (market) whereClause += ` AND market_name = @market`
  if (region) whereClause += ` AND region_name = @region`
  if (branch) whereClause += ` AND branch_id = @branch`

  const sql = `
    SELECT
      FORMAT_DATE('%Y-%m-%d', projection_date) as projection_date,
      COALESCE(market_name, 'Unknown') as market_name,
      COALESCE(region_name, 'Unknown') as region_name,
      COALESCE(branch_id, '') as branch_id,
      COALESCE(projected_revenue_30, 0) as projected_revenue_30,
      COALESCE(projected_revenue_60, 0) as projected_revenue_60,
      COALESCE(projected_revenue_90, 0) as projected_revenue_90,
      COALESCE(projected_revenue_120, 0) as projected_revenue_120,
      COALESCE(actual_revenue, 0) as actual_revenue,
      COALESCE(confidence_level, 'medium') as confidence_level
    FROM \`${PROJECT}.${BCG_DATASET}.${PROJECTION_TABLE}\`
    WHERE ${whereClause}
    ORDER BY projection_date DESC, market_name, region_name
    LIMIT 500
  `

  try {
    const params: Record<string, unknown> = {}
    if (market) params.market = market
    if (region) params.region = region
    if (branch) params.branch = branch

    const result = await bigQueryClient.queryWithParams<RevenueProjectionRecord>(sql, params)
    return result.rows
  } catch (error) {
    console.error('[Finance] getRevenueProjections failed:', error)
    return []
  }
}

/**
 * Get projection accuracy metrics
 * Calculates historical accuracy for 30/60/90/120 day projections
 */
export async function getProjectionAccuracy(
  options: FinanceQueryOptions & { daysBack?: number } = {}
): Promise<ProjectionAccuracyRecord[]> {
  const { market, region, branch, daysBack = 90 } = options

  let whereClause = `projection_date >= DATE_SUB(CURRENT_DATE(), INTERVAL ${daysBack} DAY)
    AND actual_revenue > 0`
  if (market) whereClause += ` AND market_name = @market`
  if (region) whereClause += ` AND region_name = @region`
  if (branch) whereClause += ` AND branch_id = @branch`

  const sql = `
    WITH projection_data AS (
      SELECT
        projection_date,
        projected_revenue_30,
        projected_revenue_60,
        projected_revenue_90,
        projected_revenue_120,
        actual_revenue
      FROM \`${PROJECT}.${BCG_DATASET}.${PROJECTION_TABLE}\`
      WHERE ${whereClause}
    ),
    accuracy_30 AS (
      SELECT
        30 as projection_period,
        AVG(SAFE_DIVIDE((actual_revenue - projected_revenue_30), projected_revenue_30) * 100) as avg_variance_pct,
        AVG(GREATEST(0, 100 - ABS(SAFE_DIVIDE((actual_revenue - projected_revenue_30), projected_revenue_30) * 100))) as avg_accuracy_pct,
        COUNT(*) as total_projections,
        COUNTIF(ABS(SAFE_DIVIDE((actual_revenue - projected_revenue_30), projected_revenue_30)) <= 0.10) as accurate_projections
      FROM projection_data
      WHERE projected_revenue_30 > 0
    ),
    accuracy_60 AS (
      SELECT
        60 as projection_period,
        AVG(SAFE_DIVIDE((actual_revenue - projected_revenue_60), projected_revenue_60) * 100) as avg_variance_pct,
        AVG(GREATEST(0, 100 - ABS(SAFE_DIVIDE((actual_revenue - projected_revenue_60), projected_revenue_60) * 100))) as avg_accuracy_pct,
        COUNT(*) as total_projections,
        COUNTIF(ABS(SAFE_DIVIDE((actual_revenue - projected_revenue_60), projected_revenue_60)) <= 0.10) as accurate_projections
      FROM projection_data
      WHERE projected_revenue_60 > 0
    ),
    accuracy_90 AS (
      SELECT
        90 as projection_period,
        AVG(SAFE_DIVIDE((actual_revenue - projected_revenue_90), projected_revenue_90) * 100) as avg_variance_pct,
        AVG(GREATEST(0, 100 - ABS(SAFE_DIVIDE((actual_revenue - projected_revenue_90), projected_revenue_90) * 100))) as avg_accuracy_pct,
        COUNT(*) as total_projections,
        COUNTIF(ABS(SAFE_DIVIDE((actual_revenue - projected_revenue_90), projected_revenue_90)) <= 0.10) as accurate_projections
      FROM projection_data
      WHERE projected_revenue_90 > 0
    ),
    accuracy_120 AS (
      SELECT
        120 as projection_period,
        AVG(SAFE_DIVIDE((actual_revenue - projected_revenue_120), projected_revenue_120) * 100) as avg_variance_pct,
        AVG(GREATEST(0, 100 - ABS(SAFE_DIVIDE((actual_revenue - projected_revenue_120), projected_revenue_120) * 100))) as avg_accuracy_pct,
        COUNT(*) as total_projections,
        COUNTIF(ABS(SAFE_DIVIDE((actual_revenue - projected_revenue_120), projected_revenue_120)) <= 0.10) as accurate_projections
      FROM projection_data
      WHERE projected_revenue_120 > 0
    )
    SELECT * FROM accuracy_30
    UNION ALL SELECT * FROM accuracy_60
    UNION ALL SELECT * FROM accuracy_90
    UNION ALL SELECT * FROM accuracy_120
    ORDER BY projection_period
  `

  try {
    const params: Record<string, unknown> = {}
    if (market) params.market = market
    if (region) params.region = region
    if (branch) params.branch = branch

    const result = await bigQueryClient.queryWithParams<ProjectionAccuracyRecord>(sql, params)
    return result.rows
  } catch (error) {
    console.error('[Finance] getProjectionAccuracy failed:', error)
    return []
  }
}

/**
 * Get variance analysis by market/region/branch
 * Analyzes projection variance with confidence levels
 */
export async function getVarianceAnalysis(
  options: FinanceQueryOptions & { daysBack?: number; projectionPeriod?: number } = {}
): Promise<VarianceAnalysisRecord[]> {
  const { market, region, branch, daysBack = 90, projectionPeriod = 30 } = options

  let whereClause = `projection_date >= DATE_SUB(CURRENT_DATE(), INTERVAL ${daysBack} DAY)
    AND actual_revenue > 0`
  if (market) whereClause += ` AND market_name = @market`
  if (region) whereClause += ` AND region_name = @region`
  if (branch) whereClause += ` AND branch_id = @branch`

  // Dynamically select projection column based on period
  const projectionColumn = `projected_revenue_${projectionPeriod}`

  const sql = `
    SELECT
      COALESCE(market_name, 'Unknown') as market_name,
      COALESCE(region_name, 'Unknown') as region_name,
      COALESCE(branch_id, '') as branch_id,
      ${projectionPeriod} as projection_period,
      COALESCE(${projectionColumn}, 0) as projected_revenue,
      COALESCE(actual_revenue, 0) as actual_revenue,
      (actual_revenue - ${projectionColumn}) as variance_amount,
      SAFE_DIVIDE((actual_revenue - ${projectionColumn}), ${projectionColumn}) * 100 as variance_pct,
      COALESCE(confidence_level, 'medium') as confidence_level
    FROM \`${PROJECT}.${BCG_DATASET}.${PROJECTION_TABLE}\`
    WHERE ${whereClause}
      AND ${projectionColumn} > 0
    ORDER BY ABS(variance_pct) DESC
    LIMIT 100
  `

  try {
    const params: Record<string, unknown> = {}
    if (market) params.market = market
    if (region) params.region = region
    if (branch) params.branch = branch

    const result = await bigQueryClient.queryWithParams<VarianceAnalysisRecord>(sql, params)
    return result.rows
  } catch (error) {
    console.error('[Finance] getVarianceAnalysis failed:', error)
    return []
  }
}
