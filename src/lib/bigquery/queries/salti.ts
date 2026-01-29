/**
 * BigQuery Queries for SALTI Module
 *
 * SALTI = Sales Activity Lead Tracking Intelligence
 * Tables: S0_TMX.tmx_lead (verified working dataset)
 * Pages: /salti, /salti/daily-check-in, /salti/productivity, /salti/proposal-pipeline,
 *        /salti/weekend-blitz, /salti/yoy-trends, /salti/funnel-fallout, /salti/sales-ladders
 *
 * VERIFIED COLUMNS from S0_TMX.tmx_lead:
 * - received_date, assigned_date, scheduled_date, inspected_date
 * - proposed_date, sold_date, cancel_date, uncancel_date
 * - curr_assigned_employee_sid, assigned_bunit_sid, originating_bunit_sid
 * - tmx_lead_sid, tmx_lead_prospect_sid, tmx_lead_attribute_sid
 */

import { bigQueryClient, BIGQUERY_CONFIG } from '../client'
import { handleBigQueryError } from '../error-handler'
import { validateOrgCode, validateNumeric, validateString } from '../validation'
import { buildDateFilter, percentage } from './field-calculators'

// =============================================================================
// Types
// =============================================================================

export interface SALTIOverview {
  employee_sid: string
  employee_name: string
  mql_count: number
  sql_count: number
  scheduled_count: number
  inspected_count: number
  proposed_count: number
  sold_count: number
  schedule_rate: number
  fulfillment_rate: number
  offer_rate: number
  win_rate: number
  close_rate: number
}

export interface SALTIDailyCheckIn {
  activity_date: string
  employee_sid: string
  employee_name: string
  scheduled: number
  inspected: number
  proposed: number
  sold: number
  schedule_rate: number
  fulfillment_rate: number
  offer_rate: number
  win_rate: number
}

export interface SALTIProductivity {
  employee_sid: string
  employee_name: string
  total_inspections: number
  total_proposals: number
  total_sales: number
  work_days: number
  inspections_per_day: number
  proposals_per_day: number
  sales_per_day: number
  productivity_score: number
}

export interface SALTIProposalPipeline {
  proposal_id: string
  customer_name: string
  employee_name: string
  proposal_date: string
  proposal_amount: number
  days_pending: number
  status: string
}

export interface SALTIWeekendBlitz {
  blitz_date: string
  employee_name: string
  appointments_scheduled: number
  appointments_completed: number
  proposals_generated: number
  sales_closed: number
  completion_rate: number
}

export interface SALTIYoYTrends {
  period: string
  current_year_sales: number
  prior_year_sales: number
  yoy_change: number
  current_year_count: number
  prior_year_count: number
}

export interface SALTIFunnelFallout {
  stage: string
  entered_count: number
  exited_count: number
  fallout_count: number
  fallout_rate: number
  top_fallout_reason: string
}

export interface SALTISalesLadders {
  employee_sid: string
  employee_name: string
  current_rank: number
  prior_rank: number
  rank_change: number
  total_sales: number
  sales_vs_target: number
  progression: string
}

// =============================================================================
// Query Options
// =============================================================================

export interface SALTIQueryOptions {
  daysBack?: number
  market?: string
  region?: string
  branch?: string
  employeeSid?: string
  limit?: number
}

// =============================================================================
// Queries - Using actual BigQuery column names
// =============================================================================

const PROJECT = BIGQUERY_CONFIG.projectId

/**
 * Build geographic filter conditions for SALTI queries
 * Joins with branch hierarchy when market or region filters are used
 */
function buildGeoFilterConditions(options: SALTIQueryOptions): { join: string; where: string; params: Record<string, unknown> } {
  const { market, region, branch } = options
  const params: Record<string, unknown> = {}
  let join = ''
  const whereConditions: string[] = []

  // If market or region is specified, we need to join with branch hierarchy
  if (market || region) {
    join = `LEFT JOIN \`${PROJECT}.S2.VwUnf_Branch\` b ON CAST(l.assigned_bunit_sid AS STRING) = b.RTX_Branch_Codes`

    if (market) {
      whereConditions.push('b.RTX_Market_Code = @market')
      params.market = market
    }
    if (region) {
      whereConditions.push('b.RTX_Region_Code = @region')
      params.region = region
    }
  }

  // Branch can be filtered directly on the lead table
  if (branch) {
    whereConditions.push('l.assigned_bunit_sid = @branch')
    params.branch = branch
  }

  return {
    join,
    where: whereConditions.length > 0 ? 'AND ' + whereConditions.join(' AND ') : '',
    params,
  }
}

/**
 * Get SALTI overview with lead funnel metrics by employee
 * Uses actual tmx_lead columns: received_date, scheduled_date, inspected_date, proposed_date, sold_date
 */
export async function getSALTIOverview(
  options: SALTIQueryOptions = {}
): Promise<SALTIOverview[]> {
  const { daysBack = 30, limit = 100 } = options
  const geoFilter = buildGeoFilterConditions(options)

  const sql = `
    SELECT
      COALESCE(CAST(l.curr_assigned_employee_sid AS STRING), 'Unknown') as employee_sid,
      COALESCE(
        TRIM(CONCAT(COALESCE(e.First_Name, ''), ' ', COALESCE(e.Last_Name, ''))),
        CAST(l.curr_assigned_employee_sid AS STRING)
      ) as employee_name,
      COUNT(*) as mql_count,
      COUNT(CASE WHEN l.scheduled_date IS NOT NULL THEN 1 END) as sql_count,
      COUNT(CASE WHEN l.scheduled_date IS NOT NULL THEN 1 END) as scheduled_count,
      COUNT(CASE WHEN l.inspected_date IS NOT NULL THEN 1 END) as inspected_count,
      COUNT(CASE WHEN l.proposed_date IS NOT NULL THEN 1 END) as proposed_count,
      COUNT(CASE WHEN l.sold_date IS NOT NULL THEN 1 END) as sold_count,
      ${percentage('COUNT(CASE WHEN l.scheduled_date IS NOT NULL THEN 1 END)', 'COUNT(*)')} as schedule_rate,
      ${percentage('COUNT(CASE WHEN l.inspected_date IS NOT NULL THEN 1 END)', 'COUNT(CASE WHEN l.scheduled_date IS NOT NULL THEN 1 END)')} as fulfillment_rate,
      ${percentage('COUNT(CASE WHEN l.proposed_date IS NOT NULL THEN 1 END)', 'COUNT(CASE WHEN l.inspected_date IS NOT NULL THEN 1 END)')} as offer_rate,
      ${percentage('COUNT(CASE WHEN l.sold_date IS NOT NULL THEN 1 END)', 'COUNT(CASE WHEN l.proposed_date IS NOT NULL THEN 1 END)')} as win_rate,
      ${percentage('COUNT(CASE WHEN l.sold_date IS NOT NULL THEN 1 END)', 'COUNT(*)')} as close_rate
    FROM \`${PROJECT}.S0_TMX.tmx_lead\` l
    ${geoFilter.join}
    LEFT JOIN \`${PROJECT}.S0_TMX.Employees_Main\` e
      ON CAST(l.curr_assigned_employee_sid AS STRING) = CAST(e.Employee_Number AS STRING)
    WHERE ${buildDateFilter('l.received_date', daysBack)}
      ${geoFilter.where}
    GROUP BY l.curr_assigned_employee_sid, e.First_Name, e.Last_Name
    ORDER BY sold_count DESC
    LIMIT ${limit}
  `

  const result = await bigQueryClient.queryWithParams<SALTIOverview>(sql, geoFilter.params)
  return result.rows
}

/**
 * Get SALTI daily check-in metrics
 */
export async function getSALTIDailyCheckIn(
  options: SALTIQueryOptions = {}
): Promise<SALTIDailyCheckIn[]> {
  const { daysBack = 7, employeeSid, limit = 500 } = options
  const geoFilter = buildGeoFilterConditions(options)

  // Merge employee filter with geo filter params
  const params = { ...geoFilter.params }
  if (employeeSid) params.employeeSid = employeeSid

  const sql = `
    SELECT
      FORMAT_DATE('%Y-%m-%d', DATE(l.received_date)) as activity_date,
      COALESCE(CAST(l.curr_assigned_employee_sid AS STRING), 'Unknown') as employee_sid,
      COALESCE(
        TRIM(CONCAT(COALESCE(e.First_Name, ''), ' ', COALESCE(e.Last_Name, ''))),
        CAST(l.curr_assigned_employee_sid AS STRING)
      ) as employee_name,
      COUNT(CASE WHEN l.scheduled_date IS NOT NULL THEN 1 END) as scheduled,
      COUNT(CASE WHEN l.inspected_date IS NOT NULL THEN 1 END) as inspected,
      COUNT(CASE WHEN l.proposed_date IS NOT NULL THEN 1 END) as proposed,
      COUNT(CASE WHEN l.sold_date IS NOT NULL THEN 1 END) as sold,
      ${percentage('COUNT(CASE WHEN l.scheduled_date IS NOT NULL THEN 1 END)', 'COUNT(*)')} as schedule_rate,
      ${percentage('COUNT(CASE WHEN l.inspected_date IS NOT NULL THEN 1 END)', 'COUNT(CASE WHEN l.scheduled_date IS NOT NULL THEN 1 END)')} as fulfillment_rate,
      ${percentage('COUNT(CASE WHEN l.proposed_date IS NOT NULL THEN 1 END)', 'COUNT(CASE WHEN l.inspected_date IS NOT NULL THEN 1 END)')} as offer_rate,
      ${percentage('COUNT(CASE WHEN l.sold_date IS NOT NULL THEN 1 END)', 'COUNT(CASE WHEN l.proposed_date IS NOT NULL THEN 1 END)')} as win_rate
    FROM \`${PROJECT}.S0_TMX.tmx_lead\` l
    ${geoFilter.join}
    LEFT JOIN \`${PROJECT}.S0_TMX.Employees_Main\` e
      ON CAST(l.curr_assigned_employee_sid AS STRING) = CAST(e.Employee_Number AS STRING)
    WHERE ${buildDateFilter('l.received_date', daysBack)}
      ${geoFilter.where}
      ${employeeSid ? 'AND l.curr_assigned_employee_sid = @employeeSid' : ''}
    GROUP BY FORMAT_DATE('%Y-%m-%d', DATE(l.received_date)), l.curr_assigned_employee_sid, e.First_Name, e.Last_Name
    ORDER BY activity_date DESC, sold DESC
    LIMIT ${limit}
  `

  const result = await bigQueryClient.queryWithParams<SALTIDailyCheckIn>(sql, params)
  return result.rows
}

/**
 * Get SALTI productivity metrics by employee
 */
export async function getSALTIProductivity(
  options: SALTIQueryOptions = {}
): Promise<SALTIProductivity[]> {
  const { daysBack = 30, limit = 100 } = options
  const geoFilter = buildGeoFilterConditions(options)

  const sql = `
    WITH daily_activity AS (
      SELECT
        l.curr_assigned_employee_sid,
        DATE(l.received_date) as work_date,
        COUNT(CASE WHEN l.inspected_date IS NOT NULL THEN 1 END) as inspections,
        COUNT(CASE WHEN l.proposed_date IS NOT NULL THEN 1 END) as proposals,
        COUNT(CASE WHEN l.sold_date IS NOT NULL THEN 1 END) as sales
      FROM \`${PROJECT}.S0_TMX.tmx_lead\` l
      ${geoFilter.join}
      WHERE ${buildDateFilter('l.received_date', daysBack)}
        ${geoFilter.where}
      GROUP BY l.curr_assigned_employee_sid, DATE(l.received_date)
    )
    SELECT
      COALESCE(CAST(da.curr_assigned_employee_sid AS STRING), 'Unknown') as employee_sid,
      COALESCE(
        TRIM(CONCAT(COALESCE(e.First_Name, ''), ' ', COALESCE(e.Last_Name, ''))),
        CAST(da.curr_assigned_employee_sid AS STRING)
      ) as employee_name,
      SUM(da.inspections) as total_inspections,
      SUM(da.proposals) as total_proposals,
      SUM(da.sales) as total_sales,
      COUNT(DISTINCT da.work_date) as work_days,
      ROUND(SUM(da.inspections) / NULLIF(COUNT(DISTINCT da.work_date), 0), 2) as inspections_per_day,
      ROUND(SUM(da.proposals) / NULLIF(COUNT(DISTINCT da.work_date), 0), 2) as proposals_per_day,
      ROUND(SUM(da.sales) / NULLIF(COUNT(DISTINCT da.work_date), 0), 2) as sales_per_day,
      ROUND((SUM(da.inspections) + SUM(da.proposals) * 2 + SUM(da.sales) * 3) / NULLIF(COUNT(DISTINCT da.work_date), 0), 2) as productivity_score
    FROM daily_activity da
    LEFT JOIN \`${PROJECT}.S0_TMX.Employees_Main\` e
      ON CAST(da.curr_assigned_employee_sid AS STRING) = CAST(e.Employee_Number AS STRING)
    GROUP BY da.curr_assigned_employee_sid, e.First_Name, e.Last_Name
    ORDER BY productivity_score DESC
    LIMIT ${limit}
  `

  const result = await bigQueryClient.queryWithParams<SALTIProductivity>(sql, geoFilter.params)
  return result.rows
}

/**
 * Get SALTI proposal pipeline
 */
export async function getSALTIProposalPipeline(
  options: SALTIQueryOptions = {}
): Promise<SALTIProposalPipeline[]> {
  const { daysBack = 90, employeeSid, limit = 200 } = options
  const geoFilter = buildGeoFilterConditions(options)

  // Merge employee filter with geo filter params
  const params = { ...geoFilter.params }
  if (employeeSid) params.employeeSid = employeeSid

  const sql = `
    SELECT
      CAST(l.tmx_lead_sid AS STRING) as proposal_id,
      'Customer' as customer_name,
      COALESCE(
        TRIM(CONCAT(COALESCE(e.First_Name, ''), ' ', COALESCE(e.Last_Name, ''))),
        CAST(l.curr_assigned_employee_sid AS STRING)
      ) as employee_name,
      FORMAT_DATE('%Y-%m-%d', DATE(l.proposed_date)) as proposal_date,
      0 as proposal_amount,
      DATE_DIFF(CURRENT_DATE(), DATE(l.proposed_date), DAY) as days_pending,
      CASE
        WHEN l.sold_date IS NOT NULL THEN 'Won'
        WHEN l.cancel_date IS NOT NULL THEN 'Lost'
        ELSE 'Open'
      END as status
    FROM \`${PROJECT}.S0_TMX.tmx_lead\` l
    ${geoFilter.join}
    LEFT JOIN \`${PROJECT}.S0_TMX.Employees_Main\` e
      ON CAST(l.curr_assigned_employee_sid AS STRING) = CAST(e.Employee_Number AS STRING)
    WHERE l.proposed_date IS NOT NULL
      AND ${buildDateFilter('l.proposed_date', daysBack)}
      ${geoFilter.where}
      ${employeeSid ? 'AND l.curr_assigned_employee_sid = @employeeSid' : ''}
    ORDER BY proposal_date DESC
    LIMIT ${limit}
  `

  const result = await bigQueryClient.queryWithParams<SALTIProposalPipeline>(sql, params)
  return result.rows
}

/**
 * Get SALTI weekend blitz results
 */
export async function getSALTIWeekendBlitz(
  options: SALTIQueryOptions = {}
): Promise<SALTIWeekendBlitz[]> {
  const { daysBack = 90, limit = 100 } = options
  const geoFilter = buildGeoFilterConditions(options)

  // Filter to weekends only (Saturday = 7, Sunday = 1)
  const sql = `
    SELECT
      FORMAT_DATE('%Y-%m-%d', DATE(l.received_date)) as blitz_date,
      COALESCE(
        TRIM(CONCAT(COALESCE(e.First_Name, ''), ' ', COALESCE(e.Last_Name, ''))),
        CAST(l.curr_assigned_employee_sid AS STRING)
      ) as employee_name,
      COUNT(*) as appointments_scheduled,
      COUNT(CASE WHEN l.inspected_date IS NOT NULL THEN 1 END) as appointments_completed,
      COUNT(CASE WHEN l.proposed_date IS NOT NULL THEN 1 END) as proposals_generated,
      COUNT(CASE WHEN l.sold_date IS NOT NULL THEN 1 END) as sales_closed,
      ${percentage('COUNT(CASE WHEN l.inspected_date IS NOT NULL THEN 1 END)', 'COUNT(*)')} as completion_rate
    FROM \`${PROJECT}.S0_TMX.tmx_lead\` l
    ${geoFilter.join}
    LEFT JOIN \`${PROJECT}.S0_TMX.Employees_Main\` e
      ON CAST(l.curr_assigned_employee_sid AS STRING) = CAST(e.Employee_Number AS STRING)
    WHERE ${buildDateFilter('l.received_date', daysBack)}
      AND EXTRACT(DAYOFWEEK FROM l.received_date) IN (1, 7)
      ${geoFilter.where}
    GROUP BY FORMAT_DATE('%Y-%m-%d', DATE(l.received_date)), l.curr_assigned_employee_sid, e.First_Name, e.Last_Name
    HAVING appointments_scheduled >= 5
    ORDER BY blitz_date DESC, sales_closed DESC
    LIMIT ${limit}
  `

  const result = await bigQueryClient.queryWithParams<SALTIWeekendBlitz>(sql, geoFilter.params)
  return result.rows
}

/**
 * Get SALTI year-over-year trends
 */
export async function getSALTIYoYTrends(
  options: SALTIQueryOptions = {}
): Promise<SALTIYoYTrends[]> {
  const { daysBack = 365, limit = 12 } = options
  const geoFilter = buildGeoFilterConditions(options)

  const sql = `
    WITH current_year AS (
      SELECT
        FORMAT_DATE('%Y-%m', DATE(l.sold_date)) as period,
        COUNT(*) as sales_count,
        0 as sales_amount
      FROM \`${PROJECT}.S0_TMX.tmx_lead\` l
      ${geoFilter.join}
      WHERE l.sold_date IS NOT NULL
        AND DATE(l.sold_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${daysBack} DAY)
        AND DATE(l.sold_date) < CURRENT_DATE()
        ${geoFilter.where}
      GROUP BY FORMAT_DATE('%Y-%m', DATE(l.sold_date))
    ),
    prior_year AS (
      SELECT
        FORMAT_DATE('%Y-%m', DATE_ADD(DATE(l.sold_date), INTERVAL 1 YEAR)) as period,
        COUNT(*) as sales_count,
        0 as sales_amount
      FROM \`${PROJECT}.S0_TMX.tmx_lead\` l
      ${geoFilter.join}
      WHERE l.sold_date IS NOT NULL
        AND DATE(l.sold_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${daysBack + 365} DAY)
        AND DATE(l.sold_date) < DATE_SUB(CURRENT_DATE(), INTERVAL 365 DAY)
        ${geoFilter.where}
      GROUP BY FORMAT_DATE('%Y-%m', DATE_ADD(DATE(l.sold_date), INTERVAL 1 YEAR))
    )
    SELECT
      cy.period,
      ROUND(cy.sales_amount, 2) as current_year_sales,
      ROUND(COALESCE(py.sales_amount, 0), 2) as prior_year_sales,
      ${percentage('cy.sales_count - COALESCE(py.sales_count, 0)', 'NULLIF(py.sales_count, 0)')} as yoy_change,
      cy.sales_count as current_year_count,
      COALESCE(py.sales_count, 0) as prior_year_count
    FROM current_year cy
    LEFT JOIN prior_year py ON cy.period = py.period
    ORDER BY cy.period DESC
    LIMIT ${limit}
  `

  const result = await bigQueryClient.queryWithParams<SALTIYoYTrends>(sql, geoFilter.params)
  return result.rows
}

/**
 * Get SALTI funnel fallout analysis
 */
export async function getSALTIFunnelFallout(
  options: SALTIQueryOptions = {}
): Promise<SALTIFunnelFallout[]> {
  const { daysBack = 30 } = options
  const geoFilter = buildGeoFilterConditions(options)

  const sql = `
    WITH stage_counts AS (
      SELECT
        'MQL' as stage,
        1 as stage_order,
        COUNT(*) as entered_count,
        COUNT(CASE WHEN l.scheduled_date IS NOT NULL OR l.cancel_date IS NOT NULL THEN 1 END) as exited_count,
        'Not Scheduled' as top_fallout_reason
      FROM \`${PROJECT}.S0_TMX.tmx_lead\` l
      ${geoFilter.join}
      WHERE ${buildDateFilter('l.received_date', daysBack)}
        ${geoFilter.where}

      UNION ALL

      SELECT
        'Scheduled' as stage,
        2 as stage_order,
        COUNT(*) as entered_count,
        COUNT(CASE WHEN l.inspected_date IS NOT NULL OR l.cancel_date IS NOT NULL THEN 1 END) as exited_count,
        'No Show' as top_fallout_reason
      FROM \`${PROJECT}.S0_TMX.tmx_lead\` l
      ${geoFilter.join}
      WHERE l.scheduled_date IS NOT NULL
        AND ${buildDateFilter('l.received_date', daysBack)}
        ${geoFilter.where}

      UNION ALL

      SELECT
        'Inspected' as stage,
        3 as stage_order,
        COUNT(*) as entered_count,
        COUNT(CASE WHEN l.proposed_date IS NOT NULL OR l.cancel_date IS NOT NULL THEN 1 END) as exited_count,
        'No Proposal' as top_fallout_reason
      FROM \`${PROJECT}.S0_TMX.tmx_lead\` l
      ${geoFilter.join}
      WHERE l.inspected_date IS NOT NULL
        AND ${buildDateFilter('l.received_date', daysBack)}
        ${geoFilter.where}

      UNION ALL

      SELECT
        'Proposed' as stage,
        4 as stage_order,
        COUNT(*) as entered_count,
        COUNT(CASE WHEN l.sold_date IS NOT NULL OR l.cancel_date IS NOT NULL THEN 1 END) as exited_count,
        'Price Objection' as top_fallout_reason
      FROM \`${PROJECT}.S0_TMX.tmx_lead\` l
      ${geoFilter.join}
      WHERE l.proposed_date IS NOT NULL
        AND ${buildDateFilter('l.received_date', daysBack)}
        ${geoFilter.where}
    )
    SELECT
      stage,
      entered_count,
      exited_count,
      entered_count - exited_count as fallout_count,
      ${percentage('entered_count - exited_count', 'entered_count')} as fallout_rate,
      top_fallout_reason
    FROM stage_counts
    ORDER BY stage_order
  `

  const result = await bigQueryClient.queryWithParams<SALTIFunnelFallout>(sql, geoFilter.params)
  return result.rows
}

/**
 * Get SALTI sales ladders (rankings with progression)
 */
export async function getSALTISalesLadders(
  options: SALTIQueryOptions = {}
): Promise<SALTISalesLadders[]> {
  const { daysBack = 30, limit = 50 } = options
  const geoFilter = buildGeoFilterConditions(options)

  const sql = `
    WITH current_period AS (
      SELECT
        l.curr_assigned_employee_sid,
        COUNT(CASE WHEN l.sold_date IS NOT NULL THEN 1 END) as total_sales,
        ROW_NUMBER() OVER (ORDER BY COUNT(CASE WHEN l.sold_date IS NOT NULL THEN 1 END) DESC) as current_rank
      FROM \`${PROJECT}.S0_TMX.tmx_lead\` l
      ${geoFilter.join}
      WHERE ${buildDateFilter('l.received_date', daysBack)}
        ${geoFilter.where}
      GROUP BY l.curr_assigned_employee_sid
    ),
    prior_period AS (
      SELECT
        l.curr_assigned_employee_sid,
        ROW_NUMBER() OVER (ORDER BY COUNT(CASE WHEN l.sold_date IS NOT NULL THEN 1 END) DESC) as prior_rank
      FROM \`${PROJECT}.S0_TMX.tmx_lead\` l
      ${geoFilter.join}
      WHERE DATE(l.received_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${daysBack * 2} DAY)
        AND DATE(l.received_date) < DATE_SUB(CURRENT_DATE(), INTERVAL ${daysBack} DAY)
        ${geoFilter.where}
      GROUP BY l.curr_assigned_employee_sid
    )
    SELECT
      COALESCE(CAST(cp.curr_assigned_employee_sid AS STRING), 'Unknown') as employee_sid,
      COALESCE(
        TRIM(CONCAT(COALESCE(e.First_Name, ''), ' ', COALESCE(e.Last_Name, ''))),
        CAST(cp.curr_assigned_employee_sid AS STRING)
      ) as employee_name,
      cp.current_rank,
      COALESCE(pp.prior_rank, cp.current_rank + 10) as prior_rank,
      COALESCE(pp.prior_rank, cp.current_rank + 10) - cp.current_rank as rank_change,
      CAST(cp.total_sales AS FLOAT64) as total_sales,
      0 as sales_vs_target,
      CASE
        WHEN COALESCE(pp.prior_rank, cp.current_rank + 10) - cp.current_rank > 0 THEN 'Rising'
        WHEN COALESCE(pp.prior_rank, cp.current_rank + 10) - cp.current_rank < 0 THEN 'Falling'
        ELSE 'Stable'
      END as progression
    FROM current_period cp
    LEFT JOIN prior_period pp ON cp.curr_assigned_employee_sid = pp.curr_assigned_employee_sid
    LEFT JOIN \`${PROJECT}.S0_TMX.Employees_Main\` e
      ON CAST(cp.curr_assigned_employee_sid AS STRING) = CAST(e.Employee_Number AS STRING)
    ORDER BY cp.current_rank
    LIMIT ${limit}
  `

  const result = await bigQueryClient.queryWithParams<SALTISalesLadders>(sql, geoFilter.params)
  return result.rows
}
