/**
 * BigQuery Queries for Payroll Analytics (BCG_RTD_DB.BCG_EmployeePayData_NT)
 *
 * 9.4M rows of payroll data for labor cost analysis.
 * SENSITIVE DATA - Restricted to exec, market_vp, region_director only
 *
 * Table: BCG_EmployeePayData_NT
 * Columns:
 * - employee_id: Employee identifier
 * - pay_date: Date of payroll
 * - regular_hours: Regular hours worked
 * - overtime_hours: Overtime hours worked
 * - hourly_rate: Hourly compensation rate
 * - total_pay: Total compensation for period
 * - branch_id: Branch code
 * - position_title: Job role/title
 */

import { bigQueryClient, BIGQUERY_CONFIG } from '../client'
import { handleBigQueryError } from '../error-handler'
import { validateOrgCode, validateNumeric } from '../validation'

// =============================================================================
// Types
// =============================================================================

export interface LaborCostAnalysis {
  period: string
  market: string
  region?: string
  branch?: string
  total_labor_cost: number
  regular_pay: number
  overtime_pay: number
  headcount: number
  avg_hourly_rate: number
  change_from_prior_month: number
}

export interface OvertimeTrend {
  period: string
  market: string
  overtime_hours: number
  overtime_cost: number
  overtime_pct_of_total: number
  total_hours: number
}

export interface RevenuePerLaborDollar {
  period: string
  market: string
  region?: string
  branch?: string
  total_revenue: number
  total_labor_cost: number
  revenue_per_labor_dollar: number
  efficiency_rating: string // 'Excellent' | 'Good' | 'Fair' | 'Poor'
}

export interface CompensationBenchmark {
  position_title: string
  market: string
  avg_hourly_rate: number
  min_hourly_rate: number
  max_hourly_rate: number
  median_hourly_rate: number
  employee_count: number
}

export interface PayrollQueryOptions {
  daysBack?: number
  market?: string
  region?: string
  branch?: string
  limit?: number
}

// =============================================================================
// Queries
// =============================================================================

const PROJECT = BIGQUERY_CONFIG.projectId
const DATASET = 'BCG_RTD_DB'
const TABLE = 'BCG_EmployeePayData_NT'

/**
 * Get Labor Cost Analysis with MoM trends
 *
 * Calculates total labor costs by market/region/branch with breakdown
 * of regular vs overtime and change from prior month.
 */
export async function getLaborCostAnalysis(
  options: PayrollQueryOptions = {}
): Promise<LaborCostAnalysis[]> {
  try {
    const validatedMarket = validateOrgCode(options.market, 'market')
    const validatedRegion = validateOrgCode(options.region, 'region')
    const validatedBranch = validateOrgCode(options.branch, 'branch')
    const validatedDaysBack = validateNumeric(options.daysBack, 'daysBack', 1, 365) ?? 90

    const sql = `
      WITH current_period AS (
        SELECT
          FORMAT_DATE('%Y-%m', pay_date) as period,
          SUBSTR(branch_id, 1, 2) as market,
          SUBSTR(branch_id, 1, 4) as region,
          branch_id as branch,
          SUM(total_pay - (overtime_hours * hourly_rate * 1.5)) as regular_pay,
          SUM(overtime_hours * hourly_rate * 1.5) as overtime_pay,
          SUM(total_pay) as total_labor_cost,
          COUNT(DISTINCT employee_id) as headcount,
          AVG(hourly_rate) as avg_hourly_rate
        FROM \`${PROJECT}.${DATASET}.${TABLE}\`
        WHERE pay_date >= DATE_SUB(CURRENT_DATE('America/New_York'), INTERVAL ${validatedDaysBack} DAY)
          ${validatedMarket ? `AND SUBSTR(branch_id, 1, 2) = @market` : ''}
          ${validatedRegion ? `AND SUBSTR(branch_id, 1, 4) = @region` : ''}
          ${validatedBranch ? `AND branch_id = @branch` : ''}
        GROUP BY period, market, region, branch
      ),
      prior_period AS (
        SELECT
          FORMAT_DATE('%Y-%m', DATE_ADD(pay_date, INTERVAL 1 MONTH)) as period,
          SUBSTR(branch_id, 1, 2) as market,
          SUBSTR(branch_id, 1, 4) as region,
          branch_id as branch,
          SUM(total_pay) as total_labor_cost
        FROM \`${PROJECT}.${DATASET}.${TABLE}\`
        WHERE pay_date >= DATE_SUB(CURRENT_DATE('America/New_York'), INTERVAL ${validatedDaysBack + 30} DAY)
          AND pay_date < DATE_SUB(CURRENT_DATE('America/New_York'), INTERVAL ${validatedDaysBack} DAY)
          ${validatedMarket ? `AND SUBSTR(branch_id, 1, 2) = @market` : ''}
          ${validatedRegion ? `AND SUBSTR(branch_id, 1, 4) = @region` : ''}
          ${validatedBranch ? `AND branch_id = @branch` : ''}
        GROUP BY period, market, region, branch
      )
      SELECT
        c.period,
        c.market,
        c.region,
        c.branch,
        c.total_labor_cost,
        c.regular_pay,
        c.overtime_pay,
        c.headcount,
        c.avg_hourly_rate,
        ROUND(
          ((c.total_labor_cost - COALESCE(p.total_labor_cost, 0)) / NULLIF(p.total_labor_cost, 0)) * 100,
          2
        ) as change_from_prior_month
      FROM current_period c
      LEFT JOIN prior_period p
        ON c.period = p.period
        AND c.market = p.market
        AND c.region = p.region
        AND c.branch = p.branch
      ORDER BY c.period DESC, c.market, c.region, c.branch
      LIMIT ${options.limit ?? 100}
    `

    const queryOptions: Record<string, unknown> = {}
    if (validatedMarket) queryOptions.market = validatedMarket
    if (validatedRegion) queryOptions.region = validatedRegion
    if (validatedBranch) queryOptions.branch = validatedBranch

    const result = await bigQueryClient.query<LaborCostAnalysis>(sql, queryOptions)
    return result.rows
  } catch (error) {
    throw handleBigQueryError(error, 'getLaborCostAnalysis')
  }
}

/**
 * Get Overtime Trends (12-month history)
 *
 * Analyzes overtime hours and costs as percentage of total labor.
 * Alert threshold: >15% overtime is considered high.
 */
export async function getOvertimeTrends(
  options: PayrollQueryOptions = {}
): Promise<OvertimeTrend[]> {
  try {
    const validatedMarket = validateOrgCode(options.market, 'market')
    const validatedDaysBack = validateNumeric(options.daysBack, 'daysBack', 1, 730) ?? 365

    const sql = `
      SELECT
        FORMAT_DATE('%Y-%m', pay_date) as period,
        SUBSTR(branch_id, 1, 2) as market,
        SUM(overtime_hours) as overtime_hours,
        SUM(overtime_hours * hourly_rate * 1.5) as overtime_cost,
        ROUND(
          (SUM(overtime_hours) / NULLIF(SUM(regular_hours + overtime_hours), 0)) * 100,
          2
        ) as overtime_pct_of_total,
        SUM(regular_hours + overtime_hours) as total_hours
      FROM \`${PROJECT}.${DATASET}.${TABLE}\`
      WHERE pay_date >= DATE_SUB(CURRENT_DATE('America/New_York'), INTERVAL ${validatedDaysBack} DAY)
        ${validatedMarket ? `AND SUBSTR(branch_id, 1, 2) = @market` : ''}
      GROUP BY period, market
      ORDER BY period DESC, market
      LIMIT ${options.limit ?? 100}
    `

    const queryOptions: Record<string, unknown> = {}
    if (validatedMarket) queryOptions.market = validatedMarket

    const result = await bigQueryClient.query<OvertimeTrend>(sql, queryOptions)
    return result.rows
  } catch (error) {
    throw handleBigQueryError(error, 'getOvertimeTrends')
  }
}

/**
 * Get Revenue per Labor Dollar (efficiency metric)
 *
 * Calculates how much revenue is generated per dollar of labor cost.
 * Formula: Total Revenue / Total Labor Cost
 *
 * Rating scale:
 * - Excellent: >3.5
 * - Good: 2.5-3.5
 * - Fair: 1.5-2.5
 * - Poor: <1.5
 */
export async function getRevenuePerLaborDollar(
  options: PayrollQueryOptions = {}
): Promise<RevenuePerLaborDollar[]> {
  try {
    const validatedMarket = validateOrgCode(options.market, 'market')
    const validatedRegion = validateOrgCode(options.region, 'region')
    const validatedBranch = validateOrgCode(options.branch, 'branch')
    const validatedDaysBack = validateNumeric(options.daysBack, 'daysBack', 1, 365) ?? 90

    const sql = `
      WITH labor_costs AS (
        SELECT
          FORMAT_DATE('%Y-%m', pay_date) as period,
          SUBSTR(branch_id, 1, 2) as market,
          SUBSTR(branch_id, 1, 4) as region,
          branch_id as branch,
          SUM(total_pay) as total_labor_cost
        FROM \`${PROJECT}.${DATASET}.${TABLE}\`
        WHERE pay_date >= DATE_SUB(CURRENT_DATE('America/New_York'), INTERVAL ${validatedDaysBack} DAY)
          ${validatedMarket ? `AND SUBSTR(branch_id, 1, 2) = @market` : ''}
          ${validatedRegion ? `AND SUBSTR(branch_id, 1, 4) = @region` : ''}
          ${validatedBranch ? `AND branch_id = @branch` : ''}
        GROUP BY period, market, region, branch
      ),
      revenue AS (
        SELECT
          FORMAT_DATE('%Y-%m', sell_date) as period,
          SUBSTR(branch_id, 1, 2) as market,
          SUBSTR(branch_id, 1, 4) as region,
          branch_id as branch,
          SUM(contract_value) as total_revenue
        FROM \`${PROJECT}.${DATASET}.DR_ContractSales\`
        WHERE sell_date >= DATE_SUB(CURRENT_DATE('America/New_York'), INTERVAL ${validatedDaysBack} DAY)
          ${validatedMarket ? `AND SUBSTR(branch_id, 1, 2) = @market` : ''}
          ${validatedRegion ? `AND SUBSTR(branch_id, 1, 4) = @region` : ''}
          ${validatedBranch ? `AND branch_id = @branch` : ''}
        GROUP BY period, market, region, branch
      )
      SELECT
        l.period,
        l.market,
        l.region,
        l.branch,
        COALESCE(r.total_revenue, 0) as total_revenue,
        l.total_labor_cost,
        ROUND(COALESCE(r.total_revenue, 0) / NULLIF(l.total_labor_cost, 0), 2) as revenue_per_labor_dollar,
        CASE
          WHEN COALESCE(r.total_revenue, 0) / NULLIF(l.total_labor_cost, 0) > 3.5 THEN 'Excellent'
          WHEN COALESCE(r.total_revenue, 0) / NULLIF(l.total_labor_cost, 0) > 2.5 THEN 'Good'
          WHEN COALESCE(r.total_revenue, 0) / NULLIF(l.total_labor_cost, 0) > 1.5 THEN 'Fair'
          ELSE 'Poor'
        END as efficiency_rating
      FROM labor_costs l
      LEFT JOIN revenue r
        ON l.period = r.period
        AND l.market = r.market
        AND l.region = r.region
        AND l.branch = r.branch
      ORDER BY l.period DESC, l.market, l.region, l.branch
      LIMIT ${options.limit ?? 100}
    `

    const queryOptions: Record<string, unknown> = {}
    if (validatedMarket) queryOptions.market = validatedMarket
    if (validatedRegion) queryOptions.region = validatedRegion
    if (validatedBranch) queryOptions.branch = validatedBranch

    const result = await bigQueryClient.query<RevenuePerLaborDollar>(sql, queryOptions)
    return result.rows
  } catch (error) {
    throw handleBigQueryError(error, 'getRevenuePerLaborDollar')
  }
}

/**
 * Get Compensation Benchmarks by Role and Market
 *
 * Provides salary benchmarking data for different positions.
 * Useful for compensation planning and equity analysis.
 */
export async function getCompensationBenchmarks(
  options: PayrollQueryOptions = {}
): Promise<CompensationBenchmark[]> {
  try {
    const validatedMarket = validateOrgCode(options.market, 'market')
    const validatedDaysBack = validateNumeric(options.daysBack, 'daysBack', 1, 180) ?? 90

    const sql = `
      WITH latest_pay AS (
        SELECT
          employee_id,
          position_title,
          SUBSTR(branch_id, 1, 2) as market,
          hourly_rate,
          ROW_NUMBER() OVER (
            PARTITION BY employee_id
            ORDER BY pay_date DESC
          ) as rn
        FROM \`${PROJECT}.${DATASET}.${TABLE}\`
        WHERE pay_date >= DATE_SUB(CURRENT_DATE('America/New_York'), INTERVAL ${validatedDaysBack} DAY)
          ${validatedMarket ? `AND SUBSTR(branch_id, 1, 2) = @market` : ''}
          AND position_title IS NOT NULL
      )
      SELECT
        position_title,
        market,
        ROUND(AVG(hourly_rate), 2) as avg_hourly_rate,
        ROUND(MIN(hourly_rate), 2) as min_hourly_rate,
        ROUND(MAX(hourly_rate), 2) as max_hourly_rate,
        ROUND(APPROX_QUANTILES(hourly_rate, 100)[OFFSET(50)], 2) as median_hourly_rate,
        COUNT(DISTINCT employee_id) as employee_count
      FROM latest_pay
      WHERE rn = 1
      GROUP BY position_title, market
      HAVING employee_count >= 5  -- Only show roles with sufficient sample size
      ORDER BY market, position_title
      LIMIT ${options.limit ?? 100}
    `

    const queryOptions: Record<string, unknown> = {}
    if (validatedMarket) queryOptions.market = validatedMarket

    const result = await bigQueryClient.query<CompensationBenchmark>(sql, queryOptions)
    return result.rows
  } catch (error) {
    throw handleBigQueryError(error, 'getCompensationBenchmarks')
  }
}
