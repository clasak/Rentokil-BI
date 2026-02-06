/**
 * BigQuery Queries for Portfolio Analytics
 *
 * Portfolio analytics for customer retention, churn, CLV, and growth.
 *
 * Tables:
 * - W3_Contract_Checker.T0_unf_Contract_All: Contract lifecycle data (7.8M rows)
 * - BCG_RTD_DB.DR_PortfolioMonthly: Monthly aggregated portfolio metrics
 * - BCG_RTD_DB.DR_Cancels: Cancellation data (513K rows)
 *
 * Columns (T0_unf_Contract_All):
 * - SellDate, StartDate, CancelDate: Contract lifecycle dates
 * - ContractValue: Contract value
 * - customer_name: Customer identifier
 * - AssignedBranchCode, RegionCode, MarketCode: Organization hierarchy
 * - CancelReasonCode: Cancellation reason
 * - ServiceType: Service category
 *
 * Columns (DR_PortfolioMonthly):
 * - snapshot_month: Period date
 * - monthly_revenue: Revenue for the month
 * - ending_customers: Customer count at month end
 * - region, market: Organization codes
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

/**
 * Get Account Retention by Cohort
 *
 * Tracks retention rates for customer cohorts over time.
 * Cohort = customers who started in the same month (based on SellDate).
 *
 * Uses W3_Contract_Checker.T0_unf_Contract_All
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
          customer_name,
          MarketCode as market,
          RegionCode as region,
          MIN(SellDate) as start_date,
          FORMAT_DATE('%Y-%m', MIN(SellDate)) as cohort_month
        FROM \`${PROJECT}.W3_Contract_Checker.T0_unf_Contract_All\`
        WHERE SellDate >= DATE_SUB(CURRENT_DATE(), INTERVAL ${validatedDaysBack} DAY)
          ${validatedMarket ? `AND MarketCode = @market` : ''}
          ${validatedRegion ? `AND RegionCode = @region` : ''}
        GROUP BY customer_name, market, region
      ),
      retention_calc AS (
        SELECT
          a.cohort_month,
          a.market,
          a.region,
          COUNT(DISTINCT a.customer_name) as initial_accounts,
          COUNT(DISTINCT CASE
            WHEN c.CancelDate IS NULL OR c.CancelDate >= CURRENT_DATE()
            THEN c.customer_name
          END) as retained_accounts,
          DATE_DIFF(CURRENT_DATE(), MIN(a.start_date), MONTH) as months_since_start
        FROM account_start a
        LEFT JOIN \`${PROJECT}.W3_Contract_Checker.T0_unf_Contract_All\` c
          ON a.customer_name = c.customer_name
          AND a.market = c.MarketCode
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
 * Uses W3_Contract_Checker.T0_unf_Contract_All with CancelDate and CancelReasonCode.
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
          FORMAT_DATE('%Y-%m', SellDate) as period,
          MarketCode as market,
          ServiceType as service_type,
          SUM(ContractValue) as total_revenue
        FROM \`${PROJECT}.W3_Contract_Checker.T0_unf_Contract_All\`
        WHERE (CancelDate IS NULL OR CancelDate >= SellDate)
          AND SellDate >= DATE_SUB(CURRENT_DATE(), INTERVAL ${validatedDaysBack} DAY)
          ${validatedMarket ? `AND MarketCode = @market` : ''}
        GROUP BY period, market, service_type
      ),
      churned_revenue AS (
        SELECT
          FORMAT_DATE('%Y-%m', CancelDate) as period,
          MarketCode as market,
          ServiceType as service_type,
          COALESCE(CancelReasonCode, 'Unknown') as churn_reason,
          SUM(ContractValue) as churned_revenue
        FROM \`${PROJECT}.W3_Contract_Checker.T0_unf_Contract_All\`
        WHERE CancelDate IS NOT NULL
          AND CancelDate >= DATE_SUB(CURRENT_DATE(), INTERVAL ${validatedDaysBack} DAY)
          ${validatedMarket ? `AND MarketCode = @market` : ''}
        GROUP BY period, market, service_type, churn_reason
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
 * Uses W3_Contract_Checker.T0_unf_Contract_All to calculate tenure and revenue.
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
          customer_name,
          MarketCode as market,
          ServiceType as service_type,
          ContractValue / NULLIF(DATE_DIFF(
            COALESCE(CancelDate, CURRENT_DATE()),
            SellDate,
            MONTH
          ), 0) as avg_monthly_revenue,
          DATE_DIFF(
            COALESCE(CancelDate, CURRENT_DATE()),
            SellDate,
            MONTH
          ) as tenure_months
        FROM \`${PROJECT}.W3_Contract_Checker.T0_unf_Contract_All\`
        WHERE SellDate >= DATE_SUB(CURRENT_DATE(), INTERVAL ${validatedDaysBack} DAY)
          ${validatedMarket ? `AND MarketCode = @market` : ''}
          AND ServiceType IS NOT NULL
          AND DATE_DIFF(
            COALESCE(CancelDate, CURRENT_DATE()),
            SellDate,
            MONTH
          ) >= 3  -- Only include contracts with at least 3 months tenure
      )
      SELECT
        service_type,
        market,
        ROUND(AVG(avg_monthly_revenue), 2) as avg_monthly_revenue,
        ROUND(AVG(tenure_months), 1) as avg_tenure_months,
        ROUND(AVG(avg_monthly_revenue) * AVG(tenure_months), 2) as customer_lifetime_value,
        COUNT(DISTINCT customer_name) as total_customers
      FROM customer_metrics
      WHERE avg_monthly_revenue IS NOT NULL
        AND tenure_months > 0
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
 * Tracks new contracts vs cancelled contracts to show net portfolio growth.
 * Uses BCG_RTD_DB.DR_PortfolioMonthly for monthly snapshots.
 *
 * Growth Rate = (Net Growth / Total Active Accounts) × 100
 */
export async function getPortfolioGrowth(
  options: PortfolioQueryOptions = {}
): Promise<PortfolioGrowth[]> {
  try {
    const validatedMarket = validateOrgCode(options.market, 'market')
    const validatedDaysBack = validateNumeric(options.daysBack, 'daysBack', 1, 365) ?? 180

    const sql = `
      WITH monthly_contracts AS (
        SELECT
          FORMAT_DATE('%Y-%m', SellDate) as period,
          MarketCode as market,
          COUNT(*) as new_accounts
        FROM \`${PROJECT}.W3_Contract_Checker.T0_unf_Contract_All\`
        WHERE SellDate >= DATE_SUB(CURRENT_DATE(), INTERVAL ${validatedDaysBack} DAY)
          ${validatedMarket ? `AND MarketCode = @market` : ''}
        GROUP BY period, market
      ),
      monthly_cancels AS (
        SELECT
          FORMAT_DATE('%Y-%m', CancelDate) as period,
          MarketCode as market,
          COUNT(*) as lost_accounts
        FROM \`${PROJECT}.W3_Contract_Checker.T0_unf_Contract_All\`
        WHERE CancelDate >= DATE_SUB(CURRENT_DATE(), INTERVAL ${validatedDaysBack} DAY)
          ${validatedMarket ? `AND MarketCode = @market` : ''}
        GROUP BY period, market
      ),
      monthly_active AS (
        SELECT
          FORMAT_DATE('%Y-%m', snapshot_month) as period,
          market,
          ending_customers as total_active_accounts
        FROM \`${PROJECT}.BCG_RTD_DB.DR_PortfolioMonthly\`
        WHERE snapshot_month >= DATE_SUB(CURRENT_DATE(), INTERVAL ${validatedDaysBack} DAY)
          ${validatedMarket ? `AND market = @market` : ''}
        GROUP BY period, market, ending_customers
      )
      SELECT
        COALESCE(n.period, c.period, a.period) as period,
        COALESCE(n.market, c.market, a.market) as market,
        COALESCE(n.new_accounts, 0) as new_accounts,
        COALESCE(c.lost_accounts, 0) as lost_accounts,
        (COALESCE(n.new_accounts, 0) - COALESCE(c.lost_accounts, 0)) as net_growth,
        COALESCE(a.total_active_accounts, 0) as total_active_accounts,
        ROUND((
          (COALESCE(n.new_accounts, 0) - COALESCE(c.lost_accounts, 0)) /
          NULLIF(COALESCE(a.total_active_accounts, 1), 0)
        ) * 100, 2) as growth_rate
      FROM monthly_contracts n
      FULL OUTER JOIN monthly_cancels c
        ON n.period = c.period AND n.market = c.market
      FULL OUTER JOIN monthly_active a
        ON COALESCE(n.period, c.period) = a.period
        AND COALESCE(n.market, c.market) = a.market
      WHERE COALESCE(n.period, c.period, a.period) IS NOT NULL
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
