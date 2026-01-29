/**
 * BigQuery Queries for Termite Module
 *
 * Production table (verified working):
 * - S0.raw_RNA_PNIDetails_Daily - PNI inspection details
 *   - market, region, branch, branchnumber
 *   - orderid, orderdate, ordertype, workdate
 *   - fname, lname, phone, email
 *   - setup_total, order_total, invoicebalance
 *   - locationcode, setupstartdate
 *
 * For renewals, we use W3_Contract_Checker.T0_unf_Contract_All with termite filtering
 *
 * Pages: /termite/pni, /termite/renewals
 */

import { bigQueryClient, BIGQUERY_CONFIG } from '../client'
import { handleBigQueryError } from '../error-handler'
import { validateOrgCode, validateNumeric, validateString } from '../validation'

// =============================================================================
// Types
// =============================================================================

export interface PNIInspection {
  branch_number: string
  branch_name: string
  inspection_count: number
  revenue: number
  unique_customers: number
}

export interface PNIDetail {
  customer_number: string
  customer_name: string
  first_name: string
  last_name: string
  branch_number: string
  branch_name: string
  market: string
  region: string
  service_line: string
  service_begin_date: string
  service_end_date: string
  order_date: string
  order_type: string
  ar_amount: number
  setup_total: number
  order_total: number
  renewal_month: number
  phone: string
  email: string
}

export interface TermiteRenewal {
  sales_agreement_number: number
  customer_number: string
  customer_name: string
  branch_number: string
  branch_name: string
  service_frequency: string
  autopay_flag: string
  renewal_month: number
  annual_service_count: number
  phone: string
  email: string
}

export interface RenewalSummary {
  total_renewals: number
  autopay_count: number
  autopay_pct: number
  by_frequency: { frequency: string; count: number }[]
}

// =============================================================================
// Query Options
// =============================================================================

export interface TermiteQueryOptions {
  daysBack?: number
  branch?: string
  renewalMonth?: number
  limit?: number
}

// =============================================================================
// Table Configuration
// =============================================================================

const PROJECT = BIGQUERY_CONFIG.projectId

// Primary PNI table
const PNI_DATASET = 'S0'
const PNI_TABLE = 'raw_RNA_PNIDetails_Daily'

// Contracts table for renewals (filter to termite-related products)
const CONTRACT_DATASET = 'W3_Contract_Checker'
const CONTRACT_TABLE = 'T0_unf_Contract_All'

/**
 * Get PNI (Paid Not Installed) summary by branch
 * Uses S0.raw_RNA_PNIDetails_Daily
 */
export async function getPNIByBranch(
  options: TermiteQueryOptions = {}
): Promise<PNIInspection[]> {
  const { daysBack = 30, limit = 50 } = options

  const sql = `
    SELECT
      COALESCE(branchnumber, '') as branch_number,
      COALESCE(branch, 'Unknown') as branch_name,
      COUNT(*) as inspection_count,
      COALESCE(SUM(order_total), 0) as revenue,
      COUNT(DISTINCT locationcode) as unique_customers
    FROM \`${PROJECT}.${PNI_DATASET}.${PNI_TABLE}\`
    WHERE DATE(orderdate) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${daysBack} DAY)
    GROUP BY branchnumber, branch
    ORDER BY inspection_count DESC
    LIMIT ${limit}
  `

  try {
    const result = await bigQueryClient.query<PNIInspection>(sql)
    return result.rows
  } catch (error) {
    console.error('[Termite] getPNIByBranch failed:', error)
    return []
  }
}

/**
 * Get PNI inspection details with FULL customer info
 * Uses S0.raw_RNA_PNIDetails_Daily - pulls all available real fields
 */
export async function getPNIDetails(
  options: TermiteQueryOptions = {}
): Promise<PNIDetail[]> {
  const { daysBack = 30, branch, limit = 100 } = options

  let whereClause = `DATE(orderdate) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${daysBack} DAY)`
  if (branch) whereClause += ` AND branchnumber = @branch`

  const sql = `
    SELECT
      CAST(locationcode AS STRING) as customer_number,
      TRIM(CONCAT(COALESCE(fname, ''), ' ', COALESCE(lname, ''))) as customer_name,
      COALESCE(fname, '') as first_name,
      COALESCE(lname, '') as last_name,
      COALESCE(branchnumber, '') as branch_number,
      COALESCE(branch, 'Unknown') as branch_name,
      COALESCE(market, '') as market,
      COALESCE(region, '') as region,
      COALESCE(description, 'Service') as service_line,
      FORMAT_DATE('%Y-%m-%d', DATE(setupstartdate)) as service_begin_date,
      COALESCE(FORMAT_DATE('%Y-%m-%d', DATE(workdate)), '') as service_end_date,
      FORMAT_DATE('%Y-%m-%d', DATE(orderdate)) as order_date,
      COALESCE(ordertype, 'Unknown') as order_type,
      COALESCE(invoicebalance, 0) as ar_amount,
      COALESCE(setup_total, 0) as setup_total,
      COALESCE(order_total, 0) as order_total,
      EXTRACT(MONTH FROM setupstartdate) as renewal_month,
      COALESCE(phone, '') as phone,
      COALESCE(email, '') as email
    FROM \`${PROJECT}.${PNI_DATASET}.${PNI_TABLE}\`
    WHERE ${whereClause}
    ORDER BY orderdate DESC
    LIMIT ${limit}
  `

  try {
    const params: Record<string, unknown> = {}
    if (branch) params.branch = branch

    const result = await bigQueryClient.queryWithParams<PNIDetail>(sql, params)
    return result.rows
  } catch (error) {
    console.error('[Termite] getPNIDetails failed:', error)
    return []
  }
}

/**
 * Get termite renewals
 * Uses W3_Contract_Checker.T0_unf_Contract_All with termite product filter
 */
export async function getTermiteRenewals(
  options: TermiteQueryOptions = {}
): Promise<TermiteRenewal[]> {
  const { renewalMonth, branch, limit = 100 } = options

  // Default to current month if not specified
  const month = renewalMonth || new Date().getMonth() + 1

  let whereClause = `
    EXTRACT(MONTH FROM StartDate) = ${month}
    AND (RawCancelInd IS NULL OR RawCancelInd = 'N')
    AND (ProductGroup LIKE '%Termite%' OR ServiceType_Description LIKE '%Termite%' OR LOB LIKE '%Termite%')
  `
  if (branch) whereClause += ` AND AssignedBranchCode = @branch`

  const sql = `
    SELECT
      COALESCE(CAST(Contract AS INT64), 0) as sales_agreement_number,
      COALESCE(salesID, '') as customer_number,
      COALESCE(customer_name, 'Customer') as customer_name,
      COALESCE(AssignedBranchCode, '') as branch_number,
      COALESCE(AssignedBranchCode, 'Unknown') as branch_name,
      COALESCE(ServiceType_Description, 'Annual') as service_frequency,
      CASE WHEN TAPInd = 'Y' THEN 'Y' ELSE 'N' END as autopay_flag,
      ${month} as renewal_month,
      1 as annual_service_count,
      COALESCE(customer_phone, '') as phone,
      COALESCE(customer_email, '') as email
    FROM \`${PROJECT}.${CONTRACT_DATASET}.${CONTRACT_TABLE}\`
    WHERE ${whereClause}
    ORDER BY Contract
    LIMIT ${limit}
  `

  try {
    const params: Record<string, unknown> = {}
    if (branch) params.branch = branch

    const result = await bigQueryClient.queryWithParams<TermiteRenewal>(sql, params)
    return result.rows
  } catch (error) {
    console.error('[Termite] getTermiteRenewals failed:', error)
    return []
  }
}

/**
 * Get termite renewal summary
 * Uses W3_Contract_Checker.T0_unf_Contract_All with termite product filter
 */
export async function getTermiteRenewalSummary(
  options: TermiteQueryOptions = {}
): Promise<RenewalSummary> {
  const { renewalMonth } = options

  // Default to current month if not specified
  const month = renewalMonth || new Date().getMonth() + 1

  const whereClause = `
    EXTRACT(MONTH FROM StartDate) = ${month}
    AND (RawCancelInd IS NULL OR RawCancelInd = 'N')
    AND (ProductGroup LIKE '%Termite%' OR ServiceType_Description LIKE '%Termite%' OR LOB LIKE '%Termite%')
  `

  const sql = `
    SELECT
      COUNT(*) as total_renewals,
      COUNTIF(TAPInd = 'Y') as autopay_count,
      SAFE_DIVIDE(COUNTIF(TAPInd = 'Y'), COUNT(*)) as autopay_pct
    FROM \`${PROJECT}.${CONTRACT_DATASET}.${CONTRACT_TABLE}\`
    WHERE ${whereClause}
  `

  const frequencySql = `
    SELECT
      COALESCE(ServiceType_Description, 'Annual') as frequency,
      COUNT(*) as count
    FROM \`${PROJECT}.${CONTRACT_DATASET}.${CONTRACT_TABLE}\`
    WHERE ${whereClause}
    GROUP BY ServiceType_Description
  `

  try {
    const [summaryResult, frequencyResult] = await Promise.all([
      bigQueryClient.query<{ total_renewals: number; autopay_count: number; autopay_pct: number }>(sql),
      bigQueryClient.query<{ frequency: string; count: number }>(frequencySql),
    ])

    const summary = summaryResult.rows[0] || { total_renewals: 0, autopay_count: 0, autopay_pct: 0 }

    return {
      total_renewals: summary.total_renewals,
      autopay_count: summary.autopay_count,
      autopay_pct: summary.autopay_pct || 0,
      by_frequency: frequencyResult.rows,
    }
  } catch (error) {
    console.error('[Termite] getTermiteRenewalSummary failed:', error)
    return {
      total_renewals: 0,
      autopay_count: 0,
      autopay_pct: 0,
      by_frequency: [],
    }
  }
}
