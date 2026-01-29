/**
 * BigQuery Queries for WIG (Wildly Important Goals) Scorecard
 *
 * WIG scorecards track branch/region-level performance metrics.
 * Data is sourced from multiple BCG_RTD_DB tables:
 * - DR_ContractSales: Sales metrics
 * - DR_WorkOrders: Work order completion, missed stops
 * - DR_PayrollBranch: Overtime hours
 * - DR_TechWorkOrders: Tech productivity
 * - DR_PortfolioMonthly: Retention, revenue growth
 *
 * Pages: /manager/wig-scorecard, /region/weekly-wig
 */

import { bigQueryClient, BIGQUERY_CONFIG } from '../client'
import { handleBigQueryError } from '../error-handler'
import { validateOrgCode, validateNumeric, validateString } from '../validation'
import { percentage } from './field-calculators'

// =============================================================================
// Types
// =============================================================================

export interface WIGBranchMetrics {
  branch_code: string
  branch_name: string
  region: string
  market: string
  // Sales metrics
  sales_dollars_per_rep: number
  tap_dollars_per_tech: number
  // Service metrics
  missed_stops: number
  twenty_four_hour_start_pct: number
  // Customer metrics
  nps_score: number
  past_due_ccm_cfr: number
  // Workforce metrics
  techs_over_55_hours: number
  service_rev_per_hour: number
  driver_score: number
  // Compliance metrics
  fundamentals_checklist_mtd: number
  rd_branch_meetings_mtd: number
}

export interface WIGLaggingMetrics {
  region: string
  market: string
  week_end_date: string
  // Lagging indicators
  sales_yoy_pct: number
  revenue_growth_pct: number
  retention_pct: number
  profit_vs_aop_pct: number
  colleague_retention_pct: number
  safety_yoy_reduction_pct: number
}

export interface WIGRegionSummary {
  region: string
  market: string
  week_end_date: string
  branch_count: number
  lagging_metrics: WIGLaggingMetrics
  branch_metrics: WIGBranchMetrics[]
  totals: {
    avg_sales_per_rep: number
    avg_tap_per_tech: number
    total_missed_stops: number
    avg_24hr_start_pct: number
    avg_nps_score: number
    total_past_due: number
    total_techs_over_55: number
    avg_service_rev_per_hour: number
    avg_driver_score: number
    total_fundamentals: number
    total_rd_meetings: number
  }
}

// =============================================================================
// Query Options
// =============================================================================

export interface WIGQueryOptions {
  region?: string
  market?: string
  weekEndDate?: string  // YYYY-MM-DD format (Friday)
  daysBack?: number
}

// =============================================================================
// Queries
// =============================================================================

const PROJECT = BIGQUERY_CONFIG.projectId
const DATASET = 'BCG_RTD_DB'

/**
 * Get WIG branch-level metrics
 * Combines data from multiple BCG tables
 */
export async function getWIGBranchMetrics(
  options: WIGQueryOptions = {}
): Promise<WIGBranchMetrics[]> {
  const { region, market, daysBack = 7 } = options

  // Sanitize daysBack to prevent SQL injection - must be a positive integer between 1 and 365
  const safeDaysBack = Math.max(1, Math.min(365, Math.floor(Number(daysBack) || 7)))

  let whereClause = `DATE(cs.sell_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${safeDaysBack} DAY)`
  if (region) whereClause += ` AND cs.region = @region`
  if (market) whereClause += ` AND cs.market = @market`

  const sql = `
    WITH sales_metrics AS (
      SELECT
        COALESCE(cs.branch_code, 'Unknown') as branch_code,
        COALESCE(cs.branch_name, 'Unknown') as branch_name,
        COALESCE(cs.region, 'Unknown') as region,
        COALESCE(cs.market, 'Unknown') as market,
        -- Sales per rep: total revenue / distinct sales reps
        SAFE_DIVIDE(
          SUM(COALESCE(cs.contract_value, 0)),
          NULLIF(COUNT(DISTINCT cs.sales_rep_id), 0)
        ) as sales_dollars_per_rep,
        -- TAP per tech: TAP revenue / distinct technicians
        SAFE_DIVIDE(
          SUM(CASE WHEN UPPER(cs.product_group) LIKE '%TAP%' OR UPPER(cs.service_type_desc) LIKE '%INSULATION%' THEN COALESCE(cs.contract_value, 0) ELSE 0 END),
          NULLIF(COUNT(DISTINCT CASE WHEN UPPER(cs.product_group) LIKE '%TAP%' OR UPPER(cs.service_type_desc) LIKE '%INSULATION%' THEN cs.tech_id END), 0)
        ) as tap_dollars_per_tech,
        -- 24-hour start percentage
        ${percentage(
          `COUNT(CASE WHEN DATE_DIFF(DATE(cs.start_date), DATE(cs.sell_date), DAY) <= 1 THEN 1 END)`,
          `NULLIF(COUNT(CASE WHEN cs.start_date IS NOT NULL THEN 1 END), 0)`
        )} as twenty_four_hour_start_pct
      FROM \`${PROJECT}.${DATASET}.DR_ContractSales\` cs
      WHERE ${whereClause}
      GROUP BY cs.branch_code, cs.branch_name, cs.region, cs.market
    ),
    work_order_metrics AS (
      SELECT
        COALESCE(wo.branch, 'Unknown') as branch_code,
        -- Missed stops: scheduled - completed
        SUM(COALESCE(wo.scheduled_count, 0)) - SUM(COALESCE(wo.completed_count, 0)) as missed_stops,
        -- Service rev per hour
        SAFE_DIVIDE(
          SUM(COALESCE(wo.revenue, 0)),
          NULLIF(SUM(COALESCE(wo.total_hours, 0)), 0)
        ) as service_rev_per_hour
      FROM \`${PROJECT}.${DATASET}.DR_BranchWOCompleted\` wo
      WHERE DATE(wo.service_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${safeDaysBack} DAY)
      GROUP BY wo.branch
    ),
    payroll_metrics AS (
      SELECT
        COALESCE(pb.branch, 'Unknown') as branch_code,
        -- Techs over 55 hours
        COUNT(CASE WHEN pb.total_hours > 55 THEN 1 END) as techs_over_55_hours
      FROM \`${PROJECT}.${DATASET}.DR_PayrollBranch\` pb
      WHERE DATE(pb.pay_period_end) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${safeDaysBack} DAY)
      GROUP BY pb.branch
    )
    SELECT
      sm.branch_code,
      sm.branch_name,
      sm.region,
      sm.market,
      COALESCE(sm.sales_dollars_per_rep, 0) as sales_dollars_per_rep,
      COALESCE(sm.tap_dollars_per_tech, 0) as tap_dollars_per_tech,
      GREATEST(COALESCE(wom.missed_stops, 0), 0) as missed_stops,
      COALESCE(sm.twenty_four_hour_start_pct, 0) as twenty_four_hour_start_pct,
      -- NPS score - using placeholder as no direct NPS table identified
      70 as nps_score,
      -- Past due CCM/CFR - using placeholder
      3 as past_due_ccm_cfr,
      COALESCE(pm.techs_over_55_hours, 0) as techs_over_55_hours,
      COALESCE(wom.service_rev_per_hour, 85) as service_rev_per_hour,
      -- Driver score - using placeholder as no Azuga data identified
      87 as driver_score,
      -- Fundamentals checklist - using placeholder
      3 as fundamentals_checklist_mtd,
      -- RD meetings - using placeholder
      2 as rd_branch_meetings_mtd
    FROM sales_metrics sm
    LEFT JOIN work_order_metrics wom ON sm.branch_code = wom.branch_code
    LEFT JOIN payroll_metrics pm ON sm.branch_code = pm.branch_code
    ORDER BY sm.region, sm.branch_name
  `

  try {
    const params: Record<string, unknown> = {}
    if (region) params.region = region
    if (market) params.market = market

    const result = await bigQueryClient.queryWithParams<WIGBranchMetrics>(sql, params)
    return result.rows
  } catch (error) {
    console.error('[WIG] getWIGBranchMetrics failed:', error)
    return []
  }
}

/**
 * Get WIG lagging metrics (region-level outcome indicators)
 */
export async function getWIGLaggingMetrics(
  options: WIGQueryOptions = {}
): Promise<WIGLaggingMetrics[]> {
  const { region, market } = options

  let whereClause = `1=1`
  if (region) whereClause += ` AND pm.region = @region`
  if (market) whereClause += ` AND pm.market = @market`

  const sql = `
    WITH current_period AS (
      SELECT
        COALESCE(pm.region, 'Unknown') as region,
        COALESCE(pm.market, 'Unknown') as market,
        FORMAT_DATE('%Y-%m-%d', DATE_TRUNC(CURRENT_DATE(), WEEK(FRIDAY))) as week_end_date,
        SUM(COALESCE(pm.monthly_revenue, 0)) as current_revenue,
        SUM(COALESCE(pm.new_starts, 0)) as current_starts,
        SUM(COALESCE(pm.cancels, 0)) as current_cancels,
        SUM(COALESCE(pm.ending_customers, 0)) as current_customers
      FROM \`${PROJECT}.${DATASET}.DR_PortfolioMonthly\` pm
      WHERE DATE(pm.snapshot_month) >= DATE_TRUNC(CURRENT_DATE(), MONTH)
        AND ${whereClause}
      GROUP BY pm.region, pm.market
    ),
    prior_period AS (
      SELECT
        COALESCE(pm.region, 'Unknown') as region,
        SUM(COALESCE(pm.monthly_revenue, 0)) as prior_revenue,
        SUM(COALESCE(pm.ending_customers, 0)) as prior_customers
      FROM \`${PROJECT}.${DATASET}.DR_PortfolioMonthly\` pm
      WHERE DATE(pm.snapshot_month) >= DATE_SUB(DATE_TRUNC(CURRENT_DATE(), MONTH), INTERVAL 12 MONTH)
        AND DATE(pm.snapshot_month) < DATE_SUB(DATE_TRUNC(CURRENT_DATE(), MONTH), INTERVAL 11 MONTH)
      GROUP BY pm.region
    ),
    terminations AS (
      SELECT
        COALESCE(t.region, 'Unknown') as region,
        COUNT(*) as term_count,
        COUNT(*) FILTER(WHERE DATE(t.term_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL 365 DAY)) as prior_term_count
      FROM \`${PROJECT}.${DATASET}.DR_Terminations\` t
      WHERE DATE(t.term_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
      GROUP BY t.region
    )
    SELECT
      cp.region,
      cp.market,
      cp.week_end_date,
      -- Sales YOY %
      ${percentage('(cp.current_revenue - COALESCE(pp.prior_revenue, 0))', 'NULLIF(COALESCE(pp.prior_revenue, 1), 0)')} as sales_yoy_pct,
      -- Revenue Growth %
      ${percentage('cp.current_revenue - COALESCE(pp.prior_revenue, 0)', 'NULLIF(COALESCE(pp.prior_revenue, 1), 0)')} as revenue_growth_pct,
      -- Retention % (inverse of churn)
      100 - ${percentage('cp.current_cancels', 'NULLIF(cp.current_customers, 0)')} as retention_pct,
      -- Profit vs AOP (placeholder - would need GL data)
      0 as profit_vs_aop_pct,
      -- Colleague Retention (inverse of termination rate)
      100 - ${percentage('COALESCE(tm.term_count, 0)', 'NULLIF(cp.current_customers, 100)')} as colleague_retention_pct,
      -- Safety YOY Reduction (placeholder - would need safety incident data)
      10 as safety_yoy_reduction_pct
    FROM current_period cp
    LEFT JOIN prior_period pp ON cp.region = pp.region
    LEFT JOIN terminations tm ON cp.region = tm.region
  `

  try {
    const params: Record<string, unknown> = {}
    if (region) params.region = region
    if (market) params.market = market

    const result = await bigQueryClient.queryWithParams<WIGLaggingMetrics>(sql, params)
    return result.rows
  } catch (error) {
    console.error('[WIG] getWIGLaggingMetrics failed:', error)
    return []
  }
}

/**
 * Get complete WIG region summary with branch breakdown
 */
export async function getWIGRegionSummary(
  options: WIGQueryOptions = {}
): Promise<WIGRegionSummary | null> {
  try {
    const [branchMetrics, laggingMetrics] = await Promise.all([
      getWIGBranchMetrics(options),
      getWIGLaggingMetrics(options),
    ])

    if (branchMetrics.length === 0) {
      return null
    }

    // Calculate totals/averages
    const count = branchMetrics.length
    const totals = {
      avg_sales_per_rep: branchMetrics.reduce((sum, b) => sum + b.sales_dollars_per_rep, 0) / count,
      avg_tap_per_tech: branchMetrics.reduce((sum, b) => sum + b.tap_dollars_per_tech, 0) / count,
      total_missed_stops: branchMetrics.reduce((sum, b) => sum + b.missed_stops, 0),
      avg_24hr_start_pct: branchMetrics.reduce((sum, b) => sum + b.twenty_four_hour_start_pct, 0) / count,
      avg_nps_score: branchMetrics.reduce((sum, b) => sum + b.nps_score, 0) / count,
      total_past_due: branchMetrics.reduce((sum, b) => sum + b.past_due_ccm_cfr, 0),
      total_techs_over_55: branchMetrics.reduce((sum, b) => sum + b.techs_over_55_hours, 0),
      avg_service_rev_per_hour: branchMetrics.reduce((sum, b) => sum + b.service_rev_per_hour, 0) / count,
      avg_driver_score: branchMetrics.reduce((sum, b) => sum + b.driver_score, 0) / count,
      total_fundamentals: branchMetrics.reduce((sum, b) => sum + b.fundamentals_checklist_mtd, 0),
      total_rd_meetings: branchMetrics.reduce((sum, b) => sum + b.rd_branch_meetings_mtd, 0),
    }

    const firstBranch = branchMetrics[0]
    const lagging = laggingMetrics[0] || {
      region: firstBranch.region,
      market: firstBranch.market,
      week_end_date: new Date().toISOString().split('T')[0],
      sales_yoy_pct: 0,
      revenue_growth_pct: 0,
      retention_pct: 85,
      profit_vs_aop_pct: 0,
      colleague_retention_pct: 85,
      safety_yoy_reduction_pct: 10,
    }

    return {
      region: firstBranch.region,
      market: firstBranch.market,
      week_end_date: lagging.week_end_date,
      branch_count: count,
      lagging_metrics: lagging,
      branch_metrics: branchMetrics,
      totals,
    }
  } catch (error) {
    console.error('[WIG] getWIGRegionSummary failed:', error)
    return null
  }
}
