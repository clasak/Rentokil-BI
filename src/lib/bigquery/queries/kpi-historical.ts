/**
 * BigQuery Queries for KPI Historical Comparisons
 *
 * Provides real prior-period comparison data for KPI trend arrows and deltas.
 * Replaces fabricated Math.random() values with actual BigQuery-sourced historical data.
 *
 * Tables:
 * - S0_TMX.tmx_lead (leads, win rate, close rate)
 * - S0_TMX.tmx_lead_activity_fact (revenue, sales amounts)
 * - W3_Contract_Checker.T0_unf_Contract_All (contracts, pipeline)
 * - Reports.VwUnf_dim_ar_detail (AR aging, collections)
 * - S0_TMX.tmx_employee (workforce metrics)
 *
 * Pages: All KPI-displaying pages (command center, QBR, WBR, finance, ops, sales)
 */

import { bigQueryClient, BIGQUERY_CONFIG } from '../client'
import { buildDateFilter, percentage } from './field-calculators'

// =============================================================================
// Types
// =============================================================================

export interface KPIHistoricalComparison {
  kpi_slug: string
  kpi_name: string
  current_value: number
  prior_value: number
  delta: number
  delta_pct: number
  trend_direction: 'up' | 'down' | 'flat'
  period_label: string
  prior_period_label: string
  last_updated: string
}

export interface KPIMonthlyTrend {
  kpi_slug: string
  period_start: string
  period_end: string
  value: number
  period_label: string
}

export interface KPIHistoricalOptions {
  daysBack?: number
  market?: string
  marketCode?: string
  region?: string
  regionCode?: string
  branch?: string
  branchCode?: string
  kpiSlugs?: string[]
  trendMonths?: number
}

// =============================================================================
// Queries
// =============================================================================

const PROJECT = BIGQUERY_CONFIG.projectId

/**
 * Build org filter WHERE clauses for market/region/branch
 */
function buildOrgFilters(options: KPIHistoricalOptions, tableAlias: string = ''): string {
  const prefix = tableAlias ? `${tableAlias}.` : ''
  const filters: string[] = []

  const market = options.marketCode || options.market
  const region = options.regionCode || options.region
  const branch = options.branchCode || options.branch

  if (market) filters.push(`${prefix}assigned_bunit_sid LIKE '${market}%'`)
  if (region) filters.push(`${prefix}assigned_bunit_sid LIKE '%${region}%'`)
  if (branch) filters.push(`${prefix}assigned_bunit_sid = '${branch}'`)

  return filters.length > 0 ? `AND ${filters.join(' AND ')}` : ''
}

/**
 * Get KPI historical comparisons - current vs prior period for all major KPIs
 *
 * Returns current_value, prior_value, delta, and trend_direction for each KPI.
 * Uses the same BigQuery tables that feed the live dashboards.
 */
export async function getKPIHistoricalComparisons(
  options: KPIHistoricalOptions = {}
): Promise<KPIHistoricalComparison[]> {
  const { daysBack = 30 } = options
  const orgFilters = buildOrgFilters(options, 'l')
  const orgFiltersLaf = buildOrgFilters(options, 'laf')

  const sql = `
    -- KPI Historical Comparisons: current vs prior period
    -- Each CTE computes a KPI for the current period and the equivalent prior period

    -- Revenue: sum of sales amounts
    WITH revenue_current AS (
      SELECT
        COALESCE(SUM(laf.raw_sales_amt), 0) as value
      FROM \`${PROJECT}.S0_TMX.tmx_lead_activity_fact\` laf
      WHERE laf.raw_sales_amt > 0
        AND ${buildDateFilter('laf.activity_date', daysBack)}
        ${orgFiltersLaf}
    ),
    revenue_prior AS (
      SELECT
        COALESCE(SUM(laf.raw_sales_amt), 0) as value
      FROM \`${PROJECT}.S0_TMX.tmx_lead_activity_fact\` laf
      WHERE laf.raw_sales_amt > 0
        AND DATE(laf.activity_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${daysBack * 2} DAY)
        AND DATE(laf.activity_date) < DATE_SUB(CURRENT_DATE(), INTERVAL ${daysBack} DAY)
        ${orgFiltersLaf}
    ),

    -- Lead Count
    leads_current AS (
      SELECT COUNT(*) as value
      FROM \`${PROJECT}.S0_TMX.tmx_lead\` l
      WHERE ${buildDateFilter('l.received_date', daysBack)}
        ${orgFilters}
    ),
    leads_prior AS (
      SELECT COUNT(*) as value
      FROM \`${PROJECT}.S0_TMX.tmx_lead\` l
      WHERE DATE(l.received_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${daysBack * 2} DAY)
        AND DATE(l.received_date) < DATE_SUB(CURRENT_DATE(), INTERVAL ${daysBack} DAY)
        ${orgFilters}
    ),

    -- Win Rate: sold / proposed
    win_rate_current AS (
      SELECT
        ROUND(SAFE_DIVIDE(
          COUNT(CASE WHEN l.sold_date IS NOT NULL THEN 1 END),
          NULLIF(COUNT(CASE WHEN l.proposed_date IS NOT NULL THEN 1 END), 0)
        ), 4) as value
      FROM \`${PROJECT}.S0_TMX.tmx_lead\` l
      WHERE ${buildDateFilter('l.received_date', daysBack)}
        ${orgFilters}
    ),
    win_rate_prior AS (
      SELECT
        ROUND(SAFE_DIVIDE(
          COUNT(CASE WHEN l.sold_date IS NOT NULL THEN 1 END),
          NULLIF(COUNT(CASE WHEN l.proposed_date IS NOT NULL THEN 1 END), 0)
        ), 4) as value
      FROM \`${PROJECT}.S0_TMX.tmx_lead\` l
      WHERE DATE(l.received_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${daysBack * 2} DAY)
        AND DATE(l.received_date) < DATE_SUB(CURRENT_DATE(), INTERVAL ${daysBack} DAY)
        ${orgFilters}
    ),

    -- Close Rate: sold / total received
    close_rate_current AS (
      SELECT
        ROUND(SAFE_DIVIDE(
          COUNT(CASE WHEN l.sold_date IS NOT NULL THEN 1 END),
          NULLIF(COUNT(*), 0)
        ), 4) as value
      FROM \`${PROJECT}.S0_TMX.tmx_lead\` l
      WHERE ${buildDateFilter('l.received_date', daysBack)}
        ${orgFilters}
    ),
    close_rate_prior AS (
      SELECT
        ROUND(SAFE_DIVIDE(
          COUNT(CASE WHEN l.sold_date IS NOT NULL THEN 1 END),
          NULLIF(COUNT(*), 0)
        ), 4) as value
      FROM \`${PROJECT}.S0_TMX.tmx_lead\` l
      WHERE DATE(l.received_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${daysBack * 2} DAY)
        AND DATE(l.received_date) < DATE_SUB(CURRENT_DATE(), INTERVAL ${daysBack} DAY)
        ${orgFilters}
    ),

    -- Pipeline: proposal amounts for leads not yet sold/cancelled
    pipeline_current AS (
      SELECT
        COALESCE(SUM(l.proposal_amount), 0) as value
      FROM \`${PROJECT}.S0_TMX.tmx_lead\` l
      WHERE l.proposed_date IS NOT NULL
        AND l.sold_date IS NULL
        AND l.cancel_date IS NULL
        AND ${buildDateFilter('l.proposed_date', daysBack)}
        ${orgFilters}
    ),
    pipeline_prior AS (
      SELECT
        COALESCE(SUM(l.proposal_amount), 0) as value
      FROM \`${PROJECT}.S0_TMX.tmx_lead\` l
      WHERE l.proposed_date IS NOT NULL
        AND l.sold_date IS NULL
        AND l.cancel_date IS NULL
        AND DATE(l.proposed_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${daysBack * 2} DAY)
        AND DATE(l.proposed_date) < DATE_SUB(CURRENT_DATE(), INTERVAL ${daysBack} DAY)
        ${orgFilters}
    ),

    -- Cancel Rate: cancelled / total
    cancel_rate_current AS (
      SELECT
        ROUND(SAFE_DIVIDE(
          COUNT(CASE WHEN l.cancel_date IS NOT NULL THEN 1 END),
          NULLIF(COUNT(*), 0)
        ), 4) as value
      FROM \`${PROJECT}.S0_TMX.tmx_lead\` l
      WHERE ${buildDateFilter('l.received_date', daysBack)}
        ${orgFilters}
    ),
    cancel_rate_prior AS (
      SELECT
        ROUND(SAFE_DIVIDE(
          COUNT(CASE WHEN l.cancel_date IS NOT NULL THEN 1 END),
          NULLIF(COUNT(*), 0)
        ), 4) as value
      FROM \`${PROJECT}.S0_TMX.tmx_lead\` l
      WHERE DATE(l.received_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${daysBack * 2} DAY)
        AND DATE(l.received_date) < DATE_SUB(CURRENT_DATE(), INTERVAL ${daysBack} DAY)
        ${orgFilters}
    ),

    -- Avg Cycle Time: days from received to sold
    cycle_time_current AS (
      SELECT
        ROUND(AVG(DATE_DIFF(DATE(l.sold_date), DATE(l.received_date), DAY)), 1) as value
      FROM \`${PROJECT}.S0_TMX.tmx_lead\` l
      WHERE l.sold_date IS NOT NULL
        AND ${buildDateFilter('l.sold_date', daysBack)}
        ${orgFilters}
    ),
    cycle_time_prior AS (
      SELECT
        ROUND(AVG(DATE_DIFF(DATE(l.sold_date), DATE(l.received_date), DAY)), 1) as value
      FROM \`${PROJECT}.S0_TMX.tmx_lead\` l
      WHERE l.sold_date IS NOT NULL
        AND DATE(l.sold_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${daysBack * 2} DAY)
        AND DATE(l.sold_date) < DATE_SUB(CURRENT_DATE(), INTERVAL ${daysBack} DAY)
        ${orgFilters}
    ),

    -- Avg Deal Size: average sales amount per sold lead
    deal_size_current AS (
      SELECT
        ROUND(AVG(laf.raw_sales_amt), 2) as value
      FROM \`${PROJECT}.S0_TMX.tmx_lead_activity_fact\` laf
      WHERE laf.raw_sales_amt > 0
        AND ${buildDateFilter('laf.activity_date', daysBack)}
        ${orgFiltersLaf}
    ),
    deal_size_prior AS (
      SELECT
        ROUND(AVG(laf.raw_sales_amt), 2) as value
      FROM \`${PROJECT}.S0_TMX.tmx_lead_activity_fact\` laf
      WHERE laf.raw_sales_amt > 0
        AND DATE(laf.activity_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${daysBack * 2} DAY)
        AND DATE(laf.activity_date) < DATE_SUB(CURRENT_DATE(), INTERVAL ${daysBack} DAY)
        ${orgFiltersLaf}
    ),

    -- Combine all KPIs
    all_kpis AS (
      SELECT 'revenue' as kpi_slug, 'Revenue' as kpi_name,
        (SELECT value FROM revenue_current) as current_value,
        (SELECT value FROM revenue_prior) as prior_value
      UNION ALL
      SELECT 'leads', 'Lead Count',
        (SELECT value FROM leads_current),
        (SELECT value FROM leads_prior)
      UNION ALL
      SELECT 'win_rate', 'Win Rate',
        (SELECT value FROM win_rate_current),
        (SELECT value FROM win_rate_prior)
      UNION ALL
      SELECT 'close_rate', 'Close Rate',
        (SELECT value FROM close_rate_current),
        (SELECT value FROM close_rate_prior)
      UNION ALL
      SELECT 'pipeline', 'Pipeline Value',
        (SELECT value FROM pipeline_current),
        (SELECT value FROM pipeline_prior)
      UNION ALL
      SELECT 'cancel_rate', 'Cancel Rate',
        (SELECT value FROM cancel_rate_current),
        (SELECT value FROM cancel_rate_prior)
      UNION ALL
      SELECT 'avg_cycle_time', 'Avg Cycle Time (Days)',
        (SELECT value FROM cycle_time_current),
        (SELECT value FROM cycle_time_prior)
      UNION ALL
      SELECT 'avg_deal_size', 'Avg Deal Size',
        (SELECT value FROM deal_size_current),
        (SELECT value FROM deal_size_prior)
    )

    SELECT
      kpi_slug,
      kpi_name,
      ROUND(COALESCE(current_value, 0), 2) as current_value,
      ROUND(COALESCE(prior_value, 0), 2) as prior_value,
      ROUND(COALESCE(current_value, 0) - COALESCE(prior_value, 0), 2) as delta,
      ${percentage('COALESCE(current_value, 0) - COALESCE(prior_value, 0)', 'NULLIF(COALESCE(prior_value, 0), 0)')} as delta_pct,
      CASE
        WHEN COALESCE(current_value, 0) > COALESCE(prior_value, 0) THEN 'up'
        WHEN COALESCE(current_value, 0) < COALESCE(prior_value, 0) THEN 'down'
        ELSE 'flat'
      END as trend_direction,
      FORMAT('Last %d days', ${daysBack}) as period_label,
      FORMAT('Prior %d days', ${daysBack}) as prior_period_label,
      FORMAT_TIMESTAMP('%Y-%m-%d %H:%M:%S', CURRENT_TIMESTAMP()) as last_updated
    FROM all_kpis
    WHERE current_value IS NOT NULL OR prior_value IS NOT NULL
    ORDER BY kpi_slug
  `

  const result = await bigQueryClient.query<KPIHistoricalComparison>(sql)
  return result.rows
}

/**
 * Get monthly KPI trend data for sparkline charts
 *
 * Returns one data point per month per KPI, going back N months.
 * Used to populate trend arrays in the KPI cards.
 */
export async function getKPIMonthlyTrends(
  options: KPIHistoricalOptions = {}
): Promise<KPIMonthlyTrend[]> {
  const { trendMonths = 6 } = options
  const orgFilters = buildOrgFilters(options, 'l')
  const orgFiltersLaf = buildOrgFilters(options, 'laf')

  const sql = `
    -- Monthly KPI trends for sparkline charts
    WITH months AS (
      SELECT
        DATE_TRUNC(DATE_SUB(CURRENT_DATE(), INTERVAL m MONTH), MONTH) as period_start,
        LAST_DAY(DATE_SUB(CURRENT_DATE(), INTERVAL m MONTH)) as period_end,
        FORMAT_DATE('%b %Y', DATE_SUB(CURRENT_DATE(), INTERVAL m MONTH)) as period_label
      FROM UNNEST(GENERATE_ARRAY(0, ${trendMonths - 1})) as m
    ),

    -- Revenue per month
    monthly_revenue AS (
      SELECT
        DATE_TRUNC(DATE(laf.activity_date), MONTH) as month,
        COALESCE(SUM(laf.raw_sales_amt), 0) as value
      FROM \`${PROJECT}.S0_TMX.tmx_lead_activity_fact\` laf
      WHERE laf.raw_sales_amt > 0
        AND DATE(laf.activity_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${trendMonths} MONTH)
        ${orgFiltersLaf}
      GROUP BY 1
    ),

    -- Leads per month
    monthly_leads AS (
      SELECT
        DATE_TRUNC(DATE(l.received_date), MONTH) as month,
        COUNT(*) as value
      FROM \`${PROJECT}.S0_TMX.tmx_lead\` l
      WHERE DATE(l.received_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${trendMonths} MONTH)
        ${orgFilters}
      GROUP BY 1
    ),

    -- Win rate per month
    monthly_win_rate AS (
      SELECT
        DATE_TRUNC(DATE(l.received_date), MONTH) as month,
        ROUND(SAFE_DIVIDE(
          COUNT(CASE WHEN l.sold_date IS NOT NULL THEN 1 END),
          NULLIF(COUNT(CASE WHEN l.proposed_date IS NOT NULL THEN 1 END), 0)
        ), 4) as value
      FROM \`${PROJECT}.S0_TMX.tmx_lead\` l
      WHERE DATE(l.received_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${trendMonths} MONTH)
        ${orgFilters}
      GROUP BY 1
    ),

    -- Close rate per month
    monthly_close_rate AS (
      SELECT
        DATE_TRUNC(DATE(l.received_date), MONTH) as month,
        ROUND(SAFE_DIVIDE(
          COUNT(CASE WHEN l.sold_date IS NOT NULL THEN 1 END),
          NULLIF(COUNT(*), 0)
        ), 4) as value
      FROM \`${PROJECT}.S0_TMX.tmx_lead\` l
      WHERE DATE(l.received_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${trendMonths} MONTH)
        ${orgFilters}
      GROUP BY 1
    )

    -- Revenue trends
    SELECT
      'revenue' as kpi_slug,
      CAST(m.period_start AS STRING) as period_start,
      CAST(m.period_end AS STRING) as period_end,
      COALESCE(r.value, 0) as value,
      m.period_label
    FROM months m
    LEFT JOIN monthly_revenue r ON DATE_TRUNC(r.month, MONTH) = m.period_start

    UNION ALL

    -- Lead trends
    SELECT
      'leads' as kpi_slug,
      CAST(m.period_start AS STRING) as period_start,
      CAST(m.period_end AS STRING) as period_end,
      COALESCE(l.value, 0) as value,
      m.period_label
    FROM months m
    LEFT JOIN monthly_leads l ON DATE_TRUNC(l.month, MONTH) = m.period_start

    UNION ALL

    -- Win rate trends
    SELECT
      'win_rate' as kpi_slug,
      CAST(m.period_start AS STRING) as period_start,
      CAST(m.period_end AS STRING) as period_end,
      COALESCE(w.value, 0) as value,
      m.period_label
    FROM months m
    LEFT JOIN monthly_win_rate w ON DATE_TRUNC(w.month, MONTH) = m.period_start

    UNION ALL

    -- Close rate trends
    SELECT
      'close_rate' as kpi_slug,
      CAST(m.period_start AS STRING) as period_start,
      CAST(m.period_end AS STRING) as period_end,
      COALESCE(c.value, 0) as value,
      m.period_label
    FROM months m
    LEFT JOIN monthly_close_rate c ON DATE_TRUNC(c.month, MONTH) = m.period_start

    ORDER BY kpi_slug, period_start
  `

  const result = await bigQueryClient.query<KPIMonthlyTrend>(sql)
  return result.rows
}
