/**
 * BigQuery Queries for Workforce Module
 *
 * Data Source: TMX (via ETL pipeline from PestPac and Workday)
 *
 * Tables:
 * - S0_TMX.Inspections (3.3M rows) - inspection/service data
 *   KEY FIELDS: EmployeeNumber, DateInspected, Status, BUCode
 *   SOURCE: PestPac -> TMX ETL -> BigQuery
 *
 * - S0_TMX.Employees_Main (29K rows) - employee directory with names
 *   KEY FIELDS: Employee_Number, First_Name, Last_Name, Branch, Region_Description, Job_Title
 *   SOURCE: Workday HRIS -> TMX ETL -> BigQuery
 *
 * - S0_TMX.tmx_employee (1.2M rows) - employee history with tenure
 *   KEY FIELDS: hire_date, termination_date, employee_status
 *   SOURCE: Workday HRIS -> TMX ETL -> BigQuery
 *
 * Pages: /workforce/tech-productivity
 */

import { bigQueryClient, BIGQUERY_CONFIG } from '../client'
import { handleBigQueryError } from '../error-handler'
import { validateOrgCode, validateNumeric, validateString } from '../validation'
import { buildDateFilter, percentage } from './field-calculators'

// =============================================================================
// Types
// =============================================================================

export interface TechProductivity {
  technician_id: string
  technician_name: string
  first_name: string
  last_name: string
  branch: string
  branch_name: string
  region: string
  job_title: string
  work_days: number
  stops_completed: number
  stops_per_day: number
  total_hours: number
  hours_per_day: number
  revenue_generated: number
  revenue_per_stop: number
  callbacks: number
  callback_rate: number
  efficiency_score: number
  rank: number
}

export interface TechProductivitySummary {
  metric: string
  current_value: number
  prior_value: number
  target_value: number
  change_pct: number
  status: string
}

export interface TechnicianRecord {
  technician_id: string
  employee_id: string
  first_name: string
  last_name: string
  full_name: string
  email: string
  branch_code: string
  branch_name: string
  region: string
  market: string
  job_title: string
  job_code: string
  supervisor_name: string
  division: string
  tenure_months: number
  skill_level: string
  status: string
}

// =============================================================================
// Query Options
// =============================================================================

export interface WorkforceQueryOptions {
  daysBack?: number
  technicianId?: string
  branch?: string
  region?: string
  market?: string
  limit?: number
}

// =============================================================================
// Queries
// =============================================================================

const PROJECT = BIGQUERY_CONFIG.projectId

/**
 * Get technician productivity metrics with REAL employee names
 * JOINs Inspections with Employees_Main to get actual First_Name, Last_Name
 */
export async function getTechProductivity(
  options: WorkforceQueryOptions = {}
): Promise<TechProductivity[]> {
  const { daysBack = 30, technicianId, branch, region, limit = 100 } = options

  const sql = `
    WITH tech_metrics AS (
      SELECT
        CAST(i.EmployeeNumber AS STRING) as technician_id,
        COALESCE(e.First_Name, '') as first_name,
        COALESCE(e.Last_Name, '') as last_name,
        TRIM(CONCAT(COALESCE(e.First_Name, ''), ' ', COALESCE(e.Last_Name, ''))) as technician_name,
        COALESCE(e.Branch, i.BUCode, 'Unknown') as branch,
        COALESCE(e.Business_Unit_Description, i.BUCode, 'Unknown') as branch_name,
        COALESCE(e.Region_Description, i.BillingState, 'Unknown') as region,
        COALESCE(e.Job_Title, 'Technician') as job_title,
        COUNT(DISTINCT DATE(i.DateInspected)) as work_days,
        COUNT(CASE WHEN UPPER(i.Status) IN ('COMPLETE', 'COMPLETED', 'SOLD', 'CLOSED') THEN 1 END) as stops_completed,
        0 as total_hours,
        0 as revenue_generated,
        0 as callbacks,
        COUNT(*) as total_stops
      FROM \`${PROJECT}.S0_TMX.Inspections\` i
      LEFT JOIN \`${PROJECT}.S0_TMX.Employees_Main\` e
        ON CAST(i.EmployeeNumber AS STRING) = CAST(e.Employee_Number AS STRING)
      WHERE ${buildDateFilter('i.DateInspected', daysBack)}
        ${technicianId ? 'AND CAST(i.EmployeeNumber AS STRING) = @technicianId' : ''}
        ${branch ? 'AND (e.Branch = @branch OR i.BUCode = @branch)' : ''}
        ${region ? 'AND (e.Region_Description = @region OR i.BillingState = @region)' : ''}
      GROUP BY
        i.EmployeeNumber,
        e.First_Name,
        e.Last_Name,
        e.Branch,
        e.Business_Unit_Description,
        e.Region_Description,
        e.Job_Title,
        i.BUCode,
        i.BillingState
    )
    SELECT
      technician_id,
      technician_name,
      first_name,
      last_name,
      branch,
      branch_name,
      region,
      job_title,
      work_days,
      stops_completed,
      ROUND(stops_completed / NULLIF(work_days, 0), 2) as stops_per_day,
      ROUND(total_hours, 2) as total_hours,
      ROUND(total_hours / NULLIF(work_days, 0), 2) as hours_per_day,
      ROUND(revenue_generated, 2) as revenue_generated,
      ROUND(revenue_generated / NULLIF(stops_completed, 0), 2) as revenue_per_stop,
      callbacks,
      ${percentage('callbacks', 'NULLIF(total_stops, 0)')} as callback_rate,
      -- Efficiency score based on completion rate
      ROUND(
        (stops_completed / NULLIF(work_days, 0)) *
        (stops_completed / NULLIF(total_stops, 1)),
        2
      ) as efficiency_score,
      ROW_NUMBER() OVER (ORDER BY stops_completed DESC) as rank
    FROM tech_metrics
    WHERE stops_completed > 0
      AND technician_name != ''
      AND technician_name != ' '
    ORDER BY efficiency_score DESC
    LIMIT ${limit}
  `

  const params: Record<string, unknown> = {}
  if (technicianId) params.technicianId = technicianId
  if (branch) params.branch = branch
  if (region) params.region = region

  try {
    const result = await bigQueryClient.queryWithParams<TechProductivity>(sql, params)
    return result.rows
  } catch (error) {
    console.error('[Workforce] getTechProductivity failed:', error)
    return []
  }
}

/**
 * Get technician list with full employee details
 * Queries Employees_Main directly for technician records
 */
export async function getTechnicianList(
  options: WorkforceQueryOptions = {}
): Promise<TechnicianRecord[]> {
  const { branch, region, market, limit = 200 } = options

  const sql = `
    SELECT
      CAST(e.Employee_Number AS STRING) as technician_id,
      CAST(e.Employee_Number AS STRING) as employee_id,
      COALESCE(e.First_Name, '') as first_name,
      COALESCE(e.Last_Name, '') as last_name,
      TRIM(CONCAT(COALESCE(e.First_Name, ''), ' ', COALESCE(e.Last_Name, ''))) as full_name,
      COALESCE(LOWER(CONCAT(e.First_Name, '.', e.Last_Name, '@rentokil.com')), '') as email,
      COALESCE(e.Branch, '') as branch_code,
      COALESCE(e.Business_Unit_Description, e.Branch, '') as branch_name,
      COALESCE(e.Region_Description, '') as region,
      COALESCE(e.Division_Description, '') as market,
      COALESCE(e.Job_Title, '') as job_title,
      COALESCE(e.Job_Code, '') as job_code,
      -- Convert supervisor name from "LAST, FIRST" to "First Last"
      CASE
        WHEN e.Supervisor_Name LIKE '%,%' THEN
          CONCAT(
            TRIM(SPLIT(e.Supervisor_Name, ',')[SAFE_OFFSET(1)]),  -- First name
            ' ',
            TRIM(SPLIT(e.Supervisor_Name, ',')[SAFE_OFFSET(0)])   -- Last name
          )
        ELSE COALESCE(e.Supervisor_Name, '')
      END as supervisor_name,
      COALESCE(e.Division_Description, '') as division,
      0 as tenure_months,
      CASE
        WHEN e.Job_Title LIKE '%Lead%' OR e.Job_Title LIKE '%Senior%' THEN 'lead'
        WHEN e.Job_Title LIKE '%Sr%' THEN 'senior'
        WHEN e.Job_Title LIKE '%Jr%' OR e.Job_Title LIKE '%Junior%' THEN 'junior'
        ELSE 'standard'
      END as skill_level,
      'active' as status
    FROM \`${PROJECT}.S0_TMX.Employees_Main\` e
    WHERE (
      LOWER(e.Job_Title) LIKE '%tech%'
      OR LOWER(e.Job_Title) LIKE '%service%'
      OR LOWER(e.Job_Title) LIKE '%specialist%'
      OR LOWER(e.Job_Title) LIKE '%inspector%'
      OR LOWER(e.Job_Code) LIKE '%tech%'
    )
      ${branch ? 'AND e.Branch = @branch' : ''}
      ${region ? 'AND e.Region_Description = @region' : ''}
      ${market ? 'AND e.Division_Description = @market' : ''}
    ORDER BY e.Last_Name, e.First_Name
    LIMIT ${limit}
  `

  const params: Record<string, unknown> = {}
  if (branch) params.branch = branch
  if (region) params.region = region
  if (market) params.market = market

  try {
    const result = await bigQueryClient.queryWithParams<TechnicianRecord>(sql, params)
    return result.rows
  } catch (error) {
    console.error('[Workforce] getTechnicianList failed:', error)
    return []
  }
}

/**
 * Get workforce productivity summary metrics
 * Uses S0_TMX.Inspections for service activity data
 */
export async function getTechProductivitySummary(
  options: WorkforceQueryOptions = {}
): Promise<TechProductivitySummary[]> {
  const { daysBack = 30, region } = options

  const sql = `
    WITH current_period AS (
      SELECT
        AVG(stops_per_day) as avg_stops_per_day,
        AVG(completion_rate) as avg_completion_rate,
        0 as avg_revenue_per_stop,
        COUNT(DISTINCT employee_id) as active_techs
      FROM (
        SELECT
          i.EmployeeNumber as employee_id,
          COUNT(CASE WHEN UPPER(i.Status) IN ('COMPLETE', 'COMPLETED', 'SOLD', 'CLOSED') THEN 1 END) / NULLIF(COUNT(DISTINCT DATE(i.DateInspected)), 0) as stops_per_day,
          SAFE_DIVIDE(COUNT(CASE WHEN UPPER(i.Status) IN ('COMPLETE', 'COMPLETED', 'SOLD', 'CLOSED') THEN 1 END), COUNT(*)) * 100 as completion_rate
        FROM \`${PROJECT}.S0_TMX.Inspections\` i
        WHERE ${buildDateFilter('i.DateInspected', daysBack)}
          ${region ? 'AND i.BillingState = @region' : ''}
        GROUP BY i.EmployeeNumber
      )
    ),
    prior_period AS (
      SELECT
        AVG(stops_per_day) as avg_stops_per_day,
        AVG(completion_rate) as avg_completion_rate,
        0 as avg_revenue_per_stop,
        COUNT(DISTINCT employee_id) as active_techs
      FROM (
        SELECT
          i.EmployeeNumber as employee_id,
          COUNT(CASE WHEN UPPER(i.Status) IN ('COMPLETE', 'COMPLETED', 'SOLD', 'CLOSED') THEN 1 END) / NULLIF(COUNT(DISTINCT DATE(i.DateInspected)), 0) as stops_per_day,
          SAFE_DIVIDE(COUNT(CASE WHEN UPPER(i.Status) IN ('COMPLETE', 'COMPLETED', 'SOLD', 'CLOSED') THEN 1 END), COUNT(*)) * 100 as completion_rate
        FROM \`${PROJECT}.S0_TMX.Inspections\` i
        WHERE DATE(i.DateInspected) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${daysBack * 2} DAY)
          AND DATE(i.DateInspected) < DATE_SUB(CURRENT_DATE(), INTERVAL ${daysBack} DAY)
          ${region ? 'AND i.BillingState = @region' : ''}
        GROUP BY i.EmployeeNumber
      )
    )

    SELECT
      'Avg Stops/Day' as metric,
      ROUND(cp.avg_stops_per_day, 2) as current_value,
      ROUND(pp.avg_stops_per_day, 2) as prior_value,
      8.0 as target_value,
      ${percentage('cp.avg_stops_per_day - pp.avg_stops_per_day', 'NULLIF(pp.avg_stops_per_day, 0)')} as change_pct,
      CASE WHEN cp.avg_stops_per_day >= 8 THEN 'good' WHEN cp.avg_stops_per_day >= 6 THEN 'warning' ELSE 'critical' END as status
    FROM current_period cp, prior_period pp

    UNION ALL

    SELECT
      'Completion Rate' as metric,
      ROUND(cp.avg_completion_rate, 2) as current_value,
      ROUND(pp.avg_completion_rate, 2) as prior_value,
      90.0 as target_value,
      ${percentage('cp.avg_completion_rate - pp.avg_completion_rate', 'NULLIF(pp.avg_completion_rate, 0)')} as change_pct,
      CASE WHEN cp.avg_completion_rate >= 90 THEN 'good' WHEN cp.avg_completion_rate >= 75 THEN 'warning' ELSE 'critical' END as status
    FROM current_period cp, prior_period pp

    UNION ALL

    SELECT
      'Active Techs' as metric,
      cp.active_techs as current_value,
      pp.active_techs as prior_value,
      cp.active_techs as target_value,
      ${percentage('cp.active_techs - pp.active_techs', 'NULLIF(pp.active_techs, 0)')} as change_pct,
      'neutral' as status
    FROM current_period cp, prior_period pp
  `

  const params: Record<string, unknown> = {}
  if (region) params.region = region

  try {
    const result = await bigQueryClient.queryWithParams<TechProductivitySummary>(sql, params)
    return result.rows
  } catch (error) {
    console.error('[Workforce] getTechProductivitySummary failed:', error)
    return []
  }
}
