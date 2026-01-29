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
  region?: string
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
  const { daysBack = 30 } = options

  // Multi-source aggregation query using verified tables
  // Note: Using S0_TMX.tmx_lead with correct column names
  const sql = `
    -- Sales Metrics (using tmx_lead_activity_fact for amounts)
    WITH sales_metrics AS (
      SELECT
        'Sales' as category,
        'Revenue' as metric,
        COALESCE(SUM(laf.raw_sales_amt), 0) as value,
        COALESCE(SUM(laf.raw_sales_amt), 0) * 1.1 as target
      FROM \`${PROJECT}.S0_TMX.tmx_lead_activity_fact\` laf
      WHERE laf.raw_sales_amt > 0
        AND ${buildDateFilter('laf.activity_date', daysBack)}
    ),
    -- Leads Metrics
    leads_metrics AS (
      SELECT
        'Pipeline' as category,
        'New Leads' as metric,
        COUNT(*) as value,
        COUNT(*) * 1.1 as target
      FROM \`${PROJECT}.S0_TMX.tmx_lead\` l
      WHERE ${buildDateFilter('l.received_date', daysBack)}
    ),
    -- Win Rate
    win_rate_metrics AS (
      SELECT
        'Sales' as category,
        'Win Rate' as metric,
        ROUND(SAFE_DIVIDE(
          COUNT(CASE WHEN l.sold_date IS NOT NULL THEN 1 END),
          COUNT(CASE WHEN l.proposed_date IS NOT NULL THEN 1 END)
        ) * 100, 2) as value,
        25.0 as target
      FROM \`${PROJECT}.S0_TMX.tmx_lead\` l
      WHERE ${buildDateFilter('l.received_date', daysBack)}
    ),
    -- Backlog (sold but not started/canceled)
    backlog_metrics AS (
      SELECT
        'Sales' as category,
        'Backlog' as metric,
        COUNT(*) as value,
        50 as target
      FROM \`${PROJECT}.S0_TMX.tmx_lead\` l
      WHERE l.sold_date IS NOT NULL
        AND l.cancel_date IS NULL
        AND ${buildDateFilter('l.sold_date', daysBack)}
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
      UNION ALL SELECT * FROM leads_metrics
      UNION ALL SELECT * FROM win_rate_metrics
      UNION ALL SELECT * FROM backlog_metrics
    )
    ORDER BY category, metric
  `

  const result = await bigQueryClient.query<ExecutiveCommandCenter>(sql)
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
    LIMIT ${limit}
  `

  const params: Record<string, unknown> = {}
  if (kpiSlug) params.kpiSlug = kpiSlug

  const result = await bigQueryClient.queryWithParams<KPIDetail>(sql, params)
  return result.rows
}
