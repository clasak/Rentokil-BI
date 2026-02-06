/**
 * BigQuery Queries for Sales Pipeline Module
 *
 * Production tables:
 * - S4.Fact_Leads_Acc_Daily_Dtls_Snp (lead stages/pipeline)
 * - S4.Fact_ContractSales_Txn_Na_Daily_Dtl_Vw (rep sales performance)
 * - S4.Fact_RTX_Employees_Latest (employee details)
 *
 * Pages: /sales (pipeline, rep coaching panel, at-risk opportunities)
 */

import { bigQueryClient, BIGQUERY_CONFIG } from '../client'
import { handleBigQueryError } from '../error-handler'
import { validateOrgCode, validateNumeric, validateString } from '../validation'

// =============================================================================
// Input Validation Helpers (SQL Injection Prevention)
// =============================================================================

/**
 * Validate and sanitize organization code (market/region/branch)
 * Only allows alphanumeric characters, underscores, and hyphens
 * Returns undefined if invalid to safely skip the filter
 */
function sanitizeOrgCode(code: string | undefined): string | undefined {
  if (!code) return undefined
  // Only allow alphanumeric, underscore, hyphen (common in org codes)
  const sanitized = String(code).trim()
  if (!/^[a-zA-Z0-9_-]+$/.test(sanitized)) {
    console.warn(`[SalesPipeline] Invalid org code rejected: "${code}"`)
    return undefined
  }
  // Limit length to prevent abuse
  if (sanitized.length > 50) {
    console.warn(`[SalesPipeline] Org code too long, rejected: "${code}"`)
    return undefined
  }
  return sanitized
}

/**
 * Validate numeric parameter (daysBack, limit)
 * Returns safe default if invalid
 */
function sanitizeNumeric(value: number | undefined, defaultValue: number, min: number, max: number): number {
  if (value === undefined || value === null) return defaultValue
  const num = Number(value)
  if (!Number.isFinite(num) || !Number.isInteger(num)) return defaultValue
  return Math.max(min, Math.min(max, num))
}

// =============================================================================
// Types
// =============================================================================

export interface PipelineByStage {
  stage: string
  stage_order: number
  count: number
  value: number
}

export interface RepPerformance {
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

export interface AtRiskLead {
  lead_id: string
  customer_name: string
  current_stage: string
  days_in_stage: number
  risk_level: 'high' | 'medium' | 'low'
  amount: number
  assigned_rep: string
  branch: string
  last_activity_date: string
}

export interface SalesPipelineSummary {
  total_pipeline_value: number
  total_pipeline_count: number
  stalled_count: number
  stalled_value: number
  avg_days_in_pipeline: number
}

export interface SalesKPIs {
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

export interface TopOpportunity {
  id: string
  name: string
  accountName: string
  stage: string
  amount: number
  probability: number
  assigned_rep: string
  branch: string
  received_date: string
}

export interface OpportunityDetail {
  id: string
  name: string
  accountName: string
  accountId: string
  stage: string
  amount: number
  probability: number
  createdDate: string
  closeDate: string
  daysInStage: number
  isStalled: boolean
  nextStep: string
  nextStepDate: string | null
  ownerName: string
  ownerId: string
  lostReason: string | null
}

// =============================================================================
// Query Options
// =============================================================================

export interface SalesPipelineQueryOptions {
  daysBack?: number
  market?: string
  marketCode?: string  // Alternative name
  region?: string
  regionCode?: string  // Alternative name
  branch?: string
  branchCode?: string  // Alternative name
  limit?: number
}

// =============================================================================
// Table Configuration
// =============================================================================

const PROJECT = BIGQUERY_CONFIG.projectId

/**
 * Result type for parameterized filter builders
 */
interface OrgFilterResult {
  clause: string
  params: Record<string, string>
}

/**
 * Build WHERE clause for market/region/branch filters (leads table)
 * Returns both the SQL clause fragment and the parameter values for parameterized queries
 */
function buildLeadsOrgFilterClause(options: SalesPipelineQueryOptions): OrgFilterResult {
  const clauses: string[] = []
  const params: Record<string, string> = {}

  // Sanitize all inputs to prevent SQL injection
  const marketCode = sanitizeOrgCode(options.marketCode || options.market)
  const regionCode = sanitizeOrgCode(options.regionCode || options.region)
  const branchCode = sanitizeOrgCode(options.branchCode || options.branch)

  // Leads table uses report_branch, report_market, report_region
  if (marketCode) {
    clauses.push(`report_market = @marketCode`)
    params.marketCode = marketCode
  }
  if (regionCode) {
    clauses.push(`report_region = @regionCode`)
    params.regionCode = regionCode
  }
  if (branchCode) {
    clauses.push(`CAST(report_branch AS STRING) = @branchCode`)
    params.branchCode = branchCode
  }

  return {
    clause: clauses.length > 0 ? clauses.join(' AND ') : '',
    params
  }
}

/**
 * Build WHERE clause for contract sales table
 * Returns both the SQL clause fragment and the parameter values for parameterized queries
 */
function buildContractOrgFilterClause(options: SalesPipelineQueryOptions): OrgFilterResult {
  const clauses: string[] = []
  const params: Record<string, string> = {}

  // Sanitize all inputs to prevent SQL injection
  const marketCode = sanitizeOrgCode(options.marketCode || options.market)
  const regionCode = sanitizeOrgCode(options.regionCode || options.region)
  const branchCode = sanitizeOrgCode(options.branchCode || options.branch)

  if (marketCode) {
    clauses.push(`MarketCode = @marketCode`)
    params.marketCode = marketCode
  }
  if (regionCode) {
    clauses.push(`RegionCode = @regionCode`)
    params.regionCode = regionCode
  }
  if (branchCode) {
    clauses.push(`AssignedBranchCode = @branchCode`)
    params.branchCode = branchCode
  }

  return {
    clause: clauses.length > 0 ? clauses.join(' AND ') : '',
    params
  }
}
const DATASET = 'S4'
const LEADS_TABLE = 'Fact_Leads_Acc_Daily_Dtls_Snp'
const CONTRACT_SALES_TABLE = 'Fact_ContractSales_Txn_Na_Daily_Dtl_Vw'

/**
 * Get pipeline breakdown by stage
 * Uses lead stage dates to determine current stage
 */
export async function getPipelineByStage(
  options: SalesPipelineQueryOptions = {}
): Promise<PipelineByStage[]> {
  // Sanitize numeric input
  const safeDaysBack = sanitizeNumeric(options.daysBack, 90, 1, 365)
  const orgFilter = buildLeadsOrgFilterClause(options)

  const params: Record<string, unknown> = {
    ...orgFilter.params,
    daysBack: safeDaysBack
  }

  let whereClause = `DATE(received_date) >= DATE_SUB(CURRENT_DATE('America/New_York'), INTERVAL @daysBack DAY)`
  // Only include active leads (not sold or canceled)
  whereClause += ` AND sold_date IS NULL AND cancel_date IS NULL`
  if (orgFilter.clause) whereClause += ` AND ${orgFilter.clause}`

  const sql = `
    WITH staged_leads AS (
      SELECT
        tmx_lead_sid,
        COALESCE(proposal_contract_amount, 0) as amount,
        CASE
          WHEN proposed_date IS NOT NULL THEN 'negotiation'
          WHEN inspected_date IS NOT NULL THEN 'proposal'
          WHEN scheduled_date IS NOT NULL THEN 'qualified'
          ELSE 'prospect'
        END as current_stage
      FROM \`${PROJECT}.${DATASET}.${LEADS_TABLE}\`
      WHERE ${whereClause}
    )
    SELECT
      current_stage as stage,
      CASE current_stage
        WHEN 'prospect' THEN 1
        WHEN 'qualified' THEN 2
        WHEN 'proposal' THEN 3
        WHEN 'negotiation' THEN 4
      END as stage_order,
      COUNT(*) as count,
      COALESCE(SUM(amount), 0) as value
    FROM staged_leads
    GROUP BY current_stage
    ORDER BY stage_order
  `

  try {
    const result = await bigQueryClient.queryWithParams<PipelineByStage>(sql, params)
    return result.rows
  } catch (error) {
    console.error('[SalesPipeline] getPipelineByStage failed:', error)
    return []
  }
}

/**
 * Get rep performance metrics
 * Aggregates contract sales by salesperson
 */
export async function getRepPerformance(
  options: SalesPipelineQueryOptions = {}
): Promise<RepPerformance[]> {
  // Sanitize numeric inputs
  const safeDaysBack = sanitizeNumeric(options.daysBack, 30, 1, 365)
  const safeLimit = sanitizeNumeric(options.limit, 20, 1, 100)
  const orgFilter = buildContractOrgFilterClause(options)

  const params: Record<string, unknown> = {
    ...orgFilter.params,
    daysBack: safeDaysBack,
    resultLimit: safeLimit
  }

  let whereClause = `SellDate >= DATE_SUB(CURRENT_DATE('America/New_York'), INTERVAL @daysBack DAY)`
  if (orgFilter.clause) whereClause += ` AND ${orgFilter.clause}`

  const sql = `
    SELECT
      COALESCE(SalesPerson, 'Unknown') as sales_person,
      COALESCE(CAST(SalesPersonID AS STRING), 'N/A') as sales_person_id,
      COUNT(*) as total_contracts,
      COALESCE(SUM(ContractValue), 0) as total_value,
      COUNT(CASE WHEN StartedInd = 'Y' THEN 1 END) as started_contracts,
      COALESCE(SUM(CASE WHEN StartedInd = 'Y' THEN ContractValue END), 0) as started_value,
      COUNT(CASE WHEN RawCancelInd = 'Y' THEN 1 END) as canceled_contracts,
      COALESCE(SUM(CASE WHEN RawCancelInd = 'Y' THEN ContractValue END), 0) as canceled_value,
      SAFE_DIVIDE(
        COUNT(CASE WHEN StartedInd = 'Y' THEN 1 END),
        COUNT(*)
      ) as win_rate,
      SAFE_DIVIDE(
        COALESCE(SUM(ContractValue), 0),
        COUNT(*)
      ) as avg_deal_size
    FROM \`${PROJECT}.${DATASET}.${CONTRACT_SALES_TABLE}\`
    WHERE ${whereClause}
      AND SalesPerson IS NOT NULL
    GROUP BY SalesPerson, SalesPersonID
    ORDER BY total_value DESC
    LIMIT @resultLimit
  `

  try {
    const result = await bigQueryClient.queryWithParams<RepPerformance>(sql, params)
    return result.rows
  } catch (error) {
    console.error('[SalesPipeline] getRepPerformance failed:', error)
    return []
  }
}

/**
 * Get at-risk/stalled leads
 * Identifies leads that have been in a stage too long
 */
export async function getAtRiskLeads(
  options: SalesPipelineQueryOptions = {}
): Promise<AtRiskLead[]> {
  // Sanitize numeric inputs
  const safeDaysBack = sanitizeNumeric(options.daysBack, 90, 1, 365)
  const safeLimit = sanitizeNumeric(options.limit, 20, 1, 100)
  const orgFilter = buildLeadsOrgFilterClause(options)

  const params: Record<string, unknown> = {
    ...orgFilter.params,
    daysBack: safeDaysBack,
    resultLimit: safeLimit
  }

  let whereClause = `DATE(received_date) >= DATE_SUB(CURRENT_DATE('America/New_York'), INTERVAL @daysBack DAY)`
  // Only active leads
  whereClause += ` AND sold_date IS NULL AND cancel_date IS NULL`
  if (orgFilter.clause) whereClause += ` AND ${orgFilter.clause}`

  const sql = `
    WITH lead_stages AS (
      SELECT
        CAST(tmx_lead_sid AS STRING) as lead_id,
        COALESCE(contact_full_name, 'Unknown') as customer_name,
        CASE
          WHEN proposed_date IS NOT NULL THEN 'negotiation'
          WHEN inspected_date IS NOT NULL THEN 'proposal'
          WHEN scheduled_date IS NOT NULL THEN 'qualified'
          ELSE 'prospect'
        END as current_stage,
        CASE
          WHEN proposed_date IS NOT NULL THEN proposed_date
          WHEN inspected_date IS NOT NULL THEN inspected_date
          WHEN scheduled_date IS NOT NULL THEN scheduled_date
          ELSE received_date
        END as stage_entry_date,
        COALESCE(proposal_contract_amount, 0) as amount,
        COALESCE(assigned_sales_rep, 'Unassigned') as assigned_rep,
        CAST(report_branch AS STRING) as branch,
        GREATEST(
          COALESCE(proposed_date, DATE('1900-01-01')),
          COALESCE(inspected_date, DATE('1900-01-01')),
          COALESCE(scheduled_date, DATE('1900-01-01')),
          COALESCE(DATE(received_date), DATE('1900-01-01'))
        ) as last_activity_date
      FROM \`${PROJECT}.${DATASET}.${LEADS_TABLE}\`
      WHERE ${whereClause}
    )
    SELECT
      lead_id,
      customer_name,
      current_stage,
      DATE_DIFF(CURRENT_DATE('America/New_York'), DATE(stage_entry_date), DAY) as days_in_stage,
      CASE
        WHEN DATE_DIFF(CURRENT_DATE('America/New_York'), DATE(stage_entry_date), DAY) > 30 THEN 'high'
        WHEN DATE_DIFF(CURRENT_DATE('America/New_York'), DATE(stage_entry_date), DAY) > 14 THEN 'medium'
        ELSE 'low'
      END as risk_level,
      amount,
      assigned_rep,
      branch,
      FORMAT_DATE('%Y-%m-%d', last_activity_date) as last_activity_date
    FROM lead_stages
    WHERE DATE_DIFF(CURRENT_DATE('America/New_York'), DATE(stage_entry_date), DAY) > 14
    ORDER BY days_in_stage DESC, amount DESC
    LIMIT @resultLimit
  `

  try {
    const result = await bigQueryClient.queryWithParams<AtRiskLead>(sql, params)
    return result.rows
  } catch (error) {
    console.error('[SalesPipeline] getAtRiskLeads failed:', error)
    return []
  }
}

/**
 * Get sales pipeline summary
 * High-level metrics for the pipeline
 */
export async function getSalesPipelineSummary(
  options: SalesPipelineQueryOptions = {}
): Promise<SalesPipelineSummary> {
  // Sanitize numeric input
  const safeDaysBack = sanitizeNumeric(options.daysBack, 90, 1, 365)
  const orgFilter = buildLeadsOrgFilterClause(options)

  const params: Record<string, unknown> = {
    ...orgFilter.params,
    daysBack: safeDaysBack
  }

  let whereClause = `DATE(received_date) >= DATE_SUB(CURRENT_DATE('America/New_York'), INTERVAL @daysBack DAY)`
  // Only active leads
  whereClause += ` AND sold_date IS NULL AND cancel_date IS NULL`
  if (orgFilter.clause) whereClause += ` AND ${orgFilter.clause}`

  const sql = `
    WITH pipeline_leads AS (
      SELECT
        tmx_lead_sid,
        COALESCE(proposal_contract_amount, 0) as amount,
        CASE
          WHEN proposed_date IS NOT NULL THEN proposed_date
          WHEN inspected_date IS NOT NULL THEN inspected_date
          WHEN scheduled_date IS NOT NULL THEN scheduled_date
          ELSE received_date
        END as stage_entry_date,
        received_date
      FROM \`${PROJECT}.${DATASET}.${LEADS_TABLE}\`
      WHERE ${whereClause}
    )
    SELECT
      COALESCE(SUM(amount), 0) as total_pipeline_value,
      COUNT(*) as total_pipeline_count,
      COUNT(CASE WHEN DATE_DIFF(CURRENT_DATE('America/New_York'), DATE(stage_entry_date), DAY) > 21 THEN 1 END) as stalled_count,
      COALESCE(SUM(CASE WHEN DATE_DIFF(CURRENT_DATE('America/New_York'), DATE(stage_entry_date), DAY) > 21 THEN amount END), 0) as stalled_value,
      AVG(DATE_DIFF(CURRENT_DATE('America/New_York'), DATE(received_date), DAY)) as avg_days_in_pipeline
    FROM pipeline_leads
  `

  try {
    const result = await bigQueryClient.queryWithParams<SalesPipelineSummary>(sql, params)
    return result.rows[0] || {
      total_pipeline_value: 0,
      total_pipeline_count: 0,
      stalled_count: 0,
      stalled_value: 0,
      avg_days_in_pipeline: 0,
    }
  } catch (error) {
    console.error('[SalesPipeline] getSalesPipelineSummary failed:', error)
    return {
      total_pipeline_value: 0,
      total_pipeline_count: 0,
      stalled_count: 0,
      stalled_value: 0,
      avg_days_in_pipeline: 0,
    }
  }
}

/**
 * Get sales KPIs for the KPI Summary section
 * Calculates pipeline, win rate, cycle time, stalled opps, and CRM hygiene
 */
export async function getSalesKPIs(
  options: SalesPipelineQueryOptions = {}
): Promise<SalesKPIs> {
  // Sanitize numeric input
  const safeDaysBack = sanitizeNumeric(options.daysBack, 90, 1, 365)
  const orgFilter = buildLeadsOrgFilterClause(options)

  const params: Record<string, unknown> = {
    ...orgFilter.params,
    daysBack: safeDaysBack
  }

  let whereClause = `DATE(received_date) >= DATE_SUB(CURRENT_DATE('America/New_York'), INTERVAL @daysBack DAY)`
  if (orgFilter.clause) whereClause += ` AND ${orgFilter.clause}`

  const sql = `
    WITH lead_data AS (
      SELECT
        tmx_lead_sid,
        COALESCE(proposal_contract_amount, 0) as amount,
        received_date,
        scheduled_date,
        inspected_date,
        proposed_date,
        sold_date,
        cancel_date,
        CASE
          WHEN proposed_date IS NOT NULL THEN proposed_date
          WHEN inspected_date IS NOT NULL THEN inspected_date
          WHEN scheduled_date IS NOT NULL THEN scheduled_date
          ELSE received_date
        END as stage_entry_date,
        -- Check for data quality issues (null key fields)
        CASE WHEN contact_full_name IS NULL OR contact_full_name = '' THEN 1 ELSE 0 END as missing_contact,
        CASE WHEN assigned_sales_rep IS NULL OR assigned_sales_rep = '' THEN 1 ELSE 0 END as missing_rep,
        CASE WHEN report_branch IS NULL THEN 1 ELSE 0 END as missing_branch
      FROM \`${PROJECT}.${DATASET}.${LEADS_TABLE}\`
      WHERE ${whereClause}
    ),
    -- Active pipeline (not sold, not canceled)
    active_pipeline AS (
      SELECT * FROM lead_data
      WHERE sold_date IS NULL AND cancel_date IS NULL
    ),
    -- Pipeline by age bucket
    pipeline_aging AS (
      SELECT
        SUM(CASE WHEN DATE_DIFF(CURRENT_DATE('America/New_York'), DATE(received_date), DAY) <= 30 THEN amount ELSE 0 END) as pipeline_30,
        SUM(CASE WHEN DATE_DIFF(CURRENT_DATE('America/New_York'), DATE(received_date), DAY) BETWEEN 31 AND 60 THEN amount ELSE 0 END) as pipeline_60,
        SUM(CASE WHEN DATE_DIFF(CURRENT_DATE('America/New_York'), DATE(received_date), DAY) BETWEEN 61 AND 90 THEN amount ELSE 0 END) as pipeline_90,
        SUM(amount) as total_pipeline
      FROM active_pipeline
    ),
    -- Win rate calculation (sold / proposed)
    conversion_metrics AS (
      SELECT
        COUNT(CASE WHEN proposed_date IS NOT NULL THEN 1 END) as proposals,
        COUNT(CASE WHEN sold_date IS NOT NULL THEN 1 END) as sold,
        COUNT(*) as total_leads
      FROM lead_data
    ),
    -- Cycle time for closed deals
    cycle_time AS (
      SELECT
        AVG(DATE_DIFF(DATE(sold_date), DATE(received_date), DAY)) as avg_cycle_days
      FROM lead_data
      WHERE sold_date IS NOT NULL
    ),
    -- Stalled opportunities (14+ days in current stage)
    stalled AS (
      SELECT
        COUNT(*) as stalled_count,
        COALESCE(SUM(amount), 0) as stalled_value
      FROM active_pipeline
      WHERE DATE_DIFF(CURRENT_DATE('America/New_York'), DATE(stage_entry_date), DAY) > 14
    ),
    -- CRM hygiene score (percentage of records with complete data)
    hygiene AS (
      SELECT
        ROUND(
          (1 - (SUM(missing_contact) + SUM(missing_rep) + SUM(missing_branch)) / (COUNT(*) * 3.0)) * 100,
          1
        ) as hygiene_score
      FROM lead_data
    )

    SELECT
      COALESCE(pa.total_pipeline, 0) as pipeline_value,
      COALESCE(pa.pipeline_30, 0) as pipeline_30_day,
      COALESCE(pa.pipeline_60, 0) as pipeline_60_day,
      COALESCE(pa.pipeline_90, 0) as pipeline_90_day,
      ROUND(SAFE_DIVIDE(cm.sold, cm.proposals) * 100, 1) as win_rate,
      ROUND(COALESCE(ct.avg_cycle_days, 0), 1) as avg_cycle_time_days,
      COALESCE(s.stalled_count, 0) as stalled_opps_count,
      COALESCE(s.stalled_value, 0) as stalled_opps_value,
      COALESCE(h.hygiene_score, 0) as crm_hygiene_score,
      COALESCE(cm.total_leads, 0) as total_leads,
      COALESCE(cm.proposals, 0) as proposals_count,
      COALESCE(cm.sold, 0) as sold_count
    FROM pipeline_aging pa
    CROSS JOIN conversion_metrics cm
    CROSS JOIN cycle_time ct
    CROSS JOIN stalled s
    CROSS JOIN hygiene h
  `

  try {
    const result = await bigQueryClient.queryWithParams<SalesKPIs>(sql, params)
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
    console.error('[SalesPipeline] getSalesKPIs failed:', error)
    return {
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
  }
}

/**
 * Get top opportunities by value
 * Returns highest-value open opportunities for national sales view
 */
export async function getTopOpportunities(
  options: SalesPipelineQueryOptions = {}
): Promise<TopOpportunity[]> {
  // Sanitize numeric inputs
  const safeDaysBack = sanitizeNumeric(options.daysBack, 90, 1, 365)
  const safeLimit = sanitizeNumeric(options.limit, 20, 1, 100)
  const orgFilter = buildLeadsOrgFilterClause(options)

  const params: Record<string, unknown> = {
    ...orgFilter.params,
    daysBack: safeDaysBack,
    resultLimit: safeLimit
  }

  let whereClause = `DATE(received_date) >= DATE_SUB(CURRENT_DATE('America/New_York'), INTERVAL @daysBack DAY)`
  // Only active leads (not sold or canceled)
  whereClause += ` AND sold_date IS NULL AND cancel_date IS NULL`
  // Must have proposal amount
  whereClause += ` AND proposal_contract_amount IS NOT NULL AND proposal_contract_amount > 0`
  if (orgFilter.clause) whereClause += ` AND ${orgFilter.clause}`

  const sql = `
    WITH opportunities AS (
      SELECT
        CAST(tmx_lead_sid AS STRING) as id,
        CONCAT('Opportunity - ', COALESCE(lead_service, 'General')) as name,
        COALESCE(contact_full_name, 'Unknown Account') as accountName,
        CASE
          WHEN proposed_date IS NOT NULL THEN 'negotiation'
          WHEN inspected_date IS NOT NULL THEN 'proposal'
          WHEN scheduled_date IS NOT NULL THEN 'qualification'
          ELSE 'prospecting'
        END as stage,
        COALESCE(proposal_contract_amount, 0) as amount,
        -- Calculate probability based on stage
        CASE
          WHEN proposed_date IS NOT NULL THEN 0.70
          WHEN inspected_date IS NOT NULL THEN 0.50
          WHEN scheduled_date IS NOT NULL THEN 0.30
          ELSE 0.10
        END as probability,
        COALESCE(assigned_sales_rep, 'Unassigned') as assigned_rep,
        CAST(report_branch AS STRING) as branch,
        FORMAT_DATE('%Y-%m-%d', received_date) as received_date
      FROM \`${PROJECT}.${DATASET}.${LEADS_TABLE}\`
      WHERE ${whereClause}
    )
    SELECT *
    FROM opportunities
    ORDER BY amount DESC
    LIMIT @resultLimit
  `

  try {
    const result = await bigQueryClient.queryWithParams<TopOpportunity>(sql, params)
    return result.rows
  } catch (error) {
    console.error('[SalesPipeline] getTopOpportunities failed:', error)
    return []
  }
}

/**
 * Get opportunity detail by ID
 * Returns full opportunity information for opportunity detail page
 */
export async function getOpportunityById(
  options: SalesPipelineQueryOptions & { leadId: string }
): Promise<OpportunityDetail | null> {
  const leadId = validateString(options.leadId, 'leadId')
  if (!leadId) {
    console.warn('[SalesPipeline] getOpportunityById: leadId is required')
    return null
  }

  const sql = `
    WITH opportunity_data AS (
      SELECT
        CAST(tmx_lead_sid AS STRING) as id,
        CONCAT('Opportunity - ', COALESCE(lead_service, 'General')) as name,
        COALESCE(contact_full_name, 'Unknown Account') as accountName,
        CAST(customer_sid AS STRING) as accountId,
        CASE
          WHEN sold_date IS NOT NULL THEN 'closed_won'
          WHEN cancel_date IS NOT NULL THEN 'closed_lost'
          WHEN proposed_date IS NOT NULL THEN 'negotiation'
          WHEN inspected_date IS NOT NULL THEN 'proposal'
          WHEN scheduled_date IS NOT NULL THEN 'qualification'
          ELSE 'prospecting'
        END as stage,
        COALESCE(proposal_contract_amount, 0) as amount,
        CASE
          WHEN sold_date IS NOT NULL THEN 1.0
          WHEN cancel_date IS NOT NULL THEN 0.0
          WHEN proposed_date IS NOT NULL THEN 0.70
          WHEN inspected_date IS NOT NULL THEN 0.50
          WHEN scheduled_date IS NOT NULL THEN 0.30
          ELSE 0.10
        END as probability,
        FORMAT_DATE('%Y-%m-%d', received_date) as createdDate,
        FORMAT_DATE('%Y-%m-%d', COALESCE(expected_close_date, DATE_ADD(received_date, INTERVAL 90 DAY))) as closeDate,
        CASE
          WHEN proposed_date IS NOT NULL THEN proposed_date
          WHEN inspected_date IS NOT NULL THEN inspected_date
          WHEN scheduled_date IS NOT NULL THEN scheduled_date
          ELSE received_date
        END as stage_entry_date,
        COALESCE(assigned_sales_rep, 'Unassigned') as ownerName,
        CAST(COALESCE(assigned_sales_rep_id, 'unknown') AS STRING) as ownerId,
        cancel_reason as lostReason
      FROM \`${PROJECT}.${DATASET}.${LEADS_TABLE}\`
      WHERE CAST(tmx_lead_sid AS STRING) = @leadId
      LIMIT 1
    )
    SELECT
      id,
      name,
      accountName,
      accountId,
      stage,
      amount,
      probability,
      createdDate,
      closeDate,
      DATE_DIFF(CURRENT_DATE('America/New_York'), DATE(stage_entry_date), DAY) as daysInStage,
      CASE
        WHEN DATE_DIFF(CURRENT_DATE('America/New_York'), DATE(stage_entry_date), DAY) > 14 THEN true
        ELSE false
      END as isStalled,
      'Follow up with decision maker' as nextStep,
      FORMAT_DATE('%Y-%m-%d', DATE_ADD(CURRENT_DATE('America/New_York'), INTERVAL 7 DAY)) as nextStepDate,
      ownerName,
      ownerId,
      lostReason
    FROM opportunity_data
  `

  try {
    const result = await bigQueryClient.queryWithParams<OpportunityDetail>(sql, { leadId })
    return result.rows[0] || null
  } catch (error) {
    console.error('[SalesPipeline] getOpportunityById failed:', error)
    return null
  }
}
