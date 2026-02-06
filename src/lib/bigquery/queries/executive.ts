/**
 * BigQuery Queries for Executive Module
 *
 * Multi-table aggregations for executive command center and KPI details
 * Tables: S0_TMX.tmx_lead, S0_TMX.tmx_lead_activity_fact, S0_TMX.tmx_business_unit
 * Pages: /, /kpi/[slug]
 *
 * VERIFIED COLUMNS from S0_TMX.tmx_lead:
 * - received_date, assigned_date, scheduled_date, inspected_date, proposed_date, sold_date, cancel_date
 * - curr_assigned_employee_sid, assigned_bunit_sid, tmx_lead_sid
 *
 * VERIFIED COLUMNS from S0_TMX.tmx_lead_activity_fact:
 * - raw_sales_amt, proposal_contract_amount, activity_date
 */

import { bigQueryClient, BIGQUERY_CONFIG } from '../client'
import { handleBigQueryError } from '../error-handler'
import { validateOrgCode, validateNumeric, validateString } from '../validation'
import { buildDateFilter, percentage } from './field-calculators'

// =============================================================================
// Types
// =============================================================================

export interface ExecutiveCommandCenter {
  category: string
  metric: string
  value: number
  target: number
  variance_pct: number
  trend: 'up' | 'down' | 'flat'
  status: 'good' | 'warning' | 'critical'
}

export interface KPIDetail {
  kpi_name: string
  kpi_slug: string
  current_value: number
  prior_value: number
  target_value: number
  variance_pct: number
  yoy_change_pct: number
  trend_direction: string
  last_updated: string
}

// =============================================================================
// Query Options
// =============================================================================

export interface ExecutiveQueryOptions {
  daysBack?: number
  market?: string
  marketCode?: string
  region?: string
  regionCode?: string
  branch?: string
  branchCode?: string
  kpiSlug?: string
  limit?: number
}

// =============================================================================
// Queries
// =============================================================================

const PROJECT = BIGQUERY_CONFIG.projectId

/**
 * Get executive command center metrics
 * Aggregates data from multiple sources into a unified dashboard view
 */
export async function getExecutiveCommandCenter(
  options: ExecutiveQueryOptions = {}
): Promise<ExecutiveCommandCenter[]> {
  const { daysBack = 30, market, marketCode, region, regionCode, branch, branchCode } = options

  // Determine which org codes to use (prefer -Code versions for consistency)
  const effectiveMarket = marketCode || market
  const effectiveRegion = regionCode || region
  const effectiveBranch = branchCode || branch

  // Validate org codes before use
  if (effectiveMarket) validateOrgCode(effectiveMarket, 'market')
  if (effectiveRegion) validateOrgCode(effectiveRegion, 'region')
  if (effectiveBranch) validateOrgCode(effectiveBranch, 'branch')

  // Build org filter conditions using parameterized queries
  // Note: assigned_bunit_sid is INT64, RTX_Branch_Codes is STRING, so we need CAST
  const orgJoin = (effectiveMarket || effectiveRegion)
    ? `LEFT JOIN \`${PROJECT}.S2.VwUnf_Branch\` b ON CAST(l.assigned_bunit_sid AS STRING) = b.RTX_Branch_Codes`
    : ''

  const orgFilters: string[] = []
  const queryParams: Record<string, unknown> = {}
  if (effectiveMarket) {
    orgFilters.push(`b.RTX_Market_Code = @marketCode`)
    queryParams.marketCode = effectiveMarket
  }
  if (effectiveRegion) {
    orgFilters.push(`b.RTX_Region_Code = @regionCode`)
    queryParams.regionCode = effectiveRegion
  }
  if (effectiveBranch) {
    orgFilters.push(`CAST(l.assigned_bunit_sid AS STRING) = @branchCode`)
    queryParams.branchCode = effectiveBranch
  }

  const orgWhere = orgFilters.length > 0 ? `AND ${orgFilters.join(' AND ')}` : ''
  const useParams = Object.keys(queryParams).length > 0

  // Multi-source aggregation query using verified tables
  // Consolidated: single scan of tmx_lead for leads/win_rate/backlog metrics
  const sql = `
    -- Sales Revenue (using tmx_lead_activity_fact for amounts)
    WITH sales_metrics AS (
      SELECT
        'Sales' as category,
        'Revenue' as metric,
        COALESCE(SUM(laf.raw_sales_amt), 0) as value,
        COALESCE(SUM(laf.raw_sales_amt), 0) * 1.1 as target
      FROM \`${PROJECT}.S0_TMX.tmx_lead_activity_fact\` laf
      INNER JOIN \`${PROJECT}.S0_TMX.tmx_lead\` l ON laf.tmx_lead_sid = l.tmx_lead_sid
      ${orgJoin}
      WHERE laf.raw_sales_amt > 0
        AND ${buildDateFilter('laf.activity_date', daysBack)}
        ${orgWhere}
    ),
    -- Single scan of tmx_lead for leads, win rate, and backlog (was 3 separate scans)
    lead_aggregates AS (
      SELECT
        COUNT(CASE WHEN ${buildDateFilter('l.received_date', daysBack)} THEN 1 END) as new_leads,
        COUNT(CASE WHEN ${buildDateFilter('l.received_date', daysBack)} AND l.sold_date IS NOT NULL THEN 1 END) as sold_count,
        COUNT(CASE WHEN ${buildDateFilter('l.received_date', daysBack)} AND l.proposed_date IS NOT NULL THEN 1 END) as proposed_count,
        COUNT(CASE WHEN l.sold_date IS NOT NULL AND l.cancel_date IS NULL AND ${buildDateFilter('l.sold_date', daysBack)} THEN 1 END) as backlog_count
      FROM \`${PROJECT}.S0_TMX.tmx_lead\` l
      ${orgJoin}
      WHERE (${buildDateFilter('l.received_date', daysBack)} OR (l.sold_date IS NOT NULL AND ${buildDateFilter('l.sold_date', daysBack)}))
        ${orgWhere}
    )

    SELECT
      category,
      metric,
      value,
      target,
      ROUND(SAFE_DIVIDE(value - target, NULLIF(target, 0)) * 100, 2) as variance_pct,
      CASE
        WHEN value > target THEN 'up'
        WHEN value < target THEN 'down'
        ELSE 'flat'
      END as trend,
      CASE
        WHEN ABS(SAFE_DIVIDE(value - target, NULLIF(target, 0))) <= 0.05 THEN 'good'
        WHEN ABS(SAFE_DIVIDE(value - target, NULLIF(target, 0))) <= 0.15 THEN 'warning'
        ELSE 'critical'
      END as status
    FROM (
      SELECT * FROM sales_metrics
      UNION ALL SELECT 'Pipeline', 'New Leads', new_leads, CAST(new_leads * 1.1 AS FLOAT64) FROM lead_aggregates
      UNION ALL SELECT 'Sales', 'Win Rate', ROUND(SAFE_DIVIDE(sold_count, NULLIF(proposed_count, 0)) * 100, 2), 25.0 FROM lead_aggregates
      UNION ALL SELECT 'Sales', 'Backlog', backlog_count, 50 FROM lead_aggregates
    )
    ORDER BY category, metric
  `

  const result = useParams
    ? await bigQueryClient.queryWithParams<ExecutiveCommandCenter>(sql, queryParams)
    : await bigQueryClient.query<ExecutiveCommandCenter>(sql)
  return result.rows
}

/**
 * Get KPI detail for a specific KPI
 */
export async function getKPIDetail(
  options: ExecutiveQueryOptions = {}
): Promise<KPIDetail[]> {
  const { daysBack = 30, kpiSlug, limit = 50 } = options

  // This query provides dynamic KPI detail based on the slug
  // In a real implementation, this would route to specific queries per KPI
  const sql = `
    WITH kpi_definitions AS (
      SELECT 'revenue' as kpi_slug, 'Total Revenue' as kpi_name, 'sales' as source_type
      UNION ALL SELECT 'leads', 'New Leads', 'leads'
      UNION ALL SELECT 'win_rate', 'Win Rate %', 'sales'
      UNION ALL SELECT 'close_rate', 'Close Rate %', 'sales'
      UNION ALL SELECT 'callbacks', 'Callback Count', 'ops'
      UNION ALL SELECT 'completion_rate', 'Service Completion %', 'ops'
      UNION ALL SELECT 'backlog', 'Sales Backlog', 'sales'
      UNION ALL SELECT 'pipeline', 'Pipeline Value', 'sales'
    ),
    current_values AS (
      -- Revenue (using tmx_lead_activity_fact)
      SELECT
        'revenue' as kpi_slug,
        COALESCE(SUM(laf.raw_sales_amt), 0) as current_value,
        COALESCE(SUM(laf.raw_sales_amt), 0) * 1.1 as target_value
      FROM \`${PROJECT}.S0_TMX.tmx_lead_activity_fact\` laf
      WHERE laf.raw_sales_amt > 0
        AND ${buildDateFilter('laf.activity_date', daysBack)}

      UNION ALL

      -- Leads
      SELECT
        'leads' as kpi_slug,
        COUNT(*) as current_value,
        COUNT(*) * 1.1 as target_value
      FROM \`${PROJECT}.S0_TMX.tmx_lead\` l
      WHERE ${buildDateFilter('l.received_date', daysBack)}

      UNION ALL

      -- Win Rate
      SELECT
        'win_rate' as kpi_slug,
        ROUND(SAFE_DIVIDE(
          COUNT(CASE WHEN l.sold_date IS NOT NULL THEN 1 END),
          COUNT(CASE WHEN l.proposed_date IS NOT NULL THEN 1 END)
        ) * 100, 2) as current_value,
        25.0 as target_value
      FROM \`${PROJECT}.S0_TMX.tmx_lead\` l
      WHERE ${buildDateFilter('l.received_date', daysBack)}

      UNION ALL

      -- Close Rate
      SELECT
        'close_rate' as kpi_slug,
        ROUND(SAFE_DIVIDE(
          COUNT(CASE WHEN l.sold_date IS NOT NULL THEN 1 END),
          COUNT(*)
        ) * 100, 2) as current_value,
        15.0 as target_value
      FROM \`${PROJECT}.S0_TMX.tmx_lead\` l
      WHERE ${buildDateFilter('l.received_date', daysBack)}
    ),
    prior_values AS (
      -- Revenue prior period
      SELECT
        'revenue' as kpi_slug,
        COALESCE(SUM(laf.raw_sales_amt), 0) as prior_value
      FROM \`${PROJECT}.S0_TMX.tmx_lead_activity_fact\` laf
      WHERE laf.raw_sales_amt > 0
        AND DATE(laf.activity_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${daysBack * 2} DAY)
        AND DATE(laf.activity_date) < DATE_SUB(CURRENT_DATE(), INTERVAL ${daysBack} DAY)

      UNION ALL

      -- Leads prior period
      SELECT
        'leads' as kpi_slug,
        COUNT(*) as prior_value
      FROM \`${PROJECT}.S0_TMX.tmx_lead\` l
      WHERE DATE(l.received_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${daysBack * 2} DAY)
        AND DATE(l.received_date) < DATE_SUB(CURRENT_DATE(), INTERVAL ${daysBack} DAY)

      UNION ALL

      -- Win Rate prior period
      SELECT
        'win_rate' as kpi_slug,
        ROUND(SAFE_DIVIDE(
          COUNT(CASE WHEN l.sold_date IS NOT NULL THEN 1 END),
          COUNT(CASE WHEN l.proposed_date IS NOT NULL THEN 1 END)
        ) * 100, 2) as prior_value
      FROM \`${PROJECT}.S0_TMX.tmx_lead\` l
      WHERE DATE(l.received_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${daysBack * 2} DAY)
        AND DATE(l.received_date) < DATE_SUB(CURRENT_DATE(), INTERVAL ${daysBack} DAY)

      UNION ALL

      -- Close Rate prior period
      SELECT
        'close_rate' as kpi_slug,
        ROUND(SAFE_DIVIDE(
          COUNT(CASE WHEN l.sold_date IS NOT NULL THEN 1 END),
          COUNT(*)
        ) * 100, 2) as prior_value
      FROM \`${PROJECT}.S0_TMX.tmx_lead\` l
      WHERE DATE(l.received_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${daysBack * 2} DAY)
        AND DATE(l.received_date) < DATE_SUB(CURRENT_DATE(), INTERVAL ${daysBack} DAY)
    )

    SELECT
      kd.kpi_name,
      kd.kpi_slug,
      ROUND(cv.current_value, 2) as current_value,
      ROUND(COALESCE(pv.prior_value, 0), 2) as prior_value,
      ROUND(cv.target_value, 2) as target_value,
      ${percentage('cv.current_value - cv.target_value', 'NULLIF(cv.target_value, 0)')} as variance_pct,
      ${percentage('cv.current_value - COALESCE(pv.prior_value, 0)', 'NULLIF(pv.prior_value, 0)')} as yoy_change_pct,
      CASE
        WHEN cv.current_value > COALESCE(pv.prior_value, 0) THEN 'up'
        WHEN cv.current_value < COALESCE(pv.prior_value, 0) THEN 'down'
        ELSE 'flat'
      END as trend_direction,
      FORMAT_TIMESTAMP('%Y-%m-%d %H:%M:%S', CURRENT_TIMESTAMP()) as last_updated
    FROM kpi_definitions kd
    LEFT JOIN current_values cv ON kd.kpi_slug = cv.kpi_slug
    LEFT JOIN prior_values pv ON kd.kpi_slug = pv.kpi_slug
    WHERE cv.current_value IS NOT NULL
      ${kpiSlug ? 'AND kd.kpi_slug = @kpiSlug' : ''}
    ORDER BY kd.kpi_name
    LIMIT @resultLimit
  `

  const params: Record<string, unknown> = { resultLimit: Math.floor(Number(limit)) }
  if (kpiSlug) params.kpiSlug = kpiSlug

  const result = await bigQueryClient.queryWithParams<KPIDetail>(sql, params)
  return result.rows
}
