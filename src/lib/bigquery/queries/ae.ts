/**
 * BigQuery Queries for Account Executive (AE) Module
 *
 * INTEGRATED DATA SOURCES (PestPac + Salesforce + Xactly):
 *
 * 1. SALESFORCE (S0.Raw_RTXSF_*) - Opportunities, Quotes, Proposals
 *    - Raw_RTXSF_Opportunity_Daily - pipeline opportunities
 *    - Raw_RTXSF_Quote_Daily - quote/proposal details
 *    - Raw_RTXSF_QuoteLineItem_Daily - service line items
 *
 * 2. PESTPAC (W3_Contract_Checker) - Contracts & Service Starts
 *    - T0_unf_Contract_All - 7.8M contracts with StartedInd
 *
 * 3. XACTLY (BCG_RTD_DB.DR_ContractSales) - Compensation Tracking
 *    - 3.2M rows with sales_person_nm, started_ind, contract_value
 *
 * Pages: /ae, /ae/pipeline, /ae/tracker, /ae/new-starts
 */

import { bigQueryClient, BIGQUERY_CONFIG } from '../client'
import { buildDateFilter, percentage } from './field-calculators'
import { mapProductGroupToPestTypes } from '@/lib/utils/pest-types'
import {
  validateOrgCode,
  validateNumeric,
  validateString,
  ValidationError,
} from '../validation'

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Validate AE query options to prevent SQL injection
 */
function validateAEOptions(options: AEQueryOptions, functionName: string): void {
  try {
    validateNumeric(options.daysBack, 'daysBack', 1, 365)
    validateString(options.aeId, 'aeId', 50)
    validateString(options.technicianId, 'technicianId', 50)
    validateOrgCode(options.branch, 'branch')
    validateOrgCode(options.region, 'region')
    validateOrgCode(options.market, 'market')
    validateString(options.stage, 'stage', 50)
    validateNumeric(options.limit, 'limit', 1, 1000)
    validateString(options.salesPerson, 'salesPerson', 100)
    validateNumeric(options.year, 'year', 2020, 2100)
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error(`[AE] ${functionName} validation failed:`, error.message)
      throw error
    }
    throw error
  }
}

/**
 * Build a flexible salesPerson filter that handles both name formats:
 * - "Cody Lytle" (FirstName LastName)
 * - "LYTLE, CODY" (LASTNAME, FIRSTNAME)
 *
 * Uses AND logic on individual name parts to match regardless of order.
 * For "Cody Lytle": matches "LYTLE, CODY", "cody lytle", "Lytle Cody", etc.
 */
function buildSalesPersonFilter(columnName: string, paramName: string = 'salesPerson'): string {
  return `AND (
    -- Split the input name and check both parts exist (handles any order)
    (
      LOWER(${columnName}) LIKE CONCAT('%', LOWER(SPLIT(@${paramName}, ' ')[SAFE_OFFSET(0)]), '%')
      AND LOWER(${columnName}) LIKE CONCAT('%', LOWER(SPLIT(@${paramName}, ' ')[SAFE_OFFSET(1)]), '%')
    )
    -- Also try with comma split for "Last, First" input
    OR (
      LOWER(${columnName}) LIKE CONCAT('%', LOWER(SPLIT(@${paramName}, ', ')[SAFE_OFFSET(0)]), '%')
      AND LOWER(${columnName}) LIKE CONCAT('%', LOWER(SPLIT(@${paramName}, ', ')[SAFE_OFFSET(1)]), '%')
    )
    -- Fallback: direct substring match
    OR LOWER(${columnName}) LIKE LOWER(CONCAT('%', @${paramName}, '%'))
  )`
}

// =============================================================================
// Types
// =============================================================================

export interface AEPipeline {
  opportunity_id: string
  opportunity_name: string
  account_name: string
  stage: string
  amount: number
  probability: number
  expected_close_date: string
  days_in_stage: number
  owner_name: string
  next_step: string
}

export interface AETracker {
  ae_id: string
  ae_name: string
  opportunities_created: number
  opportunities_won: number
  opportunities_lost: number
  pipeline_value: number
  revenue_closed: number
  win_rate: number
  avg_deal_size: number
  avg_cycle_days: number
}

export interface TechTickets {
  ticket_id: string
  customer_name: string
  issue_type: string
  priority: string
  status: string
  created_date: string
  technician_assigned: string
  branch: string
  days_open: number
}

export interface TechDispatch {
  dispatch_date: string
  technician_id: string
  technician_name: string
  branch: string
  stops_scheduled: number
  stops_completed: number
  completion_rate: number
  total_hours: number
  avg_time_per_stop: number
}

// AE Tracker Totals types
export interface AECategoryBreakdown {
  category: string
  proposalTotal: number
  proposalCount: number
  salesTotal: number
  salesCount: number
}

export interface AEMonthlyProgress {
  month: string
  yearMonth: number
  totalProposals: number
  totalSales: number
  totalStartedSales: number
  isq: number
  personalGoal: number
}

export interface AETrackerTotals {
  year: number
  yearlyGoal: number // From localStorage, not BigQuery
  yearlyActual: number
  yearlyISQ: number
  categoryBreakdown: AECategoryBreakdown[]
  monthlyProgression: AEMonthlyProgress[]
}

// =============================================================================
// Query Options
// =============================================================================

export interface AEQueryOptions {
  daysBack?: number
  aeId?: string
  technicianId?: string
  branch?: string
  region?: string
  market?: string
  stage?: string
  limit?: number
  // For AE Tracker Totals - filter by sales person name
  salesPerson?: string
  year?: number
}

// =============================================================================
// Queries
// =============================================================================

const PROJECT = BIGQUERY_CONFIG.projectId

/**
 * Get AE pipeline opportunities
 * Uses S0_TMX.tmx_lead with correct column names
 * Supports salesPerson filtering via employee name lookup
 */
export async function getAEPipeline(
  options: AEQueryOptions = {}
): Promise<AEPipeline[]> {
  validateAEOptions(options, 'getAEPipeline')
  const { daysBack = 90, aeId, salesPerson, stage, limit = 200 } = options

  // Join with Employees_Main to enable filtering by sales person name
  const sql = `
    SELECT
      CAST(l.tmx_lead_sid AS STRING) as opportunity_id,
      CONCAT('Lead ', CAST(l.tmx_lead_sid AS STRING)) as opportunity_name,
      'Prospect' as account_name,
      CASE
        WHEN l.sold_date IS NOT NULL THEN 'Closed Won'
        WHEN l.cancel_date IS NOT NULL THEN 'Closed Lost'
        WHEN l.proposed_date IS NOT NULL THEN 'Proposal'
        WHEN l.inspected_date IS NOT NULL THEN 'Inspection'
        WHEN l.scheduled_date IS NOT NULL THEN 'Scheduled'
        ELSE 'New'
      END as stage,
      0 as amount,
      CASE
        WHEN l.sold_date IS NOT NULL THEN 100
        WHEN l.cancel_date IS NOT NULL THEN 0
        WHEN l.proposed_date IS NOT NULL THEN 60
        WHEN l.inspected_date IS NOT NULL THEN 40
        WHEN l.scheduled_date IS NOT NULL THEN 20
        ELSE 10
      END as probability,
      FORMAT_DATE('%Y-%m-%d', DATE(COALESCE(l.proposed_date, l.scheduled_date, l.received_date))) as expected_close_date,
      DATE_DIFF(CURRENT_DATE(), DATE(l.received_date), DAY) as days_in_stage,
      COALESCE(CONCAT(e.First_Name, ' ', e.Last_Name), CAST(l.curr_assigned_employee_sid AS STRING), 'Unknown') as owner_name,
      'Follow up' as next_step
    FROM \`${PROJECT}.S0_TMX.tmx_lead\` l
    LEFT JOIN \`${PROJECT}.S0_TMX.Employees_Main\` e
      ON CAST(l.curr_assigned_employee_sid AS STRING) = CAST(e.Employee_Number AS STRING)
    WHERE ${buildDateFilter('l.received_date', daysBack)}
      ${aeId ? 'AND l.curr_assigned_employee_sid = @aeId' : ''}
      ${salesPerson ? `AND (
        LOWER(CONCAT(e.First_Name, ' ', e.Last_Name)) LIKE LOWER(CONCAT('%', @salesPerson, '%'))
        OR LOWER(CONCAT(e.Last_Name, ', ', e.First_Name)) LIKE LOWER(CONCAT('%', @salesPerson, '%'))
        OR LOWER(e.First_Name) LIKE LOWER(CONCAT('%', @salesPerson, '%'))
        OR LOWER(e.Last_Name) LIKE LOWER(CONCAT('%', @salesPerson, '%'))
      )` : ''}
      ${stage ? 'AND CASE WHEN l.sold_date IS NOT NULL THEN "Closed Won" WHEN l.cancel_date IS NOT NULL THEN "Closed Lost" WHEN l.proposed_date IS NOT NULL THEN "Proposal" WHEN l.inspected_date IS NOT NULL THEN "Inspection" WHEN l.scheduled_date IS NOT NULL THEN "Scheduled" ELSE "New" END = @stage' : ''}
    ORDER BY l.received_date DESC
    LIMIT ${limit}
  `

  const params: Record<string, unknown> = {}
  if (aeId) params.aeId = aeId
  if (salesPerson) params.salesPerson = salesPerson
  if (stage) params.stage = stage

  const result = await bigQueryClient.queryWithParams<AEPipeline>(sql, params)
  return result.rows
}

/**
 * Get AE tracker metrics
 * Uses S0_TMX.tmx_lead with correct column names
 */
export async function getAETracker(
  options: AEQueryOptions = {}
): Promise<AETracker[]> {
  validateAEOptions(options, 'getAETracker')
  const { daysBack = 30, aeId, salesPerson, limit = 100 } = options

  // JOIN with Employees_Main to get actual names and enable filtering by name
  const sql = `
    SELECT
      COALESCE(CAST(l.curr_assigned_employee_sid AS STRING), 'Unknown') as ae_id,
      COALESCE(CONCAT(e.First_Name, ' ', e.Last_Name), CAST(l.curr_assigned_employee_sid AS STRING), 'Unknown') as ae_name,
      COUNT(*) as opportunities_created,
      COUNT(CASE WHEN l.sold_date IS NOT NULL THEN 1 END) as opportunities_won,
      COUNT(CASE WHEN l.cancel_date IS NOT NULL THEN 1 END) as opportunities_lost,
      0 as pipeline_value,
      0 as revenue_closed,
      ${percentage('COUNT(CASE WHEN l.sold_date IS NOT NULL THEN 1 END)', 'COUNT(CASE WHEN l.sold_date IS NOT NULL OR l.cancel_date IS NOT NULL THEN 1 END)')} as win_rate,
      0 as avg_deal_size,
      ROUND(AVG(CASE WHEN l.sold_date IS NOT NULL THEN DATE_DIFF(DATE(l.sold_date), DATE(l.received_date), DAY) END), 1) as avg_cycle_days
    FROM \`${PROJECT}.S0_TMX.tmx_lead\` l
    LEFT JOIN \`${PROJECT}.S0_TMX.Employees_Main\` e
      ON CAST(l.curr_assigned_employee_sid AS STRING) = CAST(e.Employee_Number AS STRING)
    WHERE ${buildDateFilter('l.received_date', daysBack)}
      ${aeId ? 'AND CAST(l.curr_assigned_employee_sid AS STRING) = @aeId' : ''}
      ${salesPerson ? `AND (
        LOWER(CONCAT(e.First_Name, ' ', e.Last_Name)) LIKE LOWER(CONCAT('%', @salesPerson, '%'))
        OR LOWER(CONCAT(e.Last_Name, ', ', e.First_Name)) LIKE LOWER(CONCAT('%', @salesPerson, '%'))
        OR LOWER(e.First_Name) LIKE LOWER(CONCAT('%', @salesPerson, '%'))
        OR LOWER(e.Last_Name) LIKE LOWER(CONCAT('%', @salesPerson, '%'))
      )` : ''}
    GROUP BY l.curr_assigned_employee_sid, e.First_Name, e.Last_Name
    ORDER BY opportunities_won DESC
    LIMIT ${limit}
  `

  const params: Record<string, unknown> = {}
  if (aeId) params.aeId = aeId
  if (salesPerson) params.salesPerson = salesPerson

  const result = await bigQueryClient.queryWithParams<AETracker>(sql, params)
  return result.rows
}

/**
 * Get technician tickets
 * Uses S0_TMX.Inspections as proxy for service tickets
 */
export async function getTechTickets(
  options: AEQueryOptions = {}
): Promise<TechTickets[]> {
  validateAEOptions(options, 'getTechTickets')
  const { daysBack = 30, technicianId, branch, limit = 200 } = options

  // Using Inspections as proxy for service tickets
  const sql = `
    SELECT
      CAST(i.InspectionId AS STRING) as ticket_id,
      COALESCE(i.CustomerNumber, 'Unknown') as customer_name,
      'Inspection' as issue_type,
      CASE i.Status
        WHEN 'Pending' THEN 'High'
        ELSE 'Normal'
      END as priority,
      CASE
        WHEN UPPER(i.Status) IN ('COMPLETE', 'COMPLETED', 'SOLD', 'CLOSED') THEN 'Closed'
        ELSE 'Open'
      END as status,
      FORMAT_DATE('%Y-%m-%d', DATE(i.DateInspected)) as created_date,
      COALESCE(i.EmployeeNumber, 'Unassigned') as technician_assigned,
      COALESCE(i.BUCode, 'Unknown') as branch,
      DATE_DIFF(CURRENT_DATE(), DATE(i.DateInspected), DAY) as days_open
    FROM \`${PROJECT}.S0_TMX.Inspections\` i
    WHERE ${buildDateFilter('i.DateInspected', daysBack)}
      ${technicianId ? 'AND i.EmployeeNumber = @technicianId' : ''}
      ${branch ? 'AND i.BUCode = @branch' : ''}
    ORDER BY i.DateInspected DESC
    LIMIT ${limit}
  `

  const params: Record<string, unknown> = {}
  if (technicianId) params.technicianId = technicianId
  if (branch) params.branch = branch

  const result = await bigQueryClient.queryWithParams<TechTickets>(sql, params)
  return result.rows
}

/**
 * Get technician dispatch metrics
 * Uses S0_TMX.Inspections as proxy for dispatch data
 */
export async function getTechDispatch(
  options: AEQueryOptions = {}
): Promise<TechDispatch[]> {
  validateAEOptions(options, 'getTechDispatch')
  const { daysBack = 7, technicianId, branch, limit = 200 } = options

  const sql = `
    SELECT
      FORMAT_DATE('%Y-%m-%d', DATE(i.DateInspected)) as dispatch_date,
      COALESCE(i.EmployeeNumber, 'Unknown') as technician_id,
      COALESCE(i.EmployeeNumber, 'Unknown') as technician_name,
      COALESCE(i.BUCode, 'Unknown') as branch,
      COUNT(*) as stops_scheduled,
      COUNT(CASE WHEN UPPER(i.Status) IN ('COMPLETE', 'COMPLETED', 'SOLD', 'CLOSED') THEN 1 END) as stops_completed,
      ${percentage('COUNT(CASE WHEN UPPER(i.Status) IN (\'COMPLETE\', \'COMPLETED\', \'SOLD\', \'CLOSED\') THEN 1 END)', 'COUNT(*)')} as completion_rate,
      0 as total_hours,
      0 as avg_time_per_stop
    FROM \`${PROJECT}.S0_TMX.Inspections\` i
    WHERE ${buildDateFilter('i.DateInspected', daysBack)}
      ${technicianId ? 'AND i.EmployeeNumber = @technicianId' : ''}
      ${branch ? 'AND i.BUCode = @branch' : ''}
    GROUP BY FORMAT_DATE('%Y-%m-%d', DATE(i.DateInspected)), i.EmployeeNumber, i.BUCode
    ORDER BY dispatch_date DESC, stops_completed DESC
    LIMIT ${limit}
  `

  const params: Record<string, unknown> = {}
  if (technicianId) params.technicianId = technicianId
  if (branch) params.branch = branch

  const result = await bigQueryClient.queryWithParams<TechDispatch>(sql, params)
  return result.rows
}

// =============================================================================
// AE Tracker Totals Queries
// =============================================================================

/**
 * Get AE category breakdown (proposals and sales by service category)
 * Uses BCG_RTD_DB.DR_ContractSales (Xactly-linked data with current sales)
 */
export async function getAECategoryBreakdown(
  options: AEQueryOptions = {}
): Promise<AECategoryBreakdown[]> {
  validateAEOptions(options, 'getAECategoryBreakdown')
  const { salesPerson, year = new Date().getFullYear() } = options

  // Map product_group codes to friendly category names
  const sql = `
    SELECT
      CASE
        WHEN product_group IN ('P', 'PEST', 'PC', 'General Pest') THEN 'Pest'
        WHEN product_group IN ('T', 'TERM', 'WD', 'Termite') THEN 'Termite'
        WHEN product_group IN ('W', 'WILD', 'WL', 'Wildlife') THEN 'Wildlife'
        WHEN product_group IN ('M', 'MOSQ', 'MQ', 'Mosquito') THEN 'Mosquito'
        WHEN product_group IN ('B', 'BEDB', 'BB', 'Bed Bug') THEN 'Bed Bug'
        WHEN product_group IN ('L', 'LAWN', 'LN', 'Lawn Care') THEN 'Lawn'
        WHEN product_group IN ('I', 'INS', 'INL', 'Insulation') THEN 'Insulation'
        ELSE COALESCE(product_group, 'Other')
      END as category,
      -- Proposals: count all rows (proposing = selling intent)
      COALESCE(SUM(contract_value), 0) as proposalTotal,
      COUNT(*) as proposalCount,
      -- Sales: only started contracts count as actual sales
      COALESCE(SUM(CASE WHEN started_ind = 'Y' THEN contract_value END), 0) as salesTotal,
      COUNT(CASE WHEN started_ind = 'Y' THEN 1 END) as salesCount
    FROM \`${PROJECT}.BCG_RTD_DB.DR_ContractSales\`
    WHERE EXTRACT(YEAR FROM sell_date) = @year
      ${salesPerson ? buildSalesPersonFilter('sales_person_nm') : ''}
    GROUP BY
      CASE
        WHEN product_group IN ('P', 'PEST', 'PC', 'General Pest') THEN 'Pest'
        WHEN product_group IN ('T', 'TERM', 'WD', 'Termite') THEN 'Termite'
        WHEN product_group IN ('W', 'WILD', 'WL', 'Wildlife') THEN 'Wildlife'
        WHEN product_group IN ('M', 'MOSQ', 'MQ', 'Mosquito') THEN 'Mosquito'
        WHEN product_group IN ('B', 'BEDB', 'BB', 'Bed Bug') THEN 'Bed Bug'
        WHEN product_group IN ('L', 'LAWN', 'LN', 'Lawn Care') THEN 'Lawn'
        WHEN product_group IN ('I', 'INS', 'INL', 'Insulation') THEN 'Insulation'
        ELSE COALESCE(product_group, 'Other')
      END
    ORDER BY salesTotal DESC
  `

  try {
    const params: Record<string, unknown> = { year }
    if (salesPerson) params.salesPerson = salesPerson

    const result = await bigQueryClient.queryWithParams<AECategoryBreakdown>(sql, params)
    return result.rows
  } catch (error) {
    console.error('[AE] getAECategoryBreakdown failed:', error)
    return []
  }
}

/**
 * Get AE monthly progression for tracker totals
 * Uses BCG_RTD_DB.DR_ContractSales (Xactly-linked data with current sales)
 */
export async function getAEMonthlyProgression(
  options: AEQueryOptions = {}
): Promise<AEMonthlyProgress[]> {
  validateAEOptions(options, 'getAEMonthlyProgression')
  const { salesPerson, year = new Date().getFullYear() } = options

  const sql = `
    SELECT
      FORMAT_DATE('%b', sell_date) as month,
      sell_date_year_month as yearMonth,
      COUNT(*) as totalProposals,
      COUNT(CASE WHEN started_ind = 'Y' THEN 1 END) as totalSales,
      COALESCE(SUM(CASE WHEN started_ind = 'Y' THEN contract_value END), 0) as totalStartedSales,
      -- ISQ is typically a quota metric - calculate as started sales for now
      COALESCE(SUM(CASE WHEN started_ind = 'Y' THEN contract_value END), 0) as isq,
      0 as personalGoal -- This comes from localStorage, not BigQuery
    FROM \`${PROJECT}.BCG_RTD_DB.DR_ContractSales\`
    WHERE EXTRACT(YEAR FROM sell_date) = @year
      ${salesPerson ? buildSalesPersonFilter('sales_person_nm') : ''}
    GROUP BY FORMAT_DATE('%b', sell_date), sell_date_year_month
    ORDER BY sell_date_year_month
  `

  try {
    const params: Record<string, unknown> = { year }
    if (salesPerson) params.salesPerson = salesPerson

    const result = await bigQueryClient.queryWithParams<AEMonthlyProgress>(sql, params)
    return result.rows
  } catch (error) {
    console.error('[AE] getAEMonthlyProgression failed:', error)
    return []
  }
}

/**
 * Get AE Tracker Totals - combines category breakdown and monthly progression
 * The yearlyGoal is expected to be passed from localStorage
 */
export async function getAETrackerTotals(
  options: AEQueryOptions & { yearlyGoal?: number } = {}
): Promise<AETrackerTotals> {
  validateAEOptions(options, 'getAETrackerTotals')
  const { year = new Date().getFullYear(), yearlyGoal = 0 } = options

  const [categoryBreakdown, monthlyProgression] = await Promise.all([
    getAECategoryBreakdown(options),
    getAEMonthlyProgression(options),
  ])

  // Calculate yearly totals from monthly data
  const yearlyActual = monthlyProgression.reduce((sum, m) => sum + m.totalStartedSales, 0)
  const yearlyISQ = monthlyProgression.reduce((sum, m) => sum + m.isq, 0)

  return {
    year,
    yearlyGoal,
    yearlyActual,
    yearlyISQ,
    categoryBreakdown,
    monthlyProgression,
  }
}

// =============================================================================
// AE Compensation Queries (BCG_RTD_DB.DR_ContractSales - Xactly-linked data)
// =============================================================================

export interface AECompensationSummary {
  salesPersonName: string
  employeeNum: string
  totalSold: number
  totalStarted: number
  totalValue: number
  startedValue: number
  startRate: number
  avgDealSize: number
  productMix: { category: string; count: number; value: number }[]
}

export interface AESalesDetail {
  salesId: string
  customerName: string
  productGroup: string
  serviceType: string
  serviceTypeName: string
  sellDate: string
  startDate: string | null
  initialValue: number
  contractValue: number
  totalValue: number
  startedInd: string
  branch: string
  region: string
  market: string
}

/**
 * Get AE compensation summary from DR_ContractSales (Xactly-linked)
 * This table has sales_person_nm which ties to Xactly compensation
 */
export async function getAECompensationSummary(
  options: AEQueryOptions = {}
): Promise<AECompensationSummary | null> {
  validateAEOptions(options, 'getAECompensationSummary')
  const { salesPerson, year = new Date().getFullYear(), daysBack } = options

  // Build date filter - either by year or daysBack
  const dateFilter = daysBack
    ? `sell_date >= DATE_SUB(CURRENT_DATE(), INTERVAL ${daysBack} DAY)`
    : `EXTRACT(YEAR FROM sell_date) = ${year}`

  const sql = `
    WITH sales_data AS (
      SELECT
        sales_person_nm,
        employee_num,
        COUNT(*) as total_sold,
        COUNTIF(started_ind = 'Y') as total_started,
        COALESCE(SUM(contract_value), 0) as total_value,
        COALESCE(SUM(CASE WHEN started_ind = 'Y' THEN contract_value END), 0) as started_value,
        product_group
      FROM \`${PROJECT}.BCG_RTD_DB.DR_ContractSales\`
      WHERE ${dateFilter}
        ${salesPerson ? buildSalesPersonFilter('sales_person_nm') : ''}
      GROUP BY sales_person_nm, employee_num, product_group
    ),
    summary AS (
      SELECT
        sales_person_nm,
        employee_num,
        SUM(total_sold) as total_sold,
        SUM(total_started) as total_started,
        SUM(total_value) as total_value,
        SUM(started_value) as started_value
      FROM sales_data
      GROUP BY sales_person_nm, employee_num
    ),
    product_mix AS (
      SELECT
        sales_person_nm,
        product_group,
        SUM(total_sold) as count,
        SUM(total_value) as value
      FROM sales_data
      GROUP BY sales_person_nm, product_group
    )
    SELECT
      -- Convert sales person name from "LAST, FIRST" to "First Last"
      CASE
        WHEN s.sales_person_nm LIKE '%,%' THEN
          CONCAT(
            TRIM(SPLIT(s.sales_person_nm, ',')[SAFE_OFFSET(1)]),  -- First name
            ' ',
            TRIM(SPLIT(s.sales_person_nm, ',')[SAFE_OFFSET(0)])   -- Last name
          )
        ELSE COALESCE(s.sales_person_nm, 'Unknown')
      END as salesPersonName,
      s.employee_num as employeeNum,
      s.total_sold as totalSold,
      s.total_started as totalStarted,
      s.total_value as totalValue,
      s.started_value as startedValue,
      SAFE_DIVIDE(s.total_started, s.total_sold) as startRate,
      SAFE_DIVIDE(s.started_value, NULLIF(s.total_started, 0)) as avgDealSize
    FROM summary s
    ORDER BY s.started_value DESC
    LIMIT 1
  `

  try {
    const params: Record<string, unknown> = {}
    if (salesPerson) params.salesPerson = salesPerson

    const result = await bigQueryClient.queryWithParams<AECompensationSummary>(sql, params)
    return result.rows.length > 0 ? result.rows[0] : null
  } catch (error) {
    console.error('[AE] getAECompensationSummary failed:', error)
    return null
  }
}

/**
 * Get AE sales details from BCG_RTD_DB.DR_ContractSales (Xactly-linked compensation data)
 * This table has the most current data for AE sales/compensation tracking.
 * Includes actual customer names and contact info.
 */
export async function getAESalesDetails(
  options: AEQueryOptions = {}
): Promise<AESalesDetail[]> {
  validateAEOptions(options, 'getAESalesDetails')
  const { salesPerson, daysBack = 90, limit = 100 } = options

  // Aggregated query to consolidate multiple product rows per sale
  // ONLY returns SOLD transactions (with PestPac ID)
  const bcgSql = `
    WITH AggregatedSales AS (
      SELECT
        customer_name,
        sell_date,
        sales_person_nm,
        assigned_branch_code,
        region_cd,
        market_cd,
        -- Aggregate identifiers
        MIN(sales_id) as salesId,
        MIN(COALESCE(bill_to_id, location_id)) as pestPacId,
        -- Sum all values (Job Work = ini + non_ini which includes product/equipment)
        SUM(COALESCE(job_ini_value, 0)) + SUM(COALESCE(job_non_ini_value, 0)) as initialValue,
        SUM(COALESCE(contract_value, 0)) as contractValue,
        SUM(COALESCE(total_value, contract_value, 0)) as totalValue,
        -- Consolidate product info
        STRING_AGG(DISTINCT COALESCE(product_group, 'Other'), ', ') as productGroup,
        STRING_AGG(DISTINCT COALESCE(service_type_desc, 'Sale'), ', ') as serviceType,
        -- Status flags
        MAX(CASE WHEN started_ind = 'Y' THEN 1 ELSE 0 END) as hasStarted,
        MAX(start_date) as startDate
      FROM \`${PROJECT}.BCG_RTD_DB.DR_ContractSales\`
      WHERE sell_date >= DATE_SUB(CURRENT_DATE(), INTERVAL ${daysBack} DAY)
        ${salesPerson ? buildSalesPersonFilter('sales_person_nm') : ''}
      GROUP BY customer_name, sell_date, sales_person_nm, assigned_branch_code, region_cd, market_cd
    )
    SELECT
      CAST(salesId AS STRING) as salesId,
      COALESCE(customer_name, 'Customer') as customerName,
      productGroup,
      serviceType,
      serviceType as serviceTypeName,
      FORMAT_DATE('%Y-%m-%d', sell_date) as sellDate,
      CASE WHEN hasStarted = 1 THEN FORMAT_DATE('%Y-%m-%d', startDate) ELSE NULL END as startDate,
      initialValue,
      contractValue,
      totalValue,
      CASE WHEN hasStarted = 1 THEN 'Y' ELSE 'N' END as startedInd,
      COALESCE(assigned_branch_code, '') as branch,
      COALESCE(region_cd, '') as region,
      COALESCE(market_cd, '') as market
    FROM AggregatedSales
    WHERE pestPacId IS NOT NULL
    ORDER BY sell_date DESC
    LIMIT ${limit}
  `

  try {
    const params: Record<string, unknown> = {}
    if (salesPerson) params.salesPerson = salesPerson

    const result = await bigQueryClient.queryWithParams<AESalesDetail>(bcgSql, params)
    return result.rows
  } catch (error) {
    console.error('[AE] getAESalesDetails failed:', error)
    return []
  }
}

/**
 * Get list of salespeople from DR_ContractSales
 * Useful for finding the correct name format
 */
export async function getAESalesPersonList(
  options: { search?: string; limit?: number } = {}
): Promise<{ name: string; employeeNum: string; totalSales: number }[]> {
  validateAEOptions(options, 'getAESalesPersonList')
  const { search, limit = 50 } = options

  const sql = `
    SELECT
      -- Convert sales person name from "LAST, FIRST" to "First Last"
      CASE
        WHEN sales_person_nm LIKE '%,%' THEN
          CONCAT(
            TRIM(SPLIT(sales_person_nm, ',')[SAFE_OFFSET(1)]),  -- First name
            ' ',
            TRIM(SPLIT(sales_person_nm, ',')[SAFE_OFFSET(0)])   -- Last name
          )
        ELSE COALESCE(sales_person_nm, 'Unknown')
      END as name,
      employee_num as employeeNum,
      COUNT(*) as totalSales
    FROM \`${PROJECT}.BCG_RTD_DB.DR_ContractSales\`
    WHERE sell_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 365 DAY)
      AND sales_person_nm IS NOT NULL
      AND sales_person_nm != ''
      ${search ? `AND LOWER(sales_person_nm) LIKE LOWER(CONCAT('%', @search, '%'))` : ''}
    GROUP BY sales_person_nm, employee_num
    ORDER BY totalSales DESC
    LIMIT ${limit}
  `

  try {
    const params: Record<string, unknown> = {}
    if (search) params.search = search

    const result = await bigQueryClient.queryWithParams<{ name: string; employeeNum: string; totalSales: number }>(sql, params)
    return result.rows
  } catch (error) {
    console.error('[AE] getAESalesPersonList failed:', error)
    return []
  }
}

/**
 * Get AE monthly compensation from DR_ContractSales
 * Shows month-over-month sales performance for compensation tracking
 */
export async function getAEMonthlyCompensation(
  options: AEQueryOptions = {}
): Promise<{ month: string; yearMonth: number; sold: number; started: number; soldValue: number; startedValue: number }[]> {
  validateAEOptions(options, 'getAEMonthlyCompensation')
  const { salesPerson, year = new Date().getFullYear() } = options

  const sql = `
    SELECT
      FORMAT_DATE('%b', sell_date) as month,
      sell_date_year_month as yearMonth,
      COUNT(*) as sold,
      COUNTIF(started_ind = 'Y') as started,
      COALESCE(SUM(contract_value), 0) as soldValue,
      COALESCE(SUM(CASE WHEN started_ind = 'Y' THEN contract_value END), 0) as startedValue
    FROM \`${PROJECT}.BCG_RTD_DB.DR_ContractSales\`
    WHERE EXTRACT(YEAR FROM sell_date) = ${year}
      ${salesPerson ? buildSalesPersonFilter('sales_person_nm') : ''}
    GROUP BY FORMAT_DATE('%b', sell_date), sell_date_year_month
    ORDER BY sell_date_year_month
  `

  try {
    const params: Record<string, unknown> = {}
    if (salesPerson) params.salesPerson = salesPerson

    const result = await bigQueryClient.queryWithParams<{ month: string; yearMonth: number; sold: number; started: number; soldValue: number; startedValue: number }>(sql, params)
    return result.rows
  } catch (error) {
    console.error('[AE] getAEMonthlyCompensation failed:', error)
    return []
  }
}

// =============================================================================
// New Start Log Queries (W3_Contract_Checker - PestPac data)
// =============================================================================

export interface NewStartLogEntry {
  id: string
  pestPacId: string  // PestPac customer ID
  soldDate: string
  accountName: string
  serviceAddress: string
  salesRepsInvolved: string
  initialJobPrice: number
  maintenancePrice: number
  serviceType: 'Contract' | 'Job 1x'
  frequency: string
  startDate: string | null
  status: 'pending_ops' | 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'on_hold'
  branch: string
  region: string
  market: string
  productGroup: string
  daysToStart: number | null
  pestTypes: string[]  // Derived from productGroup
}

export interface NewStartLogSummary {
  total: number
  pendingOps: number
  scheduled: number
  confirmed: number
  inProgress: number
  completed: number
  onHold: number
  totalInitialValue: number
  totalContractValue: number
}

/**
 * Get New Start Log entries from W3_Contract_Checker (PestPac)
 * Maps contract data to the New Start Log structure
 */
export async function getNewStartLogEntries(
  options: AEQueryOptions = {}
): Promise<NewStartLogEntry[]> {
  validateAEOptions(options, 'getNewStartLogEntries')
  const { salesPerson, daysBack = 60, limit = 100 } = options

  // Use BCG_RTD_DB.DR_ContractSales with GROUP BY to consolidate multiple product entries per sale
  const sql = `
    WITH AggregatedSales AS (
      SELECT
        customer_name,
        sell_date,
        sales_person_nm,
        assigned_branch_code,
        region_cd,
        market_cd,
        MIN(sales_id) as sales_id,
        SUM(COALESCE(total_value, contract_value, 0)) as total_contract_value,
        SUM(CASE WHEN service_type_desc LIKE '%Contract%' THEN COALESCE(contract_value, 0) / 12 ELSE 0 END) as total_maintenance_price,
        STRING_AGG(DISTINCT service_type_desc, ', ') as service_types,
        STRING_AGG(DISTINCT product_group, ', ') as product_groups,
        STRING_AGG(DISTINCT freq_code, ', ') as frequencies,
        -- Only location_zip exists in this table
        MAX(location_zip) as location_zip,
        MAX(CASE WHEN started_ind = 'Y' THEN 1 ELSE 0 END) as has_started,
        MIN(start_date) as earliest_start_date,
        MIN(days_to_start) as min_days_to_start
      FROM \`${PROJECT}.BCG_RTD_DB.DR_ContractSales\`
      WHERE sell_date >= DATE_SUB(CURRENT_DATE(), INTERVAL ${daysBack} DAY)
        ${salesPerson ? buildSalesPersonFilter('sales_person_nm') : ''}
      GROUP BY customer_name, sell_date, sales_person_nm, assigned_branch_code, region_cd, market_cd
    )
    SELECT
      CAST(agg.sales_id AS STRING) as id,
      CAST(agg.sales_id AS STRING) as pestPacId,
      FORMAT_DATE('%Y-%m-%d', agg.sell_date) as soldDate,
      COALESCE(agg.customer_name, 'Customer') as accountName,
      -- Only location_zip is available in BCG_RTD_DB.DR_ContractSales
      COALESCE(
        NULLIF(agg.location_zip, ''),
        CONCAT(COALESCE(agg.assigned_branch_code, 'Unknown'), ' Branch')
      ) as serviceAddress,
      -- Convert sales person name from "LAST, FIRST" to "First Last"
      CASE
        WHEN agg.sales_person_nm LIKE '%,%' THEN
          CONCAT(
            TRIM(SPLIT(agg.sales_person_nm, ',')[SAFE_OFFSET(1)]),  -- First name
            ' ',
            TRIM(SPLIT(agg.sales_person_nm, ',')[SAFE_OFFSET(0)])   -- Last name
          )
        ELSE COALESCE(agg.sales_person_nm, 'Unknown')
      END as salesRepsInvolved,
      agg.total_contract_value as initialJobPrice,
      agg.total_maintenance_price as maintenancePrice,
      COALESCE(agg.service_types, 'Job') as serviceType,
      COALESCE(agg.frequencies, '1') as frequency,
      FORMAT_DATE('%Y-%m-%d', agg.earliest_start_date) as startDate,
      CASE
        WHEN agg.has_started = 1 THEN 'completed'
        WHEN agg.earliest_start_date IS NOT NULL AND agg.earliest_start_date <= CURRENT_DATE() THEN 'in_progress'
        WHEN agg.earliest_start_date IS NOT NULL THEN 'confirmed'
        WHEN DATE_DIFF(CURRENT_DATE(), agg.sell_date, DAY) > 7 THEN 'scheduled'
        ELSE 'pending_ops'
      END as status,
      COALESCE(agg.assigned_branch_code, '') as branch,
      COALESCE(agg.region_cd, '') as region,
      COALESCE(agg.market_cd, '') as market,
      COALESCE(agg.product_groups, 'Other') as productGroup,
      COALESCE(agg.min_days_to_start, 0) as daysToStart
    FROM AggregatedSales agg
    ORDER BY agg.sell_date DESC
    LIMIT ${limit}
  `

  try {
    const params: Record<string, unknown> = {}
    if (salesPerson) params.salesPerson = salesPerson

    const result = await bigQueryClient.queryWithParams<Omit<NewStartLogEntry, 'pestTypes'>>(sql, params)

    // Post-process to add pest types derived from productGroup
    return result.rows.map(row => ({
      ...row,
      pestTypes: mapProductGroupToPestTypes(row.productGroup),
    }))
  } catch (error) {
    console.error('[AE] getNewStartLogEntries failed:', error)
    return []
  }
}

/**
 * Get New Start Log summary statistics
 * Uses BCG_RTD_DB.DR_ContractSales for current data
 */
export async function getNewStartLogSummary(
  options: AEQueryOptions = {}
): Promise<NewStartLogSummary> {
  validateAEOptions(options, 'getNewStartLogSummary')
  const { salesPerson, daysBack = 60 } = options

  const sql = `
    WITH categorized AS (
      SELECT
        sales_id,
        contract_value,
        service_type_desc,
        CASE
          WHEN started_ind = 'Y' THEN 'completed'
          WHEN start_date IS NOT NULL AND start_date <= CURRENT_DATE() THEN 'in_progress'
          WHEN start_date IS NOT NULL THEN 'confirmed'
          WHEN DATE_DIFF(CURRENT_DATE(), sell_date, DAY) > 7 THEN 'scheduled'
          ELSE 'pending_ops'
        END as status
      FROM \`${PROJECT}.BCG_RTD_DB.DR_ContractSales\`
      WHERE sell_date >= DATE_SUB(CURRENT_DATE(), INTERVAL ${daysBack} DAY)
        ${salesPerson ? buildSalesPersonFilter('sales_person_nm') : ''}
    )
    SELECT
      COUNT(*) as total,
      COUNTIF(status = 'pending_ops') as pendingOps,
      COUNTIF(status = 'scheduled') as scheduled,
      COUNTIF(status = 'confirmed') as confirmed,
      COUNTIF(status = 'in_progress') as inProgress,
      COUNTIF(status = 'completed') as completed,
      0 as onHold,
      COALESCE(SUM(contract_value), 0) as totalInitialValue,
      COALESCE(SUM(CASE WHEN service_type_desc LIKE '%Contract%' THEN contract_value END), 0) as totalContractValue
    FROM categorized
  `

  try {
    const params: Record<string, unknown> = {}
    if (salesPerson) params.salesPerson = salesPerson

    const result = await bigQueryClient.queryWithParams<NewStartLogSummary>(sql, params)
    return result.rows[0] || {
      total: 0,
      pendingOps: 0,
      scheduled: 0,
      confirmed: 0,
      inProgress: 0,
      completed: 0,
      onHold: 0,
      totalInitialValue: 0,
      totalContractValue: 0,
    }
  } catch (error) {
    console.error('[AE] getNewStartLogSummary failed:', error)
    return {
      total: 0,
      pendingOps: 0,
      scheduled: 0,
      confirmed: 0,
      inProgress: 0,
      completed: 0,
      onHold: 0,
      totalInitialValue: 0,
      totalContractValue: 0,
    }
  }
}

// =============================================================================
// SALESFORCE Integration - Opportunities & Quotes (S0.Raw_RTXSF_*)
// =============================================================================

export interface SalesforceOpportunity {
  opportunityId: string
  opportunityName: string
  accountId: string
  accountName: string
  stageName: string
  amount: number
  probability: number
  createdDate: string
  closeDate: string
  ownerName: string
  isWon: boolean
  isClosed: boolean
  brand: string
  businessUnit: string
  pestPacBillToId: string | null
}

export interface SalesforceQuote {
  quoteId: string
  quoteName: string
  opportunityId: string
  accountName: string
  status: string
  totalAmount: number
  dateOfSale: string | null
  proposalDeliveredDate: string | null
  servicingBranch: string
  ownerName: string
  isApproved: boolean
}

/**
 * Get Salesforce opportunities for AE pipeline
 * Pulls from Raw_RTXSF_Opportunity_Daily with owner filter
 */
export async function getSalesforceOpportunities(
  options: AEQueryOptions = {}
): Promise<SalesforceOpportunity[]> {
  validateAEOptions(options, 'getSalesforceOpportunities')
  const { salesPerson, daysBack = 90, limit = 100 } = options

  const sql = `
    SELECT
      o.Id as opportunityId,
      o.Name as opportunityName,
      COALESCE(o.AccountId, '') as accountId,
      COALESCE(a.Name, '') as accountName,
      o.StageName as stageName,
      COALESCE(o.Amount, 0) as amount,
      COALESCE(o.Probability, 0) as probability,
      FORMAT_DATE('%Y-%m-%d', DATE(o.CreatedDate)) as createdDate,
      FORMAT_DATE('%Y-%m-%d', DATE(o.CloseDate)) as closeDate,
      COALESCE(e.Name, '') as ownerName,
      o.IsWon as isWon,
      o.IsClosed as isClosed,
      '' as brand,
      '' as businessUnit,
      '' as pestPacBillToId
    FROM \`${PROJECT}.S0.Raw_RTXSF_Opportunity_Daily\` o
    LEFT JOIN \`${PROJECT}.S0.Raw_RTXSF_Account_Daily\` a ON o.AccountId = a.Id
    LEFT JOIN \`${PROJECT}.S0.Raw_RTXSF_Employee__c_Daily\` e ON o.OwnerId = e.User__c
    WHERE o.CreatedDate >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${daysBack} DAY)
      ${salesPerson ? `AND (
        LOWER(e.Name) LIKE LOWER(CONCAT('%', @salesPerson, '%'))
      )` : ''}
    ORDER BY o.CreatedDate DESC
    LIMIT ${limit}
  `

  try {
    const params: Record<string, unknown> = {}
    if (salesPerson) params.salesPerson = salesPerson

    const result = await bigQueryClient.queryWithParams<SalesforceOpportunity>(sql, params)
    return result.rows
  } catch (error) {
    console.error('[AE] getSalesforceOpportunities failed:', error)
    return []
  }
}

/**
 * Get Salesforce quotes for proposal tracking
 */
export async function getSalesforceQuotes(
  options: AEQueryOptions = {}
): Promise<SalesforceQuote[]> {
  validateAEOptions(options, 'getSalesforceQuotes')
  const { salesPerson, daysBack = 90, limit = 100 } = options

  const sql = `
    SELECT
      q.Id as quoteId,
      q.Name as quoteName,
      q.OpportunityId as opportunityId,
      COALESCE(o.Name, '') as accountName,
      COALESCE(q.Status, '') as status,
      -- Calculate total from line items if quote total is 0
      CASE
        WHEN COALESCE(q.TotalPrice, 0) > 0 THEN q.TotalPrice
        ELSE COALESCE((
          SELECT SUM(COALESCE(qli.Total_Cost__c, qli.Subtotal, 0))
          FROM \`${PROJECT}.S0.Raw_RTXSF_QuoteLineItem_Daily\` qli
          WHERE qli.QuoteId = q.Id
        ), 0)
      END as totalAmount,
      FORMAT_DATE('%Y-%m-%d', DATE(q.Date_of_Sale__c)) as dateOfSale,
      FORMAT_DATE('%Y-%m-%d', DATE(q.CreatedDate)) as proposalDeliveredDate,
      '' as servicingBranch,
      COALESCE(e.Name, '') as ownerName,
      CASE
        WHEN q.Status = 'Accepted' THEN true
        WHEN q.Status = 'Approved' THEN true
        ELSE false
      END as isApproved
    FROM \`${PROJECT}.S0.Raw_RTXSF_Quote_Daily\` q
    LEFT JOIN \`${PROJECT}.S0.Raw_RTXSF_Opportunity_Daily\` o ON q.OpportunityId = o.Id
    LEFT JOIN \`${PROJECT}.S0.Raw_RTXSF_Employee__c_Daily\` e ON q.OwnerId = e.User__c
    WHERE q.CreatedDate >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${daysBack} DAY)
      ${salesPerson ? `AND (
        LOWER(e.Name) LIKE LOWER(CONCAT('%', @salesPerson, '%'))
      )` : ''}
    ORDER BY q.CreatedDate DESC
    LIMIT ${limit}
  `

  try {
    const params: Record<string, unknown> = {}
    if (salesPerson) params.salesPerson = salesPerson

    const result = await bigQueryClient.queryWithParams<SalesforceQuote>(sql, params)
    return result.rows
  } catch (error) {
    console.error('[AE] getSalesforceQuotes failed:', error)
    return []
  }
}

// =============================================================================
// INTEGRATED Dashboard - Combines Salesforce + PestPac + Xactly
// =============================================================================

export interface AEIntegratedDashboard {
  // From Salesforce
  openOpportunities: number
  proposalsDelivered: number
  pipelineValue: number
  // From PestPac
  contractsSold: number
  contractsStarted: number
  pendingStarts: number
  // From Xactly (compensation)
  isqValue: number
  startRate: number
  avgDealSize: number
}

/**
 * Get integrated AE dashboard combining all three data sources
 * Salesforce (pipeline) + PestPac (contracts) + Xactly (compensation)
 */
export async function getAEIntegratedDashboard(
  options: AEQueryOptions = {}
): Promise<AEIntegratedDashboard> {
  validateAEOptions(options, 'getAEIntegratedDashboard')
  const { salesPerson, daysBack = 90 } = options

  // Query 1: Salesforce pipeline metrics
  const sfSql = `
    SELECT
      COUNTIF(NOT IsClosed) as openOpportunities,
      COALESCE(SUM(CASE WHEN NOT IsClosed THEN Amount END), 0) as pipelineValue
    FROM \`${PROJECT}.S0.Raw_RTXSF_Opportunity_Daily\`
    WHERE CreatedDate >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${daysBack} DAY)
      ${salesPerson ? buildSalesPersonFilter('Owner_Name__c') : ''}
  `

  // Query 2: PestPac contract metrics
  const ppSql = `
    SELECT
      COUNT(*) as contractsSold,
      COUNTIF(StartedInd = 'Y') as contractsStarted,
      COUNTIF(StartedInd = 'N' OR StartedInd IS NULL) as pendingStarts
    FROM \`${PROJECT}.W3_Contract_Checker.T0_unf_Contract_All\`
    WHERE SellDate >= DATE_SUB(CURRENT_DATE(), INTERVAL ${daysBack} DAY)
      AND (RawCancelInd IS NULL OR RawCancelInd = 'N')
      ${salesPerson ? buildSalesPersonFilter('SalesPerson') : ''}
  `

  // Query 3: Xactly compensation metrics
  const xSql = `
    SELECT
      COALESCE(SUM(CASE WHEN started_ind = 'Y' THEN contract_value END), 0) as isqValue,
      SAFE_DIVIDE(COUNTIF(started_ind = 'Y'), COUNT(*)) as startRate,
      SAFE_DIVIDE(SUM(CASE WHEN started_ind = 'Y' THEN contract_value END), NULLIF(COUNTIF(started_ind = 'Y'), 0)) as avgDealSize
    FROM \`${PROJECT}.BCG_RTD_DB.DR_ContractSales\`
    WHERE sell_date >= DATE_SUB(CURRENT_DATE(), INTERVAL ${daysBack} DAY)
      ${salesPerson ? buildSalesPersonFilter('sales_person_nm') : ''}
  `

  // Query 4: Salesforce proposals delivered count
  // Note: Not filtering by salesPerson here as Owner_Name__c may not be available in all Quote records
  const quoteSql = `
    SELECT
      COUNTIF(Proposal_Delivered_Date__c IS NOT NULL) as proposalsDelivered
    FROM \`${PROJECT}.S0.Raw_RTXSF_Quote_Daily\`
    WHERE CreatedDate >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${daysBack} DAY)
  `

  try {
    const params: Record<string, unknown> = {}
    if (salesPerson) params.salesPerson = salesPerson

    // Run all queries in parallel
    const [sfResult, ppResult, xResult, quoteResult] = await Promise.all([
      bigQueryClient.queryWithParams<{ openOpportunities: number; pipelineValue: number }>(sfSql, params),
      bigQueryClient.queryWithParams<{ contractsSold: number; contractsStarted: number; pendingStarts: number }>(ppSql, params),
      bigQueryClient.queryWithParams<{ isqValue: number; startRate: number; avgDealSize: number }>(xSql, params),
      bigQueryClient.queryWithParams<{ proposalsDelivered: number }>(quoteSql, params),
    ])

    const sf = sfResult.rows[0] || { openOpportunities: 0, pipelineValue: 0 }
    const pp = ppResult.rows[0] || { contractsSold: 0, contractsStarted: 0, pendingStarts: 0 }
    const x = xResult.rows[0] || { isqValue: 0, startRate: 0, avgDealSize: 0 }
    const q = quoteResult.rows[0] || { proposalsDelivered: 0 }

    return {
      openOpportunities: sf.openOpportunities || 0,
      proposalsDelivered: q.proposalsDelivered || 0,
      pipelineValue: Number(sf.pipelineValue) || 0,
      contractsSold: pp.contractsSold || 0,
      contractsStarted: pp.contractsStarted || 0,
      pendingStarts: pp.pendingStarts || 0,
      isqValue: Number(x.isqValue) || 0,
      startRate: Number(x.startRate) || 0,
      avgDealSize: Number(x.avgDealSize) || 0,
    }
  } catch (error) {
    console.error('[AE] getAEIntegratedDashboard failed:', error)
    return {
      openOpportunities: 0,
      proposalsDelivered: 0,
      pipelineValue: 0,
      contractsSold: 0,
      contractsStarted: 0,
      pendingStarts: 0,
      isqValue: 0,
      startRate: 0,
      avgDealSize: 0,
    }
  }
}

// =============================================================================
// Monthly Totals Detail (for Sales Tracker Spreadsheet View)
// =============================================================================

export interface MonthlyTotalsDetail {
  month: number // 1-12
  year: number
  // Proposals by category
  proposalTermite: number
  proposalContract: number
  proposalJobWork: number
  proposalGrandTotal: number
  totalProposalsCount: number
  proposalsPerDay: number
  // Sales by category
  salesTermite: number
  salesContract: number
  salesJobWork: number
  salesGrandTotal: number
  totalSalesCount: number
  totalStartedSalesCount: number
  // Manual fields (to be overridden in UI)
  isq: number
  personalGoal: number
}

/**
 * Get monthly totals detail for a specific month
 * Matches the structure of the "2026 Totals" spreadsheet
 * Uses BCG_RTD_DB.DR_ContractSales for both proposals and sales
 */
export async function getMonthlyTotalsDetail(
  options: AEQueryOptions & { month?: number } = {}
): Promise<MonthlyTotalsDetail | null> {
  validateAEOptions(options, 'getMonthlyTotalsDetail')
  const {
    salesPerson,
    branch,
    region,
    market,
    year = new Date().getFullYear(),
    month = new Date().getMonth() + 1 // 1-12
  } = options

  const sql = `
    WITH monthly_sales AS (
      SELECT
        product_group,
        service_type_desc,
        contract_value,
        job_ini_value,
        job_non_ini_value,
        started_ind,
        sell_date
      FROM \`${PROJECT}.BCG_RTD_DB.DR_ContractSales\`
      WHERE EXTRACT(YEAR FROM sell_date) = @year
        AND EXTRACT(MONTH FROM sell_date) = @month
        ${salesPerson ? buildSalesPersonFilter('sales_person_nm') : ''}
        ${branch ? 'AND assigned_branch_code = @branch' : ''}
        ${region ? 'AND region_cd = @region' : ''}
        ${market ? 'AND market_cd = @market' : ''}
    ),
    business_days AS (
      SELECT COUNT(*) as days
      FROM UNNEST(GENERATE_DATE_ARRAY(
        DATE(@year, @month, 1),
        LAST_DAY(DATE(@year, @month, 1))
      )) as d
      WHERE EXTRACT(DAYOFWEEK FROM d) NOT IN (1, 7) -- Exclude Sunday (1) and Saturday (7)
    )
    SELECT
      @month as month,
      @year as year,
      -- Proposals (all records are proposals)
      COALESCE(SUM(CASE
        WHEN product_group IN ('T', 'TERM', 'WD', 'Termite') THEN contract_value
      END), 0) as proposalTermite,
      COALESCE(SUM(CASE
        WHEN service_type_desc LIKE '%Contract%' AND product_group NOT IN ('T', 'TERM', 'WD', 'Termite') THEN contract_value
      END), 0) as proposalContract,
      COALESCE(SUM(CASE
        WHEN service_type_desc LIKE '%Job%' OR service_type_desc LIKE '%Initial%' THEN (COALESCE(job_ini_value, 0) + COALESCE(job_non_ini_value, 0))
      END), 0) as proposalJobWork,
      COALESCE(SUM(COALESCE(contract_value, 0) + COALESCE(job_ini_value, 0) + COALESCE(job_non_ini_value, 0)), 0) as proposalGrandTotal,
      COUNT(*) as totalProposalsCount,
      SAFE_DIVIDE(COUNT(*), (SELECT days FROM business_days)) as proposalsPerDay,
      -- Sales (only started contracts)
      COALESCE(SUM(CASE
        WHEN started_ind = 'Y' AND product_group IN ('T', 'TERM', 'WD', 'Termite') THEN contract_value
      END), 0) as salesTermite,
      COALESCE(SUM(CASE
        WHEN started_ind = 'Y' AND service_type_desc LIKE '%Contract%' AND product_group NOT IN ('T', 'TERM', 'WD', 'Termite') THEN contract_value
      END), 0) as salesContract,
      COALESCE(SUM(CASE
        WHEN started_ind = 'Y' AND (service_type_desc LIKE '%Job%' OR service_type_desc LIKE '%Initial%') THEN (COALESCE(job_ini_value, 0) + COALESCE(job_non_ini_value, 0))
      END), 0) as salesJobWork,
      COALESCE(SUM(CASE WHEN started_ind = 'Y' THEN (COALESCE(contract_value, 0) + COALESCE(job_ini_value, 0) + COALESCE(job_non_ini_value, 0)) END), 0) as salesGrandTotal,
      COUNT(CASE WHEN started_ind = 'Y' THEN 1 END) as totalSalesCount,
      COUNT(CASE WHEN started_ind = 'Y' THEN 1 END) as totalStartedSalesCount,
      -- Manual fields (defaults, to be overridden in localStorage)
      COALESCE(SUM(CASE WHEN started_ind = 'Y' THEN (COALESCE(contract_value, 0) + COALESCE(job_ini_value, 0) + COALESCE(job_non_ini_value, 0)) END), 0) as isq,
      0 as personalGoal
    FROM monthly_sales
  `

  try {
    const params: Record<string, unknown> = {
      year,
      month
    }
    if (salesPerson) params.salesPerson = salesPerson
    if (branch) params.branch = branch
    if (region) params.region = region
    if (market) params.market = market

    const result = await bigQueryClient.queryWithParams<MonthlyTotalsDetail>(sql, params)
    return result.rows.length > 0 ? result.rows[0] : null
  } catch (error) {
    console.error('[AE] getMonthlyTotalsDetail failed:', error)
    return null
  }
}

// =============================================================================
// IRIS Integration - National/Commercial Accounts
// =============================================================================

export interface IRISNationalAccount {
  accountId: string
  accountName: string
  salesPersonName: string
  salesPersonId: string
  revenueAmount: number
  revenueDate: string
  branchId: string
  region: string
  market: string
}

/**
 * Get IRIS national account sales for a specific sales person
 * Pulls from S1.vw_iris_jde_daily_revenue_detail
 */
export async function getIRISNationalAccounts(
  options: AEQueryOptions = {}
): Promise<IRISNationalAccount[]> {
  validateAEOptions(options, 'getIRISNationalAccounts')
  const { salesPerson, daysBack = 90, limit = 100 } = options

  const sql = `
    SELECT
      CAST(Account_ID AS STRING) as accountId,
      Account_Name as accountName,
      Sales_Person_Name as salesPersonName,
      CAST(Sales_Person_ID AS STRING) as salesPersonId,
      COALESCE(Revenue_Amount, 0) as revenueAmount,
      FORMAT_DATE('%Y-%m-%d', Revenue_Date) as revenueDate,
      COALESCE(Branch_ID, '') as branchId,
      COALESCE(Region, '') as region,
      COALESCE(Market, '') as market
    FROM \`${PROJECT}.S1.vw_iris_jde_daily_revenue_detail\`
    WHERE Revenue_Date >= DATE_SUB(CURRENT_DATE(), INTERVAL ${daysBack} DAY)
      ${salesPerson ? `AND (
        LOWER(Sales_Person_Name) LIKE LOWER(CONCAT('%', @salesPerson, '%'))
        OR LOWER(Sales_Person_Name) LIKE LOWER(CONCAT('%', REPLACE(@salesPerson, ', ', '%'), '%'))
      )` : ''}
    ORDER BY Revenue_Date DESC
    LIMIT ${limit}
  `

  try {
    const params: Record<string, unknown> = {}
    if (salesPerson) params.salesPerson = salesPerson

    const result = await bigQueryClient.queryWithParams<IRISNationalAccount>(sql, params)
    return result.rows
  } catch (error) {
    console.error('[AE] getIRISNationalAccounts failed:', error)
    return []
  }
}

/**
 * Get IRIS national account summary for a sales person
 */
export async function getIRISNationalAccountSummary(
  options: AEQueryOptions = {}
): Promise<{ totalAccounts: number; totalRevenue: number; avgAccountValue: number }> {
  validateAEOptions(options, 'getIRISNationalAccountSummary')
  const { salesPerson, daysBack = 90 } = options

  const sql = `
    SELECT
      COUNT(DISTINCT Account_ID) as totalAccounts,
      COALESCE(SUM(Revenue_Amount), 0) as totalRevenue,
      COALESCE(AVG(Revenue_Amount), 0) as avgAccountValue
    FROM \`${PROJECT}.S1.vw_iris_jde_daily_revenue_detail\`
    WHERE Revenue_Date >= DATE_SUB(CURRENT_DATE(), INTERVAL ${daysBack} DAY)
      ${salesPerson ? `AND (
        LOWER(Sales_Person_Name) LIKE LOWER(CONCAT('%', @salesPerson, '%'))
        OR LOWER(Sales_Person_Name) LIKE LOWER(CONCAT('%', REPLACE(@salesPerson, ', ', '%'), '%'))
      )` : ''}
  `

  try {
    const params: Record<string, unknown> = {}
    if (salesPerson) params.salesPerson = salesPerson

    const result = await bigQueryClient.queryWithParams<{ totalAccounts: number; totalRevenue: number; avgAccountValue: number }>(sql, params)
    return result.rows[0] || { totalAccounts: 0, totalRevenue: 0, avgAccountValue: 0 }
  } catch (error) {
    console.error('[AE] getIRISNationalAccountSummary failed:', error)
    return { totalAccounts: 0, totalRevenue: 0, avgAccountValue: 0 }
  }
}
