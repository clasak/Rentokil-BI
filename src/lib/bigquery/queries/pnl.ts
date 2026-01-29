/**
 * BigQuery Queries for Profit & Loss (P&L) Module
 *
 * Production table (61M rows):
 * - S0_TMX.vfct_gl_activity - GL activity with debits/credits
 *   - posting_date, account_number, account_name
 *   - debit_amount, credit_amount
 *   - branch_id, market_name, region_name, transaction_type
 *
 * Account Structure:
 * - Revenue accounts: 4xxxx (credit balances)
 * - COGS accounts: 5xxxx (debit balances)
 * - Operating expense accounts: 6xxxx, 7xxxx (debit balances)
 *
 * Pages: /finance/pnl
 */

import { bigQueryClient, BIGQUERY_CONFIG } from '../client'
import { handleBigQueryError } from '../error-handler'
import { validateOrgCode, validateNumeric, validateString } from '../validation'

// =============================================================================
// Types
// =============================================================================

export interface PnLSummary {
  total_revenue: number
  total_cogs: number
  gross_profit: number
  gross_margin: number
  operating_expenses: number
  operating_income: number
  operating_margin: number
  ebitda: number
  ebitda_margin: number
  net_income: number
  net_margin: number
  revenue_mom_change: number
  expense_mom_change: number
  as_of_date: string
}

export interface RevenueBreakdown {
  service_line: string
  revenue: number
  revenue_pct: number
  account_range: string
}

export interface ExpenseBreakdown {
  expense_category: string
  expense_amount: number
  expense_pct: number
  account_range: string
  variance_vs_budget?: number
}

export interface PnLTrend {
  period: string
  revenue: number
  cogs: number
  gross_profit: number
  operating_expenses: number
  operating_income: number
  net_income: number
  gross_margin: number
  operating_margin: number
  net_margin: number
}

// =============================================================================
// Query Options
// =============================================================================

export interface PnLQueryOptions {
  market?: string
  region?: string
  branch?: string
  dateRange?: 'MTD' | 'QTD' | 'YTD' | 'custom'
  startDate?: string
  endDate?: string
  includeDepreciation?: boolean
}

// =============================================================================
// Table Configuration
// =============================================================================

const PROJECT = BIGQUERY_CONFIG.projectId
const TMX_DATASET = 'S0_TMX'
const GL_TABLE = 'vfct_gl_activity'

// =============================================================================
// Queries
// =============================================================================

/**
 * Get P&L summary with key metrics
 * Calculates total revenue, COGS, operating expenses, EBITDA, net income
 */
export async function getPnLSummary(
  options: PnLQueryOptions = {}
): Promise<PnLSummary> {
  const { market, region, branch, dateRange = 'MTD', startDate, endDate } = options

  // Build date filter
  let dateFilter = ''
  if (dateRange === 'MTD') {
    dateFilter = `DATE_TRUNC(posting_date, MONTH) = DATE_TRUNC(CURRENT_DATE(), MONTH)`
  } else if (dateRange === 'QTD') {
    dateFilter = `DATE_TRUNC(posting_date, QUARTER) = DATE_TRUNC(CURRENT_DATE(), QUARTER)`
  } else if (dateRange === 'YTD') {
    dateFilter = `DATE_TRUNC(posting_date, YEAR) = DATE_TRUNC(CURRENT_DATE(), YEAR)`
  } else if (startDate && endDate) {
    dateFilter = `posting_date BETWEEN @startDate AND @endDate`
  } else {
    // Default to current month
    dateFilter = `DATE_TRUNC(posting_date, MONTH) = DATE_TRUNC(CURRENT_DATE(), MONTH)`
  }

  // Build org filter
  let orgFilter = ''
  if (market) orgFilter += ` AND market_name = @market`
  if (region) orgFilter += ` AND region_name = @region`
  if (branch) orgFilter += ` AND branch_id = @branch`

  const sql = `
    WITH current_period AS (
      SELECT
        -- Revenue (4xxxx accounts - credit balances)
        COALESCE(SUM(CASE
          WHEN CAST(account_number AS INT64) BETWEEN 40000 AND 49999
          THEN credit_amount - debit_amount
          ELSE 0
        END), 0) as revenue,

        -- COGS (5xxxx accounts - debit balances)
        COALESCE(SUM(CASE
          WHEN CAST(account_number AS INT64) BETWEEN 50000 AND 59999
          THEN debit_amount - credit_amount
          ELSE 0
        END), 0) as cogs,

        -- Operating Expenses (6xxxx, 7xxxx accounts - debit balances)
        COALESCE(SUM(CASE
          WHEN CAST(account_number AS INT64) BETWEEN 60000 AND 79999
          THEN debit_amount - credit_amount
          ELSE 0
        END), 0) as operating_expenses,

        -- Depreciation & Amortization (subset of expenses)
        COALESCE(SUM(CASE
          WHEN CAST(account_number AS INT64) BETWEEN 68000 AND 68999
          THEN debit_amount - credit_amount
          ELSE 0
        END), 0) as depreciation,

        MAX(posting_date) as as_of_date
      FROM \`${PROJECT}.${TMX_DATASET}.${GL_TABLE}\`
      WHERE ${dateFilter}${orgFilter}
        AND account_number IS NOT NULL
        AND SAFE_CAST(account_number AS INT64) IS NOT NULL
    ),
    prior_month AS (
      SELECT
        COALESCE(SUM(CASE
          WHEN CAST(account_number AS INT64) BETWEEN 40000 AND 49999
          THEN credit_amount - debit_amount
          ELSE 0
        END), 0) as revenue,

        COALESCE(SUM(CASE
          WHEN CAST(account_number AS INT64) BETWEEN 60000 AND 79999
          THEN debit_amount - credit_amount
          ELSE 0
        END), 0) as operating_expenses
      FROM \`${PROJECT}.${TMX_DATASET}.${GL_TABLE}\`
      WHERE DATE_TRUNC(posting_date, MONTH) = DATE_TRUNC(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH), MONTH)
        ${orgFilter}
        AND account_number IS NOT NULL
        AND SAFE_CAST(account_number AS INT64) IS NOT NULL
    )
    SELECT
      c.revenue as total_revenue,
      c.cogs as total_cogs,
      (c.revenue - c.cogs) as gross_profit,
      SAFE_DIVIDE((c.revenue - c.cogs), c.revenue) as gross_margin,
      c.operating_expenses as operating_expenses,
      (c.revenue - c.cogs - c.operating_expenses) as operating_income,
      SAFE_DIVIDE((c.revenue - c.cogs - c.operating_expenses), c.revenue) as operating_margin,
      (c.revenue - c.cogs - c.operating_expenses + c.depreciation) as ebitda,
      SAFE_DIVIDE((c.revenue - c.cogs - c.operating_expenses + c.depreciation), c.revenue) as ebitda_margin,
      (c.revenue - c.cogs - c.operating_expenses) as net_income,
      SAFE_DIVIDE((c.revenue - c.cogs - c.operating_expenses), c.revenue) as net_margin,
      SAFE_DIVIDE((c.revenue - p.revenue), p.revenue) * 100 as revenue_mom_change,
      SAFE_DIVIDE((c.operating_expenses - p.operating_expenses), p.operating_expenses) * 100 as expense_mom_change,
      FORMAT_DATE('%Y-%m-%d', c.as_of_date) as as_of_date
    FROM current_period c
    CROSS JOIN prior_month p
  `

  try {
    const params: Record<string, unknown> = {}
    if (market) params.market = market
    if (region) params.region = region
    if (branch) params.branch = branch
    if (startDate) params.startDate = startDate
    if (endDate) params.endDate = endDate

    const result = await bigQueryClient.queryWithParams<PnLSummary>(sql, params)
    return result.rows[0] || getDefaultPnLSummary()
  } catch (error) {
    console.error('[PnL] getPnLSummary failed:', error)
    return getDefaultPnLSummary()
  }
}

function getDefaultPnLSummary(): PnLSummary {
  return {
    total_revenue: 0,
    total_cogs: 0,
    gross_profit: 0,
    gross_margin: 0,
    operating_expenses: 0,
    operating_income: 0,
    operating_margin: 0,
    ebitda: 0,
    ebitda_margin: 0,
    net_income: 0,
    net_margin: 0,
    revenue_mom_change: 0,
    expense_mom_change: 0,
    as_of_date: new Date().toISOString().split('T')[0],
  }
}

/**
 * Get revenue breakdown by service line
 * Groups revenue by account ranges to identify service lines
 */
export async function getRevenueBreakdown(
  options: PnLQueryOptions = {}
): Promise<RevenueBreakdown[]> {
  const { market, region, branch, dateRange = 'MTD', startDate, endDate } = options

  let dateFilter = ''
  if (dateRange === 'MTD') {
    dateFilter = `DATE_TRUNC(posting_date, MONTH) = DATE_TRUNC(CURRENT_DATE(), MONTH)`
  } else if (dateRange === 'QTD') {
    dateFilter = `DATE_TRUNC(posting_date, QUARTER) = DATE_TRUNC(CURRENT_DATE(), QUARTER)`
  } else if (dateRange === 'YTD') {
    dateFilter = `DATE_TRUNC(posting_date, YEAR) = DATE_TRUNC(CURRENT_DATE(), YEAR)`
  } else if (startDate && endDate) {
    dateFilter = `posting_date BETWEEN @startDate AND @endDate`
  } else {
    dateFilter = `DATE_TRUNC(posting_date, MONTH) = DATE_TRUNC(CURRENT_DATE(), MONTH)`
  }

  let orgFilter = ''
  if (market) orgFilter += ` AND market_name = @market`
  if (region) orgFilter += ` AND region_name = @region`
  if (branch) orgFilter += ` AND branch_id = @branch`

  const sql = `
    WITH revenue_data AS (
      SELECT
        CASE
          WHEN CAST(account_number AS INT64) BETWEEN 40000 AND 42999 THEN 'Residential Services'
          WHEN CAST(account_number AS INT64) BETWEEN 43000 AND 45999 THEN 'Commercial Services'
          WHEN CAST(account_number AS INT64) BETWEEN 46000 AND 46999 THEN 'Termite Services'
          WHEN CAST(account_number AS INT64) BETWEEN 47000 AND 48999 THEN 'Other Services'
          ELSE 'Other Revenue'
        END as service_line,
        CASE
          WHEN CAST(account_number AS INT64) BETWEEN 40000 AND 42999 THEN '40000-42999'
          WHEN CAST(account_number AS INT64) BETWEEN 43000 AND 45999 THEN '43000-45999'
          WHEN CAST(account_number AS INT64) BETWEEN 46000 AND 46999 THEN '46000-46999'
          WHEN CAST(account_number AS INT64) BETWEEN 47000 AND 48999 THEN '47000-48999'
          ELSE '49000+'
        END as account_range,
        (credit_amount - debit_amount) as revenue
      FROM \`${PROJECT}.${TMX_DATASET}.${GL_TABLE}\`
      WHERE ${dateFilter}${orgFilter}
        AND account_number IS NOT NULL
        AND SAFE_CAST(account_number AS INT64) IS NOT NULL
        AND CAST(account_number AS INT64) BETWEEN 40000 AND 49999
    ),
    totals AS (
      SELECT SUM(revenue) as total_revenue
      FROM revenue_data
    )
    SELECT
      r.service_line,
      COALESCE(SUM(r.revenue), 0) as revenue,
      SAFE_DIVIDE(SUM(r.revenue), t.total_revenue) as revenue_pct,
      r.account_range
    FROM revenue_data r
    CROSS JOIN totals t
    GROUP BY r.service_line, r.account_range, t.total_revenue
    HAVING SUM(r.revenue) > 0
    ORDER BY revenue DESC
  `

  try {
    const params: Record<string, unknown> = {}
    if (market) params.market = market
    if (region) params.region = region
    if (branch) params.branch = branch
    if (startDate) params.startDate = startDate
    if (endDate) params.endDate = endDate

    const result = await bigQueryClient.queryWithParams<RevenueBreakdown>(sql, params)
    return result.rows
  } catch (error) {
    console.error('[PnL] getRevenueBreakdown failed:', error)
    return []
  }
}

/**
 * Get expense breakdown by category
 * Groups operating expenses by account ranges
 */
export async function getExpenseBreakdown(
  options: PnLQueryOptions = {}
): Promise<ExpenseBreakdown[]> {
  const { market, region, branch, dateRange = 'MTD', startDate, endDate } = options

  let dateFilter = ''
  if (dateRange === 'MTD') {
    dateFilter = `DATE_TRUNC(posting_date, MONTH) = DATE_TRUNC(CURRENT_DATE(), MONTH)`
  } else if (dateRange === 'QTD') {
    dateFilter = `DATE_TRUNC(posting_date, QUARTER) = DATE_TRUNC(CURRENT_DATE(), QUARTER)`
  } else if (dateRange === 'YTD') {
    dateFilter = `DATE_TRUNC(posting_date, YEAR) = DATE_TRUNC(CURRENT_DATE(), YEAR)`
  } else if (startDate && endDate) {
    dateFilter = `posting_date BETWEEN @startDate AND @endDate`
  } else {
    dateFilter = `DATE_TRUNC(posting_date, MONTH) = DATE_TRUNC(CURRENT_DATE(), MONTH)`
  }

  let orgFilter = ''
  if (market) orgFilter += ` AND market_name = @market`
  if (region) orgFilter += ` AND region_name = @region`
  if (branch) orgFilter += ` AND branch_id = @branch`

  const sql = `
    WITH expense_data AS (
      SELECT
        CASE
          WHEN CAST(account_number AS INT64) BETWEEN 60000 AND 62999 THEN 'Labor & Payroll'
          WHEN CAST(account_number AS INT64) BETWEEN 63000 AND 64999 THEN 'Materials & Supplies'
          WHEN CAST(account_number AS INT64) BETWEEN 65000 AND 66999 THEN 'Vehicle & Equipment'
          WHEN CAST(account_number AS INT64) BETWEEN 67000 AND 67999 THEN 'Facilities & Rent'
          WHEN CAST(account_number AS INT64) BETWEEN 68000 AND 68999 THEN 'Depreciation & Amortization'
          WHEN CAST(account_number AS INT64) BETWEEN 69000 AND 69999 THEN 'Marketing & Advertising'
          WHEN CAST(account_number AS INT64) BETWEEN 70000 AND 72999 THEN 'Administrative'
          WHEN CAST(account_number AS INT64) BETWEEN 73000 AND 74999 THEN 'IT & Technology'
          WHEN CAST(account_number AS INT64) BETWEEN 75000 AND 79999 THEN 'Other Operating Expenses'
          ELSE 'Other Expenses'
        END as expense_category,
        CASE
          WHEN CAST(account_number AS INT64) BETWEEN 60000 AND 62999 THEN '60000-62999'
          WHEN CAST(account_number AS INT64) BETWEEN 63000 AND 64999 THEN '63000-64999'
          WHEN CAST(account_number AS INT64) BETWEEN 65000 AND 66999 THEN '65000-66999'
          WHEN CAST(account_number AS INT64) BETWEEN 67000 AND 67999 THEN '67000-67999'
          WHEN CAST(account_number AS INT64) BETWEEN 68000 AND 68999 THEN '68000-68999'
          WHEN CAST(account_number AS INT64) BETWEEN 69000 AND 69999 THEN '69000-69999'
          WHEN CAST(account_number AS INT64) BETWEEN 70000 AND 72999 THEN '70000-72999'
          WHEN CAST(account_number AS INT64) BETWEEN 73000 AND 74999 THEN '73000-74999'
          WHEN CAST(account_number AS INT64) BETWEEN 75000 AND 79999 THEN '75000-79999'
          ELSE '80000+'
        END as account_range,
        (debit_amount - credit_amount) as expense
      FROM \`${PROJECT}.${TMX_DATASET}.${GL_TABLE}\`
      WHERE ${dateFilter}${orgFilter}
        AND account_number IS NOT NULL
        AND SAFE_CAST(account_number AS INT64) IS NOT NULL
        AND CAST(account_number AS INT64) BETWEEN 60000 AND 79999
    ),
    totals AS (
      SELECT SUM(expense) as total_expenses
      FROM expense_data
    )
    SELECT
      e.expense_category,
      COALESCE(SUM(e.expense), 0) as expense_amount,
      SAFE_DIVIDE(SUM(e.expense), t.total_expenses) as expense_pct,
      e.account_range
    FROM expense_data e
    CROSS JOIN totals t
    GROUP BY e.expense_category, e.account_range, t.total_expenses
    HAVING SUM(e.expense) > 0
    ORDER BY expense_amount DESC
  `

  try {
    const params: Record<string, unknown> = {}
    if (market) params.market = market
    if (region) params.region = region
    if (branch) params.branch = branch
    if (startDate) params.startDate = startDate
    if (endDate) params.endDate = endDate

    const result = await bigQueryClient.queryWithParams<ExpenseBreakdown>(sql, params)
    return result.rows
  } catch (error) {
    console.error('[PnL] getExpenseBreakdown failed:', error)
    return []
  }
}

/**
 * Get P&L trend over 12 months
 * Shows monthly revenue, expenses, and profitability metrics
 */
export async function getPnLTrend(
  options: PnLQueryOptions = {}
): Promise<PnLTrend[]> {
  const { market, region, branch } = options

  let orgFilter = ''
  if (market) orgFilter += ` AND market_name = @market`
  if (region) orgFilter += ` AND region_name = @region`
  if (branch) orgFilter += ` AND branch_id = @branch`

  const sql = `
    WITH monthly_data AS (
      SELECT
        FORMAT_DATE('%b %Y', DATE_TRUNC(posting_date, MONTH)) as period,
        DATE_TRUNC(posting_date, MONTH) as period_date,

        -- Revenue (4xxxx accounts - credit balances)
        COALESCE(SUM(CASE
          WHEN CAST(account_number AS INT64) BETWEEN 40000 AND 49999
          THEN credit_amount - debit_amount
          ELSE 0
        END), 0) as revenue,

        -- COGS (5xxxx accounts - debit balances)
        COALESCE(SUM(CASE
          WHEN CAST(account_number AS INT64) BETWEEN 50000 AND 59999
          THEN debit_amount - credit_amount
          ELSE 0
        END), 0) as cogs,

        -- Operating Expenses (6xxxx, 7xxxx accounts - debit balances)
        COALESCE(SUM(CASE
          WHEN CAST(account_number AS INT64) BETWEEN 60000 AND 79999
          THEN debit_amount - credit_amount
          ELSE 0
        END), 0) as operating_expenses

      FROM \`${PROJECT}.${TMX_DATASET}.${GL_TABLE}\`
      WHERE posting_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 12 MONTH)
        AND posting_date < DATE_TRUNC(CURRENT_DATE(), MONTH)
        ${orgFilter}
        AND account_number IS NOT NULL
        AND SAFE_CAST(account_number AS INT64) IS NOT NULL
      GROUP BY period, period_date
    )
    SELECT
      period,
      revenue,
      cogs,
      (revenue - cogs) as gross_profit,
      operating_expenses,
      (revenue - cogs - operating_expenses) as operating_income,
      (revenue - cogs - operating_expenses) as net_income,
      SAFE_DIVIDE((revenue - cogs), revenue) as gross_margin,
      SAFE_DIVIDE((revenue - cogs - operating_expenses), revenue) as operating_margin,
      SAFE_DIVIDE((revenue - cogs - operating_expenses), revenue) as net_margin
    FROM monthly_data
    ORDER BY period_date ASC
  `

  try {
    const params: Record<string, unknown> = {}
    if (market) params.market = market
    if (region) params.region = region
    if (branch) params.branch = branch

    const result = await bigQueryClient.queryWithParams<PnLTrend>(sql, params)
    return result.rows
  } catch (error) {
    console.error('[PnL] getPnLTrend failed:', error)
    return []
  }
}
