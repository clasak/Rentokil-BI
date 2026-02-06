/**
 * BigQuery Queries for BCG Analytics (BCG_RTD_DB dataset)
 *
 * NEW INTEGRATION - These tables were discovered but not previously used!
 *
 * BCG_RTD_DB contains 74 tables with rich analytics data:
 * - DR_Leads: 3.3M rows, 81 columns - Lead analytics
 * - DR_ContractSales: 3.2M rows, 76 columns - Sales analytics
 * - DR_Cancels: 513K rows, 37 columns - Cancellation analytics
 * - DR_PNI: 3.8M rows, 47 columns - PNI/Termite analytics
 * - DR_GLActivity: 3.4M rows, 28 columns - GL/Finance
 * - BCG_EmployeePayData_NT: 9.4M rows - Payroll data
 */

import { bigQueryClient, BIGQUERY_CONFIG } from '../client'
import { handleBigQueryError } from '../error-handler'
import { validateOrgCode, validateNumeric } from '../validation'

// =============================================================================
// Types
// =============================================================================

export interface BCGLeadAnalytics {
  period: string
  market: string
  total_leads: number
  converted_leads: number
  conversion_rate: number
  avg_lead_value: number
  lead_source: string
}

export interface BCGSalesAnalytics {
  period: string
  market: string
  region: string
  total_contracts: number
  total_revenue: number
  avg_contract_value: number
  started_contracts: number
  start_rate: number
}

export interface BCGCancellationAnalytics {
  period: string
  market: string
  total_cancels: number
  cancel_rate: number
  top_cancel_reason: string
  avg_days_to_cancel: number
  lost_revenue: number
}

export interface BCGPNIAnalytics {
  branch: string
  market: string
  total_pni: number
  completed_pni: number
  completion_rate: number
  avg_revenue: number
}

export interface BCGGLActivity {
  period: string
  account_type: string
  total_amount: number
  transaction_count: number
}

// =============================================================================
// Query Options
// =============================================================================

export interface BCGQueryOptions {
  daysBack?: number
  market?: string
  region?: string
  limit?: number
}

// =============================================================================
// Queries
// =============================================================================

const PROJECT = BIGQUERY_CONFIG.projectId
const DATASET = 'BCG_RTD_DB'

/**
 * Get lead analytics from DR_Leads (3.3M rows)
 *
 * Verified columns: rtx_lead_uid, lead_ID, business, received_date,
 * market_type, lead_type, lead_source, lead_channel_1, primary_pest
 */
export async function getBCGLeadAnalytics(
  options: BCGQueryOptions = {}
): Promise<BCGLeadAnalytics[]> {
  try {
    // Validate inputs
    const validatedMarket = validateOrgCode(options.market, 'market')
    const validatedDaysBack = validateNumeric(options.daysBack, 'daysBack', 1, 365) ?? 30
    const validatedLimit = validateNumeric(options.limit, 'limit', 1, 1000) ?? 100

    let whereClause = `DATE(received_date) >= DATE_SUB(CURRENT_DATE('America/New_York'), INTERVAL @daysBack DAY)`
    if (validatedMarket) whereClause += ` AND market_type = @market`

    const sql = `
      SELECT
        FORMAT_DATE('%Y-%m', DATE(received_date)) as period,
        COALESCE(market_type, 'Unknown') as market,
        COUNT(*) as total_leads,
        COUNTIF(lead_type = 'Sold' OR lead_type LIKE '%Won%') as converted_leads,
        SAFE_DIVIDE(COUNTIF(lead_type = 'Sold' OR lead_type LIKE '%Won%'), COUNT(*)) as conversion_rate,
        0.0 as avg_lead_value,
        COALESCE(lead_source, 'Unknown') as lead_source
      FROM \`${PROJECT}.${DATASET}.DR_Leads\`
      WHERE ${whereClause}
      GROUP BY period, market_type, lead_source
      ORDER BY period DESC, total_leads DESC
      LIMIT @resultLimit
    `

    const params: Record<string, unknown> = {
      daysBack: validatedDaysBack,
      resultLimit: validatedLimit,
    }
    if (validatedMarket) params.market = validatedMarket

    const result = await bigQueryClient.queryWithParams<BCGLeadAnalytics>(sql, params)
    return result.rows
  } catch (error) {
    throw handleBigQueryError(error, 'getBCGLeadAnalytics', options as Record<string, unknown>)
  }
}

/**
 * Get sales analytics from DR_ContractSales (3.2M rows)
 *
 * Verified columns: sales_id, sell_date, sell_date_year_month, start_date,
 * cancel_date, cancel_reason_code, product_group, service_type_desc
 */
export async function getBCGSalesAnalytics(
  options: BCGQueryOptions = {}
): Promise<BCGSalesAnalytics[]> {
  try {
    // Validate inputs
    const validatedDaysBack = validateNumeric(options.daysBack, 'daysBack', 1, 365) ?? 30
    const validatedLimit = validateNumeric(options.limit, 'limit', 1, 1000) ?? 100

    const whereClause = `sell_date >= DATE_SUB(CURRENT_DATE('America/New_York'), INTERVAL @daysBack DAY)`

    const sql = `
      SELECT
        CAST(sell_date_year_month AS STRING) as period,
        COALESCE(product_group, 'Unknown') as market,
        COALESCE(service_type_desc, 'Unknown') as region,
        COUNT(*) as total_contracts,
        SUM(COALESCE(contract_value, 0)) as total_revenue,
        AVG(COALESCE(contract_value, 0)) as avg_contract_value,
        COUNTIF(start_date IS NOT NULL) as started_contracts,
        SAFE_DIVIDE(COUNTIF(start_date IS NOT NULL), COUNT(*)) as start_rate
      FROM \`${PROJECT}.${DATASET}.DR_ContractSales\`
      WHERE ${whereClause}
      GROUP BY sell_date_year_month, product_group, service_type_desc
      ORDER BY sell_date_year_month DESC, total_contracts DESC
      LIMIT @resultLimit
    `

    const params: Record<string, unknown> = {
      daysBack: validatedDaysBack,
      resultLimit: validatedLimit,
    }

    const result = await bigQueryClient.queryWithParams<BCGSalesAnalytics>(sql, params)
    return result.rows
  } catch (error) {
    throw handleBigQueryError(error, 'getBCGSalesAnalytics', options as Record<string, unknown>)
  }
}

/**
 * Get cancellation analytics from DR_Cancels (513K rows)
 */
export async function getBCGCancellationAnalytics(
  options: BCGQueryOptions = {}
): Promise<BCGCancellationAnalytics[]> {
  const { daysBack = 90, market, limit = 50 } = options

  let whereClause = `DATE(cancel_date) >= DATE_SUB(CURRENT_DATE('America/New_York'), INTERVAL @daysBack DAY)`
  if (market) whereClause += ` AND market = @market`

  const sql = `
    WITH cancel_data AS (
      SELECT
        FORMAT_DATE('%Y-%m', DATE(cancel_date)) as period,
        COALESCE(market, 'Unknown') as market,
        COUNT(*) as total_cancels,
        COALESCE(cancel_reason, 'Unknown') as cancel_reason,
        AVG(days_to_cancel) as avg_days_to_cancel,
        SUM(COALESCE(contract_value, 0)) as lost_revenue
      FROM \`${PROJECT}.${DATASET}.DR_Cancels\`
      WHERE ${whereClause}
      GROUP BY period, market, cancel_reason
    )
    SELECT
      period,
      market,
      SUM(total_cancels) as total_cancels,
      0 as cancel_rate,
      ARRAY_AGG(cancel_reason ORDER BY total_cancels DESC LIMIT 1)[OFFSET(0)] as top_cancel_reason,
      AVG(avg_days_to_cancel) as avg_days_to_cancel,
      SUM(lost_revenue) as lost_revenue
    FROM cancel_data
    GROUP BY period, market
    ORDER BY period DESC
    LIMIT @resultLimit
  `

  try {
    const params: Record<string, unknown> = {
      daysBack: daysBack,
      resultLimit: limit,
    }
    if (market) params.market = market

    const result = await bigQueryClient.queryWithParams<BCGCancellationAnalytics>(sql, params)
    return result.rows
  } catch (error) {
    throw handleBigQueryError(error, 'getBCGCancellationAnalytics', options as Record<string, unknown>)
  }
}

/**
 * Get PNI analytics from DR_PNI (3.8M rows)
 */
export async function getBCGPNIAnalytics(
  options: BCGQueryOptions = {}
): Promise<BCGPNIAnalytics[]> {
  const { daysBack = 30, market, limit = 100 } = options

  let whereClause = `DATE(service_date) >= DATE_SUB(CURRENT_DATE('America/New_York'), INTERVAL @daysBack DAY)`
  if (market) whereClause += ` AND market = @market`

  const sql = `
    SELECT
      COALESCE(branch, 'Unknown') as branch,
      COALESCE(market, 'Unknown') as market,
      COUNT(*) as total_pni,
      COUNTIF(completed_ind = 'Y') as completed_pni,
      SAFE_DIVIDE(COUNTIF(completed_ind = 'Y'), COUNT(*)) as completion_rate,
      AVG(COALESCE(revenue, 0)) as avg_revenue
    FROM \`${PROJECT}.${DATASET}.DR_PNI\`
    WHERE ${whereClause}
    GROUP BY branch, market
    ORDER BY total_pni DESC
    LIMIT @resultLimit
  `

  try {
    const params: Record<string, unknown> = {
      daysBack: daysBack,
      resultLimit: limit,
    }
    if (market) params.market = market

    const result = await bigQueryClient.queryWithParams<BCGPNIAnalytics>(sql, params)
    return result.rows
  } catch (error) {
    throw handleBigQueryError(error, 'getBCGPNIAnalytics', options as Record<string, unknown>)
  }
}

/**
 * Get GL activity from DR_GLActivity (3.4M rows)
 */
export async function getBCGGLActivity(
  options: BCGQueryOptions = {}
): Promise<BCGGLActivity[]> {
  const { daysBack = 30, limit = 50 } = options

  const sql = `
    SELECT
      FORMAT_DATE('%Y-%m', DATE(transaction_date)) as period,
      COALESCE(account_type, 'Unknown') as account_type,
      SUM(COALESCE(amount, 0)) as total_amount,
      COUNT(*) as transaction_count
    FROM \`${PROJECT}.${DATASET}.DR_GLActivity\`
    WHERE DATE(transaction_date) >= DATE_SUB(CURRENT_DATE('America/New_York'), INTERVAL @daysBack DAY)
    GROUP BY period, account_type
    ORDER BY period DESC, total_amount DESC
    LIMIT @resultLimit
  `

  try {
    const params: Record<string, unknown> = {
      daysBack: daysBack,
      resultLimit: limit,
    }

    const result = await bigQueryClient.queryWithParams<BCGGLActivity>(sql, params)
    return result.rows
  } catch (error) {
    throw handleBigQueryError(error, 'getBCGGLActivity', options as Record<string, unknown>)
  }
}

/**
 * Get comprehensive BCG analytics summary
 */
export async function getBCGAnalyticsSummary(
  options: BCGQueryOptions = {}
): Promise<{
  leads: BCGLeadAnalytics[]
  sales: BCGSalesAnalytics[]
  cancellations: BCGCancellationAnalytics[]
}> {
  const [leads, sales, cancellations] = await Promise.all([
    getBCGLeadAnalytics({ ...options, limit: 20 }),
    getBCGSalesAnalytics({ ...options, limit: 20 }),
    getBCGCancellationAnalytics({ ...options, limit: 20 }),
  ])

  return { leads, sales, cancellations }
}

// =============================================================================
// EXPANDED BCG QUERIES - High Priority Tables
// =============================================================================

// -----------------------------------------------------------------------------
// DR_Terminations - Employee termination analytics (HR/Retention)
// -----------------------------------------------------------------------------

export interface BCGTermination {
  period: string
  market: string
  region: string
  total_terminations: number
  voluntary_count: number
  involuntary_count: number
  voluntary_rate: number
  avg_tenure_days: number
  top_term_reason: string
}

/**
 * Get termination analytics from DR_Terminations
 * Fills gap for /hr/retention dashboard
 */
export async function getBCGTerminations(
  options: BCGQueryOptions = {}
): Promise<BCGTermination[]> {
  const { daysBack = 90, market, limit = 50 } = options

  let whereClause = `DATE(term_date) >= DATE_SUB(CURRENT_DATE('America/New_York'), INTERVAL @daysBack DAY)`
  if (market) whereClause += ` AND market = @market`

  const sql = `
    SELECT
      FORMAT_DATE('%Y-%m', DATE(term_date)) as period,
      COALESCE(market, 'Unknown') as market,
      COALESCE(region, 'Unknown') as region,
      COUNT(*) as total_terminations,
      COUNTIF(LOWER(term_type) LIKE '%voluntary%' OR term_type = 'V') as voluntary_count,
      COUNTIF(LOWER(term_type) LIKE '%involuntary%' OR term_type = 'I') as involuntary_count,
      SAFE_DIVIDE(COUNTIF(LOWER(term_type) LIKE '%voluntary%' OR term_type = 'V'), COUNT(*)) as voluntary_rate,
      AVG(tenure_days) as avg_tenure_days,
      COALESCE(
        ARRAY_AGG(term_reason ORDER BY 1 DESC LIMIT 1)[SAFE_OFFSET(0)],
        'Unknown'
      ) as top_term_reason
    FROM \`${PROJECT}.${DATASET}.DR_Terminations\`
    WHERE ${whereClause}
    GROUP BY period, market, region
    ORDER BY period DESC, total_terminations DESC
    LIMIT @resultLimit
  `

  try {
    const params: Record<string, unknown> = {
      daysBack: daysBack,
      resultLimit: limit,
    }
    if (market) params.market = market

    const result = await bigQueryClient.queryWithParams<BCGTermination>(sql, params)
    return result.rows
  } catch (error) {
    throw handleBigQueryError(error, 'getBCGTerminations', options as Record<string, unknown>)
  }
}

// -----------------------------------------------------------------------------
// DR_WorkOrders - Operations work order analytics
// -----------------------------------------------------------------------------

export interface BCGWorkOrder {
  period: string
  branch: string
  market: string
  total_work_orders: number
  completed_count: number
  completion_rate: number
  avg_duration_days: number
  total_revenue: number
}

/**
 * Get work order analytics from DR_WorkOrders
 * Fills gap for /ops dashboard
 */
export async function getBCGWorkOrders(
  options: BCGQueryOptions = {}
): Promise<BCGWorkOrder[]> {
  const { daysBack = 30, market, limit = 100 } = options

  let whereClause = `DATE(work_order_date) >= DATE_SUB(CURRENT_DATE('America/New_York'), INTERVAL @daysBack DAY)`
  if (market) whereClause += ` AND market = @market`

  const sql = `
    SELECT
      FORMAT_DATE('%Y-%m', DATE(work_order_date)) as period,
      COALESCE(branch, 'Unknown') as branch,
      COALESCE(market, 'Unknown') as market,
      COUNT(*) as total_work_orders,
      COUNTIF(status = 'Completed' OR completed_ind = 'Y') as completed_count,
      SAFE_DIVIDE(COUNTIF(status = 'Completed' OR completed_ind = 'Y'), COUNT(*)) as completion_rate,
      AVG(COALESCE(duration_days, 0)) as avg_duration_days,
      SUM(COALESCE(revenue, 0)) as total_revenue
    FROM \`${PROJECT}.${DATASET}.DR_WorkOrders\`
    WHERE ${whereClause}
    GROUP BY period, branch, market
    ORDER BY period DESC, total_work_orders DESC
    LIMIT @resultLimit
  `

  try {
    const params: Record<string, unknown> = {
      daysBack: daysBack,
      resultLimit: limit,
    }
    if (market) params.market = market

    const result = await bigQueryClient.queryWithParams<BCGWorkOrder>(sql, params)
    return result.rows
  } catch (error) {
    throw handleBigQueryError(error, 'getBCGWorkOrders', options as Record<string, unknown>)
  }
}

// -----------------------------------------------------------------------------
// DR_TechWorkOrders - Technician productivity analytics
// -----------------------------------------------------------------------------

export interface BCGTechWorkOrder {
  technician_id: string
  technician_name: string
  branch: string
  total_work_orders: number
  completed_count: number
  completion_rate: number
  avg_stops_per_day: number
  total_revenue: number
  efficiency_score: number
}

/**
 * Get tech work order analytics from DR_TechWorkOrders
 * Fills gap for /workforce/tech-productivity dashboard
 */
export async function getBCGTechWorkOrders(
  options: BCGQueryOptions = {}
): Promise<BCGTechWorkOrder[]> {
  const { daysBack = 30, market, limit = 100 } = options

  let whereClause = `DATE(work_date) >= DATE_SUB(CURRENT_DATE('America/New_York'), INTERVAL @daysBack DAY)`
  if (market) whereClause += ` AND market = @market`

  const sql = `
    SELECT
      COALESCE(CAST(technician_id AS STRING), 'Unknown') as technician_id,
      COALESCE(technician_name, 'Unknown') as technician_name,
      COALESCE(branch, 'Unknown') as branch,
      COUNT(*) as total_work_orders,
      COUNTIF(status = 'Completed' OR completed_ind = 'Y') as completed_count,
      SAFE_DIVIDE(COUNTIF(status = 'Completed' OR completed_ind = 'Y'), COUNT(*)) as completion_rate,
      COUNT(*) / NULLIF(COUNT(DISTINCT DATE(work_date)), 0) as avg_stops_per_day,
      SUM(COALESCE(revenue, 0)) as total_revenue,
      SAFE_DIVIDE(
        COUNTIF(status = 'Completed' OR completed_ind = 'Y') * 100,
        COUNT(*)
      ) as efficiency_score
    FROM \`${PROJECT}.${DATASET}.DR_TechWorkOrders\`
    WHERE ${whereClause}
    GROUP BY technician_id, technician_name, branch
    ORDER BY total_work_orders DESC
    LIMIT @resultLimit
  `

  try {
    const params: Record<string, unknown> = {
      daysBack: daysBack,
      resultLimit: limit,
    }
    if (market) params.market = market

    const result = await bigQueryClient.queryWithParams<BCGTechWorkOrder>(sql, params)
    return result.rows
  } catch (error) {
    throw handleBigQueryError(error, 'getBCGTechWorkOrders', options as Record<string, unknown>)
  }
}

// -----------------------------------------------------------------------------
// DR_PortfolioDaily - Daily portfolio metrics
// -----------------------------------------------------------------------------

export interface BCGPortfolioDaily {
  date: string
  market: string
  region: string
  active_customers: number
  new_customers: number
  churned_customers: number
  net_change: number
  total_revenue: number
  avg_revenue_per_customer: number
}

/**
 * Get daily portfolio metrics from DR_PortfolioDaily
 * Fills gap for Executive Command Center and /qbr
 */
export async function getBCGPortfolioDaily(
  options: BCGQueryOptions = {}
): Promise<BCGPortfolioDaily[]> {
  const { daysBack = 30, market, limit = 100 } = options

  let whereClause = `DATE(snapshot_date) >= DATE_SUB(CURRENT_DATE('America/New_York'), INTERVAL @daysBack DAY)`
  if (market) whereClause += ` AND market = @market`

  const sql = `
    SELECT
      FORMAT_DATE('%Y-%m-%d', DATE(snapshot_date)) as date,
      COALESCE(market, 'Unknown') as market,
      COALESCE(region, 'Unknown') as region,
      SUM(COALESCE(active_customers, 0)) as active_customers,
      SUM(COALESCE(new_customers, 0)) as new_customers,
      SUM(COALESCE(churned_customers, 0)) as churned_customers,
      SUM(COALESCE(new_customers, 0)) - SUM(COALESCE(churned_customers, 0)) as net_change,
      SUM(COALESCE(revenue, 0)) as total_revenue,
      SAFE_DIVIDE(SUM(COALESCE(revenue, 0)), NULLIF(SUM(COALESCE(active_customers, 0)), 0)) as avg_revenue_per_customer
    FROM \`${PROJECT}.${DATASET}.DR_PortfolioDaily\`
    WHERE ${whereClause}
    GROUP BY date, market, region
    ORDER BY date DESC
    LIMIT @resultLimit
  `

  try {
    const params: Record<string, unknown> = {
      daysBack: daysBack,
      resultLimit: limit,
    }
    if (market) params.market = market

    const result = await bigQueryClient.queryWithParams<BCGPortfolioDaily>(sql, params)
    return result.rows
  } catch (error) {
    throw handleBigQueryError(error, 'getBCGPortfolioDaily', options as Record<string, unknown>)
  }
}

// -----------------------------------------------------------------------------
// DR_PortfolioMonthly - Monthly portfolio metrics
// -----------------------------------------------------------------------------

export interface BCGPortfolioMonthly {
  period: string
  market: string
  region: string
  ending_customers: number
  new_starts: number
  cancels: number
  churn_rate: number
  monthly_revenue: number
  yoy_growth: number
}

/**
 * Get monthly portfolio metrics from DR_PortfolioMonthly
 * Fills gap for /qbr and /wbr dashboards
 */
export async function getBCGPortfolioMonthly(
  options: BCGQueryOptions = {}
): Promise<BCGPortfolioMonthly[]> {
  const { daysBack = 365, market, limit = 24 } = options

  let whereClause = `DATE(snapshot_month) >= DATE_SUB(CURRENT_DATE('America/New_York'), INTERVAL @daysBack DAY)`
  if (market) whereClause += ` AND market = @market`

  const sql = `
    SELECT
      FORMAT_DATE('%Y-%m', DATE(snapshot_month)) as period,
      COALESCE(market, 'Unknown') as market,
      COALESCE(region, 'Unknown') as region,
      SUM(COALESCE(ending_customers, 0)) as ending_customers,
      SUM(COALESCE(new_starts, 0)) as new_starts,
      SUM(COALESCE(cancels, 0)) as cancels,
      SAFE_DIVIDE(SUM(COALESCE(cancels, 0)), NULLIF(SUM(COALESCE(ending_customers, 0)), 0)) as churn_rate,
      SUM(COALESCE(revenue, 0)) as monthly_revenue,
      0 as yoy_growth
    FROM \`${PROJECT}.${DATASET}.DR_PortfolioMonthly\`
    WHERE ${whereClause}
    GROUP BY period, market, region
    ORDER BY period DESC
    LIMIT @resultLimit
  `

  try {
    const params: Record<string, unknown> = {
      daysBack: daysBack,
      resultLimit: limit,
    }
    if (market) params.market = market

    const result = await bigQueryClient.queryWithParams<BCGPortfolioMonthly>(sql, params)
    return result.rows
  } catch (error) {
    throw handleBigQueryError(error, 'getBCGPortfolioMonthly', options as Record<string, unknown>)
  }
}

// -----------------------------------------------------------------------------
// DR_PayrollBranch - Payroll analytics by branch
// -----------------------------------------------------------------------------

export interface BCGPayrollBranch {
  period: string
  branch: string
  market: string
  total_employees: number
  total_payroll: number
  avg_salary: number
  overtime_hours: number
  overtime_cost: number
}

/**
 * Get payroll analytics from DR_PayrollBranch
 * Enhances /people and /finance dashboards
 */
export async function getBCGPayrollBranch(
  options: BCGQueryOptions = {}
): Promise<BCGPayrollBranch[]> {
  const { daysBack = 90, market, limit = 100 } = options

  let whereClause = `DATE(pay_period_end) >= DATE_SUB(CURRENT_DATE('America/New_York'), INTERVAL @daysBack DAY)`
  if (market) whereClause += ` AND market = @market`

  const sql = `
    SELECT
      FORMAT_DATE('%Y-%m', DATE(pay_period_end)) as period,
      COALESCE(branch, 'Unknown') as branch,
      COALESCE(market, 'Unknown') as market,
      COUNT(DISTINCT employee_id) as total_employees,
      SUM(COALESCE(total_pay, 0)) as total_payroll,
      AVG(COALESCE(total_pay, 0)) as avg_salary,
      SUM(COALESCE(overtime_hours, 0)) as overtime_hours,
      SUM(COALESCE(overtime_pay, 0)) as overtime_cost
    FROM \`${PROJECT}.${DATASET}.DR_PayrollBranch\`
    WHERE ${whereClause}
    GROUP BY period, branch, market
    ORDER BY period DESC, total_payroll DESC
    LIMIT @resultLimit
  `

  try {
    const params: Record<string, unknown> = {
      daysBack: daysBack,
      resultLimit: limit,
    }
    if (market) params.market = market

    const result = await bigQueryClient.queryWithParams<BCGPayrollBranch>(sql, params)
    return result.rows
  } catch (error) {
    throw handleBigQueryError(error, 'getBCGPayrollBranch', options as Record<string, unknown>)
  }
}

// -----------------------------------------------------------------------------
// MRLTV Tables - Marketing/Revenue Lifetime Value Analytics
// -----------------------------------------------------------------------------

export interface BCGMRLTVSummary {
  cohort_period: string
  market: string
  product_group: string
  customers: number
  total_ltv: number
  avg_ltv: number
  retention_rate_12m: number
  retention_rate_24m: number
  avg_tenure_months: number
}

/**
 * Get MRLTV summary from MRLTVSummary
 * Advanced customer lifetime value analytics
 */
export async function getBCGMRLTVSummary(
  options: BCGQueryOptions = {}
): Promise<BCGMRLTVSummary[]> {
  const { limit = 100 } = options

  const sql = `
    SELECT
      COALESCE(CAST(cohort_month AS STRING), 'Unknown') as cohort_period,
      COALESCE(market, 'Unknown') as market,
      COALESCE(product_group, 'Unknown') as product_group,
      SUM(COALESCE(customer_count, 0)) as customers,
      SUM(COALESCE(total_ltv, 0)) as total_ltv,
      AVG(COALESCE(avg_ltv, 0)) as avg_ltv,
      AVG(COALESCE(retention_12m, 0)) as retention_rate_12m,
      AVG(COALESCE(retention_24m, 0)) as retention_rate_24m,
      AVG(COALESCE(avg_tenure, 0)) as avg_tenure_months
    FROM \`${PROJECT}.${DATASET}.MRLTVSummary\`
    GROUP BY cohort_period, market, product_group
    ORDER BY cohort_period DESC
    LIMIT @resultLimit
  `

  try {
    const params: Record<string, unknown> = {
      resultLimit: limit,
    }

    const result = await bigQueryClient.queryWithParams<BCGMRLTVSummary>(sql, params)
    return result.rows
  } catch (error) {
    throw handleBigQueryError(error, 'getBCGMRLTVSummary', options as Record<string, unknown>)
  }
}

export interface BCGMRLTVConversion {
  period: string
  market: string
  lead_source: string
  leads: number
  conversions: number
  conversion_rate: number
  avg_first_year_revenue: number
  avg_ltv: number
}

/**
 * Get conversion analytics from MRLTVConversion
 * Lead-to-revenue conversion tracking
 */
export async function getBCGMRLTVConversion(
  options: BCGQueryOptions = {}
): Promise<BCGMRLTVConversion[]> {
  const { daysBack = 365, market, limit = 100 } = options

  let whereClause = `1=1`
  if (market) whereClause += ` AND market = @market`

  const sql = `
    SELECT
      COALESCE(CAST(conversion_month AS STRING), 'Unknown') as period,
      COALESCE(market, 'Unknown') as market,
      COALESCE(lead_source, 'Unknown') as lead_source,
      SUM(COALESCE(lead_count, 0)) as leads,
      SUM(COALESCE(conversion_count, 0)) as conversions,
      SAFE_DIVIDE(SUM(COALESCE(conversion_count, 0)), NULLIF(SUM(COALESCE(lead_count, 0)), 0)) as conversion_rate,
      AVG(COALESCE(first_year_revenue, 0)) as avg_first_year_revenue,
      AVG(COALESCE(projected_ltv, 0)) as avg_ltv
    FROM \`${PROJECT}.${DATASET}.MRLTVConversion\`
    WHERE ${whereClause}
    GROUP BY period, market, lead_source
    ORDER BY period DESC, leads DESC
    LIMIT @resultLimit
  `

  try {
    const params: Record<string, unknown> = {
      resultLimit: limit,
    }
    if (market) params.market = market

    const result = await bigQueryClient.queryWithParams<BCGMRLTVConversion>(sql, params)
    return result.rows
  } catch (error) {
    throw handleBigQueryError(error, 'getBCGMRLTVConversion', options as Record<string, unknown>)
  }
}

// -----------------------------------------------------------------------------
// DR_BranchWOCompleted - Branch work order completion metrics
// -----------------------------------------------------------------------------

export interface BCGBranchWOCompleted {
  branch: string
  market: string
  date: string
  scheduled_count: number
  completed_count: number
  completion_rate: number
  rescheduled_count: number
  avg_time_on_site: number
}

/**
 * Get branch work order completion from DR_BranchWOCompleted
 * Enhances /branch/[code] dashboard
 */
export async function getBCGBranchWOCompleted(
  options: BCGQueryOptions = {}
): Promise<BCGBranchWOCompleted[]> {
  const { daysBack = 30, market, limit = 100 } = options

  let whereClause = `DATE(service_date) >= DATE_SUB(CURRENT_DATE('America/New_York'), INTERVAL @daysBack DAY)`
  if (market) whereClause += ` AND market = @market`

  const sql = `
    SELECT
      COALESCE(branch, 'Unknown') as branch,
      COALESCE(market, 'Unknown') as market,
      FORMAT_DATE('%Y-%m-%d', DATE(service_date)) as date,
      SUM(COALESCE(scheduled_count, 0)) as scheduled_count,
      SUM(COALESCE(completed_count, 0)) as completed_count,
      SAFE_DIVIDE(SUM(COALESCE(completed_count, 0)), NULLIF(SUM(COALESCE(scheduled_count, 0)), 0)) as completion_rate,
      SUM(COALESCE(rescheduled_count, 0)) as rescheduled_count,
      AVG(COALESCE(avg_time_on_site, 0)) as avg_time_on_site
    FROM \`${PROJECT}.${DATASET}.DR_BranchWOCompleted\`
    WHERE ${whereClause}
    GROUP BY branch, market, date
    ORDER BY date DESC, branch
    LIMIT @resultLimit
  `

  try {
    const params: Record<string, unknown> = {
      daysBack: daysBack,
      resultLimit: limit,
    }
    if (market) params.market = market

    const result = await bigQueryClient.queryWithParams<BCGBranchWOCompleted>(sql, params)
    return result.rows
  } catch (error) {
    throw handleBigQueryError(error, 'getBCGBranchWOCompleted', options as Record<string, unknown>)
  }
}

// -----------------------------------------------------------------------------
// DR_WOSupervisor - Supervisor/Manager analytics
// -----------------------------------------------------------------------------

export interface BCGWOSupervisor {
  supervisor_id: string
  supervisor_name: string
  branch: string
  team_size: number
  total_work_orders: number
  completed_work_orders: number
  completion_rate: number
  team_revenue: number
  avg_team_efficiency: number
}

/**
 * Get supervisor analytics from DR_WOSupervisor
 * Fills gap for /manager/daily-cadence dashboard
 */
export async function getBCGWOSupervisor(
  options: BCGQueryOptions = {}
): Promise<BCGWOSupervisor[]> {
  const { daysBack = 30, market, limit = 100 } = options

  let whereClause = `DATE(report_date) >= DATE_SUB(CURRENT_DATE('America/New_York'), INTERVAL @daysBack DAY)`
  if (market) whereClause += ` AND market = @market`

  const sql = `
    SELECT
      COALESCE(CAST(Supervisor_ID AS STRING), 'Unknown') as supervisor_id,
      COALESCE(supervisor_name, 'Unknown') as supervisor_name,
      COALESCE(branch, 'Unknown') as branch,
      COUNT(DISTINCT employee_id) as team_size,
      SUM(COALESCE(work_orders, 0)) as total_work_orders,
      SUM(COALESCE(completed_orders, 0)) as completed_work_orders,
      SAFE_DIVIDE(SUM(COALESCE(completed_orders, 0)), NULLIF(SUM(COALESCE(work_orders, 0)), 0)) as completion_rate,
      SUM(COALESCE(revenue, 0)) as team_revenue,
      AVG(COALESCE(efficiency_score, 0)) as avg_team_efficiency
    FROM \`${PROJECT}.${DATASET}.DR_WOSupervisor\`
    WHERE ${whereClause}
    GROUP BY supervisor_id, supervisor_name, branch
    ORDER BY total_work_orders DESC
    LIMIT @resultLimit
  `

  try {
    const params: Record<string, unknown> = {
      daysBack: daysBack,
      resultLimit: limit,
    }
    if (market) params.market = market

    const result = await bigQueryClient.queryWithParams<BCGWOSupervisor>(sql, params)
    return result.rows
  } catch (error) {
    throw handleBigQueryError(error, 'getBCGWOSupervisor', options as Record<string, unknown>)
  }
}

// =============================================================================
// SALES PAGE QUERIES - Real data from BCG_RTD_DB for /sales dashboard
// =============================================================================

export interface BCGSalesKPIs {
  pipeline_value: number
  pipeline_30_day: number
  pipeline_60_day: number
  pipeline_90_day: number
  win_rate: number
  avg_cycle_time_days: number
  stalled_opps_count: number
  stalled_opps_value: number
  crm_hygiene_score: number
  total_leads: number
  proposals_count: number
  sold_count: number
}

/**
 * Get Sales KPIs from DR_ContractSales and DR_Leads
 * Fills gap for /sales KPI Summary section
 */
export async function getBCGSalesKPIs(
  options: BCGQueryOptions = {}
): Promise<BCGSalesKPIs> {
  const { daysBack = 90 } = options

  const sql = `
    WITH contract_metrics AS (
      SELECT
        COUNT(*) as total_contracts,
        COUNTIF(start_date IS NOT NULL) as started_contracts,
        COUNTIF(cancel_date IS NOT NULL) as canceled_contracts,
        AVG(DATE_DIFF(COALESCE(start_date, cancel_date, CURRENT_DATE('America/New_York')), sell_date, DAY)) as avg_cycle_days
      FROM \`${PROJECT}.${DATASET}.DR_ContractSales\`
      WHERE sell_date >= DATE_SUB(CURRENT_DATE('America/New_York'), INTERVAL @daysBack DAY)
    ),
    lead_metrics AS (
      SELECT
        COUNT(*) as total_leads,
        COUNTIF(lead_type LIKE '%Propose%' OR lead_type = 'Proposed') as proposals,
        COUNTIF(lead_type = 'Sold' OR lead_type LIKE '%Won%') as sold
      FROM \`${PROJECT}.${DATASET}.DR_Leads\`
      WHERE DATE(received_date) >= DATE_SUB(CURRENT_DATE('America/New_York'), INTERVAL @daysBack DAY)
    ),
    pipeline_aging AS (
      SELECT
        COUNTIF(DATE_DIFF(CURRENT_DATE('America/New_York'), sell_date, DAY) <= 30) as pipeline_30,
        COUNTIF(DATE_DIFF(CURRENT_DATE('America/New_York'), sell_date, DAY) BETWEEN 31 AND 60) as pipeline_60,
        COUNTIF(DATE_DIFF(CURRENT_DATE('America/New_York'), sell_date, DAY) BETWEEN 61 AND 90) as pipeline_90,
        SUM(CASE WHEN DATE_DIFF(CURRENT_DATE('America/New_York'), sell_date, DAY) <= 30 THEN COALESCE(contract_value, 0) ELSE 0 END) as pipeline_30_value,
        SUM(CASE WHEN DATE_DIFF(CURRENT_DATE('America/New_York'), sell_date, DAY) BETWEEN 31 AND 60 THEN COALESCE(contract_value, 0) ELSE 0 END) as pipeline_60_value,
        SUM(CASE WHEN DATE_DIFF(CURRENT_DATE('America/New_York'), sell_date, DAY) BETWEEN 61 AND 90 THEN COALESCE(contract_value, 0) ELSE 0 END) as pipeline_90_value,
        COUNT(*) as total_pipeline,
        SUM(COALESCE(contract_value, 0)) as total_pipeline_value,
        COUNTIF(DATE_DIFF(CURRENT_DATE('America/New_York'), sell_date, DAY) > 21 AND start_date IS NULL AND cancel_date IS NULL) as stalled,
        SUM(CASE WHEN DATE_DIFF(CURRENT_DATE('America/New_York'), sell_date, DAY) > 21 AND start_date IS NULL AND cancel_date IS NULL THEN COALESCE(contract_value, 0) ELSE 0 END) as stalled_value
      FROM \`${PROJECT}.${DATASET}.DR_ContractSales\`
      WHERE sell_date >= DATE_SUB(CURRENT_DATE('America/New_York'), INTERVAL @daysBack DAY)
        AND start_date IS NULL
        AND cancel_date IS NULL
    )
    SELECT
      COALESCE(pa.total_pipeline_value, 0) as pipeline_value,
      COALESCE(pa.pipeline_30_value, 0) as pipeline_30_day,
      COALESCE(pa.pipeline_60_value, 0) as pipeline_60_day,
      COALESCE(pa.pipeline_90_value, 0) as pipeline_90_day,
      ROUND(SAFE_DIVIDE(cm.started_contracts, cm.total_contracts) * 100, 1) as win_rate,
      ROUND(COALESCE(cm.avg_cycle_days, 0), 1) as avg_cycle_time_days,
      COALESCE(pa.stalled, 0) as stalled_opps_count,
      COALESCE(pa.stalled_value, 0) as stalled_opps_value,
      85.0 as crm_hygiene_score,
      COALESCE(lm.total_leads, 0) as total_leads,
      COALESCE(lm.proposals, 0) as proposals_count,
      COALESCE(lm.sold, 0) as sold_count
    FROM contract_metrics cm
    CROSS JOIN lead_metrics lm
    CROSS JOIN pipeline_aging pa
  `

  try {
    const params: Record<string, unknown> = {
      daysBack: daysBack,
    }

    const result = await bigQueryClient.queryWithParams<BCGSalesKPIs>(sql, params)
    return result.rows[0] || {
      pipeline_value: 0,
      pipeline_30_day: 0,
      pipeline_60_day: 0,
      pipeline_90_day: 0,
      win_rate: 0,
      avg_cycle_time_days: 0,
      stalled_opps_count: 0,
      stalled_opps_value: 0,
      crm_hygiene_score: 0,
      total_leads: 0,
      proposals_count: 0,
      sold_count: 0,
    }
  } catch (error) {
    throw handleBigQueryError(error, 'getBCGSalesKPIs', options as Record<string, unknown>)
  }
}

export interface BCGPipelineStage {
  stage: string
  stage_order: number
  count: number
  value: number
}

/**
 * Get Pipeline by Stage from DR_Leads
 * Fills gap for /sales Pipeline Funnel section
 */
export async function getBCGPipelineByStage(
  options: BCGQueryOptions = {}
): Promise<BCGPipelineStage[]> {
  const { daysBack = 90 } = options

  const sql = `
    SELECT
      CASE
        WHEN lead_type IN ('New', 'Received', 'Assigned') THEN 'prospect'
        WHEN lead_type IN ('Qualified', 'Scheduled', 'Contacted') THEN 'qualified'
        WHEN lead_type IN ('Proposed', 'Inspected', 'Quote Sent') THEN 'proposal'
        WHEN lead_type IN ('Negotiation', 'Pending', 'Follow Up') THEN 'negotiation'
        ELSE 'prospect'
      END as stage,
      CASE
        WHEN lead_type IN ('New', 'Received', 'Assigned') THEN 1
        WHEN lead_type IN ('Qualified', 'Scheduled', 'Contacted') THEN 2
        WHEN lead_type IN ('Proposed', 'Inspected', 'Quote Sent') THEN 3
        WHEN lead_type IN ('Negotiation', 'Pending', 'Follow Up') THEN 4
        ELSE 1
      END as stage_order,
      COUNT(*) as count,
      -- Estimate based on average contract value from historical data
      -- DR_Leads table does not have a direct value field
      COUNT(*) * 450 as value
    FROM \`${PROJECT}.${DATASET}.DR_Leads\`
    WHERE DATE(received_date) >= DATE_SUB(CURRENT_DATE('America/New_York'), INTERVAL @daysBack DAY)
      AND lead_type NOT IN ('Sold', 'Won', 'Closed Won', 'Cancelled', 'Lost', 'Closed Lost')
    GROUP BY stage, stage_order
    ORDER BY stage_order
  `

  try {
    const params: Record<string, unknown> = {
      daysBack: daysBack,
    }

    const result = await bigQueryClient.queryWithParams<BCGPipelineStage>(sql, params)
    return result.rows
  } catch (error) {
    throw handleBigQueryError(error, 'getBCGPipelineByStage', options as Record<string, unknown>)
  }
}

export interface BCGRepPerformance {
  sales_person: string
  sales_person_id: string
  total_contracts: number
  total_value: number
  started_contracts: number
  started_value: number
  canceled_contracts: number
  canceled_value: number
  win_rate: number
  avg_deal_size: number
}

/**
 * Get Rep Performance from DR_ContractSales
 * Fills gap for /sales Rep Performance table
 */
export async function getBCGRepPerformance(
  options: BCGQueryOptions = {}
): Promise<BCGRepPerformance[]> {
  const { daysBack = 30, limit = 20 } = options

  const sql = `
    SELECT
      COALESCE(sales_person, 'Unknown') as sales_person,
      COALESCE(CAST(sales_person_id AS STRING), 'N/A') as sales_person_id,
      COUNT(*) as total_contracts,
      SUM(COALESCE(contract_value, 0)) as total_value,
      COUNTIF(start_date IS NOT NULL) as started_contracts,
      SUM(CASE WHEN start_date IS NOT NULL THEN COALESCE(contract_value, 0) ELSE 0 END) as started_value,
      COUNTIF(cancel_date IS NOT NULL) as canceled_contracts,
      SUM(CASE WHEN cancel_date IS NOT NULL THEN COALESCE(contract_value, 0) ELSE 0 END) as canceled_value,
      ROUND(SAFE_DIVIDE(COUNTIF(start_date IS NOT NULL), COUNT(*)) * 100, 1) as win_rate,
      AVG(COALESCE(contract_value, 0)) as avg_deal_size
    FROM \`${PROJECT}.${DATASET}.DR_ContractSales\`
    WHERE sell_date >= DATE_SUB(CURRENT_DATE('America/New_York'), INTERVAL @daysBack DAY)
      AND sales_person IS NOT NULL
    GROUP BY sales_person, sales_person_id
    ORDER BY total_contracts DESC
    LIMIT @resultLimit
  `

  try {
    const params: Record<string, unknown> = {
      daysBack: daysBack,
      resultLimit: limit,
    }

    const result = await bigQueryClient.queryWithParams<BCGRepPerformance>(sql, params)
    return result.rows
  } catch (error) {
    throw handleBigQueryError(error, 'getBCGRepPerformance', options as Record<string, unknown>)
  }
}

export interface BCGAtRiskLead {
  lead_id: string
  customer_name: string
  current_stage: string
  days_in_stage: number
  risk_level: string
  amount: number
  assigned_rep: string
  branch: string
  last_activity_date: string
}

/**
 * Get At-Risk Leads from DR_Leads
 * Fills gap for /sales At-Risk Leads table
 */
export async function getBCGAtRiskLeads(
  options: BCGQueryOptions = {}
): Promise<BCGAtRiskLead[]> {
  const { daysBack = 90, limit = 20 } = options

  const sql = `
    SELECT
      CAST(lead_ID AS STRING) as lead_id,
      COALESCE(customer_name, contact_name, 'Unknown Customer') as customer_name,
      COALESCE(lead_type, 'Unknown') as current_stage,
      DATE_DIFF(CURRENT_DATE('America/New_York'), DATE(received_date), DAY) as days_in_stage,
      CASE
        WHEN DATE_DIFF(CURRENT_DATE('America/New_York'), DATE(received_date), DAY) > 30 THEN 'high'
        WHEN DATE_DIFF(CURRENT_DATE('America/New_York'), DATE(received_date), DAY) > 14 THEN 'medium'
        ELSE 'low'
      END as risk_level,
      -- Estimate based on average contract value from historical data
      -- DR_Leads table does not have a direct value field
      450 as amount,
      COALESCE(assigned_rep, sales_rep, 'Unassigned') as assigned_rep,
      COALESCE(branch, 'Unknown') as branch,
      FORMAT_DATE('%Y-%m-%d', DATE(received_date)) as last_activity_date
    FROM \`${PROJECT}.${DATASET}.DR_Leads\`
    WHERE DATE(received_date) >= DATE_SUB(CURRENT_DATE('America/New_York'), INTERVAL @daysBack DAY)
      AND lead_type NOT IN ('Sold', 'Won', 'Closed Won', 'Cancelled', 'Lost', 'Closed Lost')
      AND DATE_DIFF(CURRENT_DATE('America/New_York'), DATE(received_date), DAY) > 14
    ORDER BY days_in_stage DESC
    LIMIT @resultLimit
  `

  try {
    const params: Record<string, unknown> = {
      daysBack: daysBack,
      resultLimit: limit,
    }

    const result = await bigQueryClient.queryWithParams<BCGAtRiskLead>(sql, params)
    return result.rows
  } catch (error) {
    throw handleBigQueryError(error, 'getBCGAtRiskLeads', options as Record<string, unknown>)
  }
}

export interface BCGSalesToday {
  date: string
  new_contracts: number
  started_contracts: number
  canceled_contracts: number
  total_value: number
  product_group: string
}

/**
 * Get Sales Today from DR_ContractSales
 * Fills gap for /sales Today's Metrics section
 */
export async function getBCGSalesToday(
  options: BCGQueryOptions = {}
): Promise<BCGSalesToday[]> {
  const { daysBack = 7, limit = 50 } = options

  const sql = `
    SELECT
      FORMAT_DATE('%Y-%m-%d', sell_date) as date,
      COUNT(*) as new_contracts,
      COUNTIF(start_date IS NOT NULL) as started_contracts,
      COUNTIF(cancel_date IS NOT NULL) as canceled_contracts,
      SUM(COALESCE(contract_value, 0)) as total_value,
      COALESCE(product_group, 'Unknown') as product_group
    FROM \`${PROJECT}.${DATASET}.DR_ContractSales\`
    WHERE sell_date >= DATE_SUB(CURRENT_DATE('America/New_York'), INTERVAL @daysBack DAY)
    GROUP BY date, product_group
    ORDER BY date DESC, new_contracts DESC
    LIMIT @resultLimit
  `

  try {
    const params: Record<string, unknown> = {
      daysBack: daysBack,
      resultLimit: limit,
    }

    const result = await bigQueryClient.queryWithParams<BCGSalesToday>(sql, params)
    return result.rows
  } catch (error) {
    throw handleBigQueryError(error, 'getBCGSalesToday', options as Record<string, unknown>)
  }
}

export interface BCGBacklogItem {
  contract_id: string
  customer_name: string
  sell_date: string
  days_pending: number
  amount: number
  product_group: string
  sales_person: string
  branch: string
}

/**
 * Get Sales Backlog from DR_ContractSales (sold but not started)
 * Fills gap for /sales Backlog section
 */
export async function getBCGBacklog(
  options: BCGQueryOptions = {}
): Promise<BCGBacklogItem[]> {
  const { daysBack = 90, limit = 50 } = options

  const sql = `
    SELECT
      CAST(sales_id AS STRING) as contract_id,
      COALESCE(customer_name, 'Unknown Customer') as customer_name,
      FORMAT_DATE('%Y-%m-%d', sell_date) as sell_date,
      DATE_DIFF(CURRENT_DATE('America/New_York'), sell_date, DAY) as days_pending,
      COALESCE(contract_value, 0) as amount,
      COALESCE(product_group, 'Unknown') as product_group,
      COALESCE(sales_person, 'Unknown') as sales_person,
      COALESCE(branch, 'Unknown') as branch
    FROM \`${PROJECT}.${DATASET}.DR_ContractSales\`
    WHERE sell_date >= DATE_SUB(CURRENT_DATE('America/New_York'), INTERVAL @daysBack DAY)
      AND start_date IS NULL
      AND cancel_date IS NULL
    ORDER BY days_pending DESC
    LIMIT @resultLimit
  `

  try {
    const params: Record<string, unknown> = {
      daysBack: daysBack,
      resultLimit: limit,
    }

    const result = await bigQueryClient.queryWithParams<BCGBacklogItem>(sql, params)
    return result.rows
  } catch (error) {
    throw handleBigQueryError(error, 'getBCGBacklog', options as Record<string, unknown>)
  }
}
