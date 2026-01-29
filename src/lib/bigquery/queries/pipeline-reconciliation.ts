/**
 * Pipeline Reconciliation Queries
 *
 * Cross-references Salesforce Quotes, Sales Tracker, and Start Log
 * to validate complete pipeline: Quote → Sale → Start
 *
 * Identifies:
 * - Sold quotes not in sales tracker (data quality issue)
 * - Sales not yet started (backlog/speed to install metric)
 * - Start log entries without originating quotes (orphaned data)
 * - Timeline anomalies (out-of-order dates, missing steps)
 */

import { bigQueryClient, BIGQUERY_CONFIG } from '../client'
import { validateNumeric, validateString } from '../validation'

const PROJECT = BIGQUERY_CONFIG.projectId

export interface PipelineReconciliationOptions {
  salesPerson?: string
  daysBack?: number
  branch?: string
  market?: string
  region?: string
}

// =============================================================================
// Sold Quotes Not in Sales Tracker
// =============================================================================

export interface SoldQuoteNotInTracker {
  quote_id: string
  quote_name: string
  account_name: string
  owner_name: string
  date_of_sale: string
  total_amount: number
  days_since_sale: number
  servicing_branch: string
}

/**
 * Find quotes marked as sold in Salesforce but missing from sales tracker
 * Indicates data quality issue or delayed entry
 */
export async function getSoldQuotesNotInTracker(
  options: PipelineReconciliationOptions = {}
): Promise<SoldQuoteNotInTracker[]> {
  const { salesPerson, daysBack = 90 } = options

  if (salesPerson) validateString(salesPerson, 'salesPerson', 100)
  if (daysBack) validateNumeric(daysBack, 'daysBack', 1, 365)

  const sql = `
    WITH sold_quotes AS (
      SELECT
        q.Id as quote_id,
        q.Name as quote_name,
        COALESCE(a.Name, '') as account_name,
        COALESCE(e.Name, '') as owner_name,
        DATE(q.Date_of_Sale__c) as date_of_sale,
        COALESCE(q.TotalPrice, 0) as total_amount,
        DATE_DIFF(CURRENT_DATE(), DATE(q.Date_of_Sale__c), DAY) as days_since_sale,
        COALESCE(q.Servicing_Branch__c, '') as servicing_branch
      FROM \`${PROJECT}.S0.Raw_RTXSF_Quote_Daily\` q
      LEFT JOIN \`${PROJECT}.S0.Raw_RTXSF_Opportunity_Daily\` o ON q.OpportunityId = o.Id
      LEFT JOIN \`${PROJECT}.S0.Raw_RTXSF_Account_Daily\` a ON o.AccountId = a.Id
      LEFT JOIN \`${PROJECT}.S0.Raw_RTXSF_Employee__c_Daily\` e ON q.OwnerId = e.User__c
      WHERE q.Date_of_Sale__c IS NOT NULL
        AND q.Date_of_Sale__c >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @daysBack DAY)
        ${salesPerson ? 'AND LOWER(e.Name) LIKE LOWER(CONCAT("%", @salesPerson, "%"))' : ''}
    )
    SELECT
      sq.*
    FROM sold_quotes sq
    LEFT JOIN \`${PROJECT}.W3_Contract_Checker.T0_unf_Contract_All\` c
      ON sq.quote_id = c.SalesForceQuoteId
    WHERE c.SalesForceQuoteId IS NULL
    ORDER BY sq.days_since_sale DESC
  `

  try {
    const params: Record<string, unknown> = { daysBack }
    if (salesPerson) params.salesPerson = salesPerson

    const result = await bigQueryClient.queryWithParams<SoldQuoteNotInTracker>(sql, params)
    return result.rows
  } catch (error) {
    console.error('[PipelineReconciliation] getSoldQuotesNotInTracker failed:', error)
    return []
  }
}

// =============================================================================
// Sales Not Yet Started (Backlog)
// =============================================================================

export interface SaleNotStarted {
  contract_id: string
  account_name: string
  sales_person: string
  sale_date: string
  contract_value: number
  days_since_sale: number
  expected_start_date: string | null
  is_overdue: boolean
  servicing_branch: string
  quote_id: string | null
}

/**
 * Find contracts in sales tracker that haven't started yet
 * Measures speed-to-install and identifies backlog
 */
export async function getSalesNotYetStarted(
  options: PipelineReconciliationOptions = {}
): Promise<SaleNotStarted[]> {
  const { salesPerson, daysBack = 90 } = options

  if (salesPerson) validateString(salesPerson, 'salesPerson', 100)
  if (daysBack) validateNumeric(daysBack, 'daysBack', 1, 365)

  const sql = `
    WITH contracts AS (
      SELECT
        c.ContractID as contract_id,
        c.BillToName as account_name,
        c.Salesperson1 as sales_person,
        DATE(c.SaleDate) as sale_date,
        COALESCE(c.AnnualAgreementValue, 0) as contract_value,
        DATE_DIFF(CURRENT_DATE(), DATE(c.SaleDate), DAY) as days_since_sale,
        DATE(c.ExpectedStartDate) as expected_start_date,
        CASE
          WHEN DATE(c.ExpectedStartDate) < CURRENT_DATE() THEN true
          ELSE false
        END as is_overdue,
        c.BranchId as servicing_branch,
        c.SalesForceQuoteId as quote_id
      FROM \`${PROJECT}.W3_Contract_Checker.T0_unf_Contract_All\` c
      WHERE c.SaleDate >= DATE_SUB(CURRENT_DATE(), INTERVAL @daysBack DAY)
        AND c.SaleDate IS NOT NULL
        ${salesPerson ? 'AND LOWER(c.Salesperson1) LIKE LOWER(CONCAT("%", @salesPerson, "%"))' : ''}
    )
    SELECT
      co.*
    FROM contracts co
    LEFT JOIN \`${PROJECT}.supabase.new_start_ops_data\` ns
      ON co.contract_id = ns.contract_id
    WHERE ns.contract_id IS NULL
    ORDER BY co.days_since_sale DESC
  `

  try {
    const params: Record<string, unknown> = { daysBack }
    if (salesPerson) params.salesPerson = salesPerson

    const result = await bigQueryClient.queryWithParams<SaleNotStarted>(sql, params)
    return result.rows
  } catch (error) {
    console.error('[PipelineReconciliation] getSalesNotYetStarted failed:', error)
    return []
  }
}

// =============================================================================
// Start Log Entries Without Quote
// =============================================================================

export interface StartWithoutQuote {
  start_id: string
  account_name: string
  sales_person: string
  start_date: string
  contract_value: number
  servicing_branch: string
  has_contract: boolean
  data_source: string
}

/**
 * Find service starts in start log with no originating quote
 * Indicates manual entries, legacy data, or missing Salesforce tracking
 */
export async function getStartsWithoutQuote(
  options: PipelineReconciliationOptions = {}
): Promise<StartWithoutQuote[]> {
  const { salesPerson, daysBack = 90 } = options

  if (salesPerson) validateString(salesPerson, 'salesPerson', 100)
  if (daysBack) validateNumeric(daysBack, 'daysBack', 1, 365)

  const sql = `
    WITH starts AS (
      SELECT
        ns.id as start_id,
        ns.account_name,
        ns.sales_person,
        DATE(ns.start_date) as start_date,
        COALESCE(ns.contract_value, 0) as contract_value,
        ns.servicing_branch,
        CASE
          WHEN ns.contract_id IS NOT NULL THEN true
          ELSE false
        END as has_contract,
        'Start Log' as data_source
      FROM \`${PROJECT}.supabase.new_start_ops_data\` ns
      WHERE ns.start_date >= DATE_SUB(CURRENT_DATE(), INTERVAL @daysBack DAY)
        ${salesPerson ? 'AND LOWER(ns.sales_person) LIKE LOWER(CONCAT("%", @salesPerson, "%"))' : ''}
    )
    SELECT
      s.*
    FROM starts s
    LEFT JOIN \`${PROJECT}.W3_Contract_Checker.T0_unf_Contract_All\` c
      ON s.start_id = c.ContractID
    LEFT JOIN \`${PROJECT}.S0.Raw_RTXSF_Quote_Daily\` q
      ON c.SalesForceQuoteId = q.Id
    WHERE q.Id IS NULL
    ORDER BY s.start_date DESC
  `

  try {
    const params: Record<string, unknown> = { daysBack }
    if (salesPerson) params.salesPerson = salesPerson

    const result = await bigQueryClient.queryWithParams<StartWithoutQuote>(sql, params)
    return result.rows
  } catch (error) {
    console.error('[PipelineReconciliation] getStartsWithoutQuote failed:', error)
    return []
  }
}

// =============================================================================
// Complete Pipeline with Timeline
// =============================================================================

export interface CompletePipelineTimeline {
  quote_id: string
  quote_name: string
  account_name: string
  owner_name: string
  // Dates
  proposal_date: string | null
  sale_date: string | null
  start_date: string | null
  // Days between stages
  days_proposal_to_sale: number | null
  days_sale_to_start: number | null
  days_proposal_to_start: number | null
  // Amounts
  quote_amount: number
  contract_amount: number | null
  variance_amount: number | null
  variance_percent: number | null
  // Flags
  has_quote: boolean
  has_sale: boolean
  has_start: boolean
  is_complete_pipeline: boolean
  has_timeline_anomaly: boolean
  anomaly_description: string | null
}

/**
 * Get complete pipeline timeline for all quotes with validation
 * Shows full journey from quote → sale → start with timing and anomalies
 */
export async function getCompletePipelineTimeline(
  options: PipelineReconciliationOptions = {}
): Promise<CompletePipelineTimeline[]> {
  const { salesPerson, daysBack = 90 } = options

  if (salesPerson) validateString(salesPerson, 'salesPerson', 100)
  if (daysBack) validateNumeric(daysBack, 'daysBack', 1, 365)

  const sql = `
    WITH quotes AS (
      SELECT
        q.Id as quote_id,
        q.Name as quote_name,
        COALESCE(a.Name, '') as account_name,
        COALESCE(e.Name, '') as owner_name,
        DATE(q.CreatedDate) as proposal_date,
        DATE(q.Date_of_Sale__c) as sale_date,
        COALESCE(q.TotalPrice, 0) as quote_amount,
        q.SalesForceQuoteId as sf_quote_id
      FROM \`${PROJECT}.S0.Raw_RTXSF_Quote_Daily\` q
      LEFT JOIN \`${PROJECT}.S0.Raw_RTXSF_Opportunity_Daily\` o ON q.OpportunityId = o.Id
      LEFT JOIN \`${PROJECT}.S0.Raw_RTXSF_Account_Daily\` a ON o.AccountId = a.Id
      LEFT JOIN \`${PROJECT}.S0.Raw_RTXSF_Employee__c_Daily\` e ON q.OwnerId = e.User__c
      WHERE q.CreatedDate >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @daysBack DAY)
        ${salesPerson ? 'AND LOWER(e.Name) LIKE LOWER(CONCAT("%", @salesPerson, "%"))' : ''}
    ),
    contracts AS (
      SELECT
        c.SalesForceQuoteId as quote_id,
        DATE(c.SaleDate) as contract_sale_date,
        COALESCE(c.AnnualAgreementValue, 0) as contract_amount,
        c.ContractID as contract_id
      FROM \`${PROJECT}.W3_Contract_Checker.T0_unf_Contract_All\` c
    ),
    starts AS (
      SELECT
        c.SalesForceQuoteId as quote_id,
        DATE(ns.start_date) as start_date
      FROM \`${PROJECT}.supabase.new_start_ops_data\` ns
      JOIN \`${PROJECT}.W3_Contract_Checker.T0_unf_Contract_All\` c
        ON ns.contract_id = c.ContractID
    )
    SELECT
      q.quote_id,
      q.quote_name,
      q.account_name,
      q.owner_name,
      q.proposal_date,
      COALESCE(q.sale_date, c.contract_sale_date) as sale_date,
      s.start_date,
      -- Timeline calculations
      DATE_DIFF(COALESCE(q.sale_date, c.contract_sale_date), q.proposal_date, DAY) as days_proposal_to_sale,
      DATE_DIFF(s.start_date, COALESCE(q.sale_date, c.contract_sale_date), DAY) as days_sale_to_start,
      DATE_DIFF(s.start_date, q.proposal_date, DAY) as days_proposal_to_start,
      -- Amounts
      q.quote_amount,
      c.contract_amount,
      (c.contract_amount - q.quote_amount) as variance_amount,
      CASE
        WHEN q.quote_amount > 0 THEN ((c.contract_amount - q.quote_amount) / q.quote_amount) * 100
        ELSE NULL
      END as variance_percent,
      -- Status flags
      true as has_quote,
      CASE WHEN c.quote_id IS NOT NULL THEN true ELSE false END as has_sale,
      CASE WHEN s.quote_id IS NOT NULL THEN true ELSE false END as has_start,
      CASE
        WHEN c.quote_id IS NOT NULL AND s.quote_id IS NOT NULL THEN true
        ELSE false
      END as is_complete_pipeline,
      -- Anomaly detection
      CASE
        WHEN q.sale_date < q.proposal_date THEN true
        WHEN s.start_date < COALESCE(q.sale_date, c.contract_sale_date) THEN true
        WHEN ABS(c.contract_amount - q.quote_amount) > (q.quote_amount * 0.1) THEN true
        ELSE false
      END as has_timeline_anomaly,
      CASE
        WHEN q.sale_date < q.proposal_date THEN 'Sale date before proposal date'
        WHEN s.start_date < COALESCE(q.sale_date, c.contract_sale_date) THEN 'Start date before sale date'
        WHEN ABS(c.contract_amount - q.quote_amount) > (q.quote_amount * 0.1) THEN 'Contract amount >10% different from quote'
        ELSE NULL
      END as anomaly_description
    FROM quotes q
    LEFT JOIN contracts c ON q.quote_id = c.quote_id
    LEFT JOIN starts s ON q.quote_id = s.quote_id
    ORDER BY q.proposal_date DESC
  `

  try {
    const params: Record<string, unknown> = { daysBack }
    if (salesPerson) params.salesPerson = salesPerson

    const result = await bigQueryClient.queryWithParams<CompletePipelineTimeline>(sql, params)
    return result.rows
  } catch (error) {
    console.error('[PipelineReconciliation] getCompletePipelineTimeline failed:', error)
    return []
  }
}

// =============================================================================
// Pipeline Health Summary
// =============================================================================

export interface PipelineHealthSummary {
  total_quotes: number
  quotes_sold: number
  quotes_not_in_tracker: number
  sales_not_started: number
  sales_overdue_start: number
  starts_without_quote: number
  complete_pipelines: number
  timeline_anomalies: number
  conversion_rate_quote_to_sale: number
  conversion_rate_sale_to_start: number
  avg_days_proposal_to_sale: number
  avg_days_sale_to_start: number
  avg_days_proposal_to_start: number
  data_quality_score: number
}

/**
 * Get overall pipeline health metrics and data quality score
 */
export async function getPipelineHealthSummary(
  options: PipelineReconciliationOptions = {}
): Promise<PipelineHealthSummary | null> {
  const { salesPerson, daysBack = 90 } = options

  if (salesPerson) validateString(salesPerson, 'salesPerson', 100)
  if (daysBack) validateNumeric(daysBack, 'daysBack', 1, 365)

  const sql = `
    WITH pipeline_data AS (
      SELECT
        q.Id as quote_id,
        q.Date_of_Sale__c as sale_date,
        c.ContractID as contract_id,
        c.SaleDate as contract_sale_date,
        ns.id as start_id,
        ns.start_date as start_date,
        DATE_DIFF(DATE(c.SaleDate), DATE(q.CreatedDate), DAY) as days_to_sale,
        DATE_DIFF(DATE(ns.start_date), DATE(c.SaleDate), DAY) as days_to_start,
        DATE_DIFF(DATE(ns.start_date), DATE(q.CreatedDate), DAY) as days_total,
        CASE WHEN q.Date_of_Sale__c < q.CreatedDate THEN 1 ELSE 0 END as has_anomaly
      FROM \`${PROJECT}.S0.Raw_RTXSF_Quote_Daily\` q
      LEFT JOIN \`${PROJECT}.S0.Raw_RTXSF_Employee__c_Daily\` e ON q.OwnerId = e.User__c
      LEFT JOIN \`${PROJECT}.W3_Contract_Checker.T0_unf_Contract_All\` c
        ON q.Id = c.SalesForceQuoteId
      LEFT JOIN \`${PROJECT}.supabase.new_start_ops_data\` ns
        ON c.ContractID = ns.contract_id
      WHERE q.CreatedDate >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @daysBack DAY)
        ${salesPerson ? 'AND LOWER(e.Name) LIKE LOWER(CONCAT("%", @salesPerson, "%"))' : ''}
    )
    SELECT
      COUNT(DISTINCT quote_id) as total_quotes,
      COUNT(DISTINCT CASE WHEN sale_date IS NOT NULL THEN quote_id END) as quotes_sold,
      COUNT(DISTINCT CASE WHEN sale_date IS NOT NULL AND contract_id IS NULL THEN quote_id END) as quotes_not_in_tracker,
      COUNT(DISTINCT CASE WHEN contract_id IS NOT NULL AND start_id IS NULL THEN contract_id END) as sales_not_started,
      COUNT(DISTINCT CASE WHEN contract_id IS NOT NULL AND start_id IS NULL AND contract_sale_date < DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY) THEN contract_id END) as sales_overdue_start,
      COUNT(DISTINCT CASE WHEN start_id IS NOT NULL AND quote_id IS NULL THEN start_id END) as starts_without_quote,
      COUNT(DISTINCT CASE WHEN quote_id IS NOT NULL AND contract_id IS NOT NULL AND start_id IS NOT NULL THEN quote_id END) as complete_pipelines,
      SUM(has_anomaly) as timeline_anomalies,
      -- Conversion rates
      SAFE_DIVIDE(COUNT(DISTINCT CASE WHEN sale_date IS NOT NULL THEN quote_id END), COUNT(DISTINCT quote_id)) * 100 as conversion_rate_quote_to_sale,
      SAFE_DIVIDE(COUNT(DISTINCT CASE WHEN start_id IS NOT NULL THEN contract_id END), COUNT(DISTINCT contract_id)) * 100 as conversion_rate_sale_to_start,
      -- Average timelines
      AVG(CASE WHEN days_to_sale > 0 AND days_to_sale < 365 THEN days_to_sale END) as avg_days_proposal_to_sale,
      AVG(CASE WHEN days_to_start > 0 AND days_to_start < 180 THEN days_to_start END) as avg_days_sale_to_start,
      AVG(CASE WHEN days_total > 0 AND days_total < 365 THEN days_total END) as avg_days_proposal_to_start,
      -- Data quality score (100 - penalties for issues)
      100 - (
        (SAFE_DIVIDE(COUNT(DISTINCT CASE WHEN sale_date IS NOT NULL AND contract_id IS NULL THEN quote_id END), COUNT(DISTINCT quote_id)) * 30) +
        (SAFE_DIVIDE(COUNT(DISTINCT CASE WHEN start_id IS NOT NULL AND quote_id IS NULL THEN start_id END), COUNT(DISTINCT start_id)) * 30) +
        (SAFE_DIVIDE(SUM(has_anomaly), COUNT(*)) * 40)
      ) as data_quality_score
    FROM pipeline_data
  `

  try {
    const params: Record<string, unknown> = { daysBack }
    if (salesPerson) params.salesPerson = salesPerson

    const result = await bigQueryClient.queryWithParams<PipelineHealthSummary>(sql, params)
    return result.rows[0] || null
  } catch (error) {
    console.error('[PipelineReconciliation] getPipelineHealthSummary failed:', error)
    return null
  }
}
