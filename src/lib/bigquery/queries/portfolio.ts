/**
 * BigQuery Queries for Portfolio Analytics (BCG_RTD_DB.DR_Portfolio*)
 *
 * Portfolio analytics for customer retention, churn, CLV, and growth.
 *
 * Tables:
 * - DR_PortfolioDaily: Daily account snapshots
 * - DR_PortfolioMonthly: Monthly aggregated portfolio metrics
 *
 * Columns (DR_PortfolioDaily):
 * - date: Snapshot date
 * - account_id: Unique account identifier
 * - service_type: Residential, Commercial, Termite
 * - revenue: Account monthly revenue
 * - status: Active, Cancelled, Suspended
 * - branch_id: Branch code
 *
 * Columns (DR_PortfolioMonthly):
 * - month: Period (YYYY-MM)
 * - total_accounts: Total active accounts
 * - new_accounts: New accounts added
 * - lost_accounts: Accounts lost (cancelled/non-renew)
 * - churn_reason: Cancellation reason
 * - avg_revenue: Average revenue per account
 */

import { bigQueryClient, BIGQUERY_CONFIG } from '../client'
import { handleBigQueryError } from '../error-handler'
import { validateOrgCode, validateNumeric } from '../validation'

// =============================================================================
// Types
// =============================================================================

export interface AccountRetention {
  cohort_month: string
  market: string
  region?: string
  initial_accounts: number
  retained_accounts: number
  retention_rate: number
  months_since_start: number
}

export interface RevenueChurn {
  period: string
  market: string
  service_type: string
  total_revenue: number
  churned_revenue: number
  churn_rate: number
  churn_reason: string
}

export interface CustomerLifetimeValue {
  service_type: string
  market: string
  avg_monthly_revenue: number
  avg_tenure_months: number
  customer_lifetime_value: number
  total_customers: number
}

export interface PortfolioGrowth {
  period: string
  market: string
  new_accounts: number
  lost_accounts: number
  net_growth: number
  total_active_accounts: number
  growth_rate: number
}

export interface PortfolioQueryOptions {
  daysBack?: number
  market?: string
  region?: string
  branch?: string
  serviceType?: string
  limit?: number
}

// =============================================================================
// Queries
// =============================================================================

const PROJECT = BIGQUERY_CONFIG.projectId
const DATASET = 'BCG_RTD_DB'

/**
 * Get Account Retention by Cohort
 *
 * Tracks retention rates for customer cohorts over time.
 * Cohort = customers who started in the same month.
 */
export async function getAccountRetention(
  options: PortfolioQueryOptions = {}
): Promise<AccountRetention[]> {
  try {
    const validatedMarket = validateOrgCode(options.market, 'market')
    const validatedRegion = validateOrgCode(options.region, 'region')
    const validatedDaysBack = validateNumeric(options.daysBack, 'daysBack', 1, 730) ?? 365

    const sql = `
      WITH account_start AS (
        SELECT
          account_id,
          SUBSTR(branch_id, 1, 2) as market,
          SUBSTR(branch_id, 1, 4) as region,
          MIN(date) as start_date,
          FORMAT_DATE('%Y-%m', MIN(date)) as cohort_month
        FROM \`${PROJECT}.${DATASET}.DR_PortfolioDaily\`
        WHERE status = 'Active'
          AND date >= DATE_SUB(CURRENT_DATE(), INTERVAL ${validatedDaysBack} DAY)
          ${validatedMarket ? `AND SUBSTR(branch_id, 1, 2) = @market` : ''}
          ${validatedRegion ? `AND SUBSTR(branch_id, 1, 4) = @region` : ''}
        GROUP BY account_id, market, region
      ),
      retention_calc AS (
        SELECT
          a.cohort_month,
          a.market,
          a.region,
          COUNT(DISTINCT a.account_id) as initial_accounts,
          COUNT(DISTINCT CASE
            WHEN p.status = 'Active'
              AND p.date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
            THEN p.account_id
          END) as retained_accounts,
          DATE_DIFF(CURRENT_DATE(), MIN(a.start_date), MONTH) as months_since_start
        FROM account_start a
        LEFT JOIN \`${PROJECT}.${DATASET}.DR_PortfolioDaily\` p
          ON a.account_id = p.account_id
          AND p.date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
        GROUP BY a.cohort_month, a.market, a.region
      )
      SELECT
        cohort_month,
        market,
        region,
        initial_accounts,
        retained_accounts,
        ROUND((retained_accounts / NULLIF(initial_accounts, 0)) * 100, 2) as retention_rate,
        months_since_start
      FROM retention_calc
      WHERE initial_accounts >= 10  -- Only show cohorts with sufficient size
      ORDER BY cohort_month DESC, market, region
      LIMIT ${options.limit ?? 100}
    `

    const queryOptions: Record<string, unknown> = {}
    if (validatedMarket) queryOptions.market = validatedMarket
    if (validatedRegion) queryOptions.region = validatedRegion

    const result = await bigQueryClient.query<AccountRetention>(sql, queryOptions)
    return result.rows
  } catch (error) {
    throw handleBigQueryError(error, 'getAccountRetention')
  }
}

/**
 * Get Revenue Churn Analysis
 *
 * Analyzes revenue loss from churned accounts by service type and reason.
 */
export async function getRevenueChurn(
  options: PortfolioQueryOptions = {}
): Promise<RevenueChurn[]> {
  try {
    const validatedMarket = validateOrgCode(options.market, 'market')
    const validatedDaysBack = validateNumeric(options.daysBack, 'daysBack', 1, 365) ?? 180

    const sql = `
      WITH active_revenue AS (
        SELECT
          FORMAT_DATE('%Y-%m', date) as period,
          SUBSTR(branch_id, 1, 2) as market,
          service_type,
          SUM(revenue) as total_revenue
        FROM \`${PROJECT}.${DATASET}.DR_PortfolioDaily\`
        WHERE status = 'Active'
          AND date >= DATE_SUB(CURRENT_DATE(), INTERVAL ${validatedDaysBack} DAY)
          ${validatedMarket ? `AND SUBSTR(branch_id, 1, 2) = @market` : ''}
        GROUP BY period, market, service_type
      ),
      churned_revenue AS (
        SELECT
          m.month as period,
          SUBSTR(d.branch_id, 1, 2) as market,
          d.service_type,
          m.churn_reason,
          SUM(d.revenue) as churned_revenue
        FROM \`${PROJECT}.${DATASET}.DR_PortfolioMonthly\` m
        JOIN \`${PROJECT}.${DATASET}.DR_PortfolioDaily\` d
          ON FORMAT_DATE('%Y-%m', d.date) = m.month
          AND d.status = 'Cancelled'
          AND SUBSTR(d.branch_id, 1, 2) = SUBSTR(m.branch_id, 1, 2)
        WHERE m.month >= FORMAT_DATE('%Y-%m', DATE_SUB(CURRENT_DATE(), INTERVAL ${validatedDaysBack} DAY))
          ${validatedMarket ? `AND SUBSTR(m.branch_id, 1, 2) = @market` : ''}
        GROUP BY period, market, d.service_type, m.churn_reason
      )
      SELECT
        a.period,
        a.market,
        a.service_type,
        a.total_revenue,
        COALESCE(c.churned_revenue, 0) as churned_revenue,
        ROUND((COALESCE(c.churned_revenue, 0) / NULLIF(a.total_revenue, 0)) * 100, 2) as churn_rate,
        COALESCE(c.churn_reason, 'N/A') as churn_reason
      FROM active_revenue a
      LEFT JOIN churned_revenue c
        ON a.period = c.period
        AND a.market = c.market
        AND a.service_type = c.service_type
      ORDER BY a.period DESC, a.market, a.service_type
      LIMIT ${options.limit ?? 100}
    `

    const queryOptions: Record<string, unknown> = {}
    if (validatedMarket) queryOptions.market = validatedMarket

    const result = await bigQueryClient.query<RevenueChurn>(sql, queryOptions)
    return result.rows
  } catch (error) {
    throw handleBigQueryError(error, 'getRevenueChurn')
  }
}

/**
 * Get Customer Lifetime Value by Service Type
 *
 * Calculates CLV = Average Monthly Revenue × Average Tenure (months)
 * Provides strategic insight into customer value by segment.
 */
export async function getCustomerLifetimeValue(
  options: PortfolioQueryOptions = {}
): Promise<CustomerLifetimeValue[]> {
  try {
    const validatedMarket = validateOrgCode(options.market, 'market')
    const validatedDaysBack = validateNumeric(options.daysBack, 'daysBack', 1, 730) ?? 365

    const sql = `
      WITH customer_metrics AS (
        SELECT
          account_id,
          SUBSTR(branch_id, 1, 2) as market,
          service_type,
          AVG(revenue) as avg_monthly_revenue,
          DATE_DIFF(MAX(date), MIN(date), MONTH) as tenure_months
        FROM \`${PROJECT}.${DATASET}.DR_PortfolioDaily\`
        WHERE date >= DATE_SUB(CURRENT_DATE(), INTERVAL ${validatedDaysBack} DAY)
          ${validatedMarket ? `AND SUBSTR(branch_id, 1, 2) = @market` : ''}
          AND service_type IS NOT NULL
        GROUP BY account_id, market, service_type
        HAVING tenure_months >= 3  -- Only include customers with at least 3 months tenure
      )
      SELECT
        service_type,
        market,
        ROUND(AVG(avg_monthly_revenue), 2) as avg_monthly_revenue,
        ROUND(AVG(tenure_months), 1) as avg_tenure_months,
        ROUND(AVG(avg_monthly_revenue) * AVG(tenure_months), 2) as customer_lifetime_value,
        COUNT(DISTINCT account_id) as total_customers
      FROM customer_metrics
      GROUP BY service_type, market
      HAVING total_customers >= 10  -- Only show segments with sufficient sample size
      ORDER BY customer_lifetime_value DESC, market, service_type
      LIMIT ${options.limit ?? 50}
    `

    const queryOptions: Record<string, unknown> = {}
    if (validatedMarket) queryOptions.market = validatedMarket

    const result = await bigQueryClient.query<CustomerLifetimeValue>(sql, queryOptions)
    return result.rows
  } catch (error) {
    throw handleBigQueryError(error, 'getCustomerLifetimeValue')
  }
}

/**
 * Get Portfolio Growth Trends
 *
 * Tracks new accounts vs lost accounts to show net portfolio growth.
 * Growth Rate = (Net Growth / Total Active Accounts) × 100
 */
export async function getPortfolioGrowth(
  options: PortfolioQueryOptions = {}
): Promise<PortfolioGrowth[]> {
  try {
    const validatedMarket = validateOrgCode(options.market, 'market')
    const validatedDaysBack = validateNumeric(options.daysBack, 'daysBack', 1, 365) ?? 180

    const sql = `
      WITH monthly_changes AS (
        SELECT
          month as period,
          SUBSTR(branch_id, 1, 2) as market,
          SUM(new_accounts) as new_accounts,
          SUM(lost_accounts) as lost_accounts,
          SUM(total_accounts) as total_active_accounts
        FROM \`${PROJECT}.${DATASET}.DR_PortfolioMonthly\`
        WHERE month >= FORMAT_DATE('%Y-%m', DATE_SUB(CURRENT_DATE(), INTERVAL ${validatedDaysBack} DAY))
          ${validatedMarket ? `AND SUBSTR(branch_id, 1, 2) = @market` : ''}
        GROUP BY period, market
      )
      SELECT
        period,
        market,
        new_accounts,
        lost_accounts,
        (new_accounts - lost_accounts) as net_growth,
        total_active_accounts,
        ROUND(((new_accounts - lost_accounts) / NULLIF(total_active_accounts, 0)) * 100, 2) as growth_rate
      FROM monthly_changes
      ORDER BY period DESC, market
      LIMIT ${options.limit ?? 100}
    `

    const queryOptions: Record<string, unknown> = {}
    if (validatedMarket) queryOptions.market = validatedMarket

    const result = await bigQueryClient.query<PortfolioGrowth>(sql, queryOptions)
    return result.rows
  } catch (error) {
    throw handleBigQueryError(error, 'getPortfolioGrowth')
  }
}
