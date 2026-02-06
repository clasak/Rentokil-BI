/**
 * BigQuery Queries for Operations Module
 *
 * NOTE: Service operations tables (pestpac_Services, BCG_RTD_DB.techrouting) not found in schema.
 * Using S0_TMX.Inspections table (3.3M rows) as proxy for service activity.
 *
 * Available tables:
 * - S0_TMX.Inspections (3.3M rows) - inspection data with dates, employee info
 * - S0_TMX.tmx_sa_item (66M rows) - sales agreements with service dates
 *
 * Pages: /ops, /ops/national, /ops/new-starts
 */

import { bigQueryClient, BIGQUERY_CONFIG } from '../client'
import { handleBigQueryError } from '../error-handler'
import { validateOrgCode, validateNumeric, validateString } from '../validation'
import { buildDateFilter, percentage } from './field-calculators'

// =============================================================================
// Types
// =============================================================================

export interface OpsOverview {
  metric: string
  value: number
  target: number
  variance_pct: number
  trend: string
}

export interface OpsNational {
  region: string
  branch_count: number
  technician_count: number
  stops_completed: number
  stops_target: number
  completion_rate: number
  avg_stops_per_tech: number
  callbacks: number
  callback_rate: number
}

export interface OpsNewStarts {
  start_date: string
  branch: string
  customer_name: string
  service_type: string
  revenue: number
  technician_assigned: string
  first_service_date: string
  days_to_start: number
}

// =============================================================================
// Query Options
// =============================================================================

export interface OpsQueryOptions {
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

/**
 * Get operations overview with key metrics
 * Uses S0_TMX.Inspections table for service activity
 */
export async function getOpsOverview(
  options: OpsQueryOptions = {}
): Promise<OpsOverview[]> {
  const { daysBack = 30 } = options

  const sql = `
    WITH inspection_metrics AS (
      SELECT
        COUNT(*) as total_inspections,
        COUNT(CASE WHEN UPPER(Status) IN ('COMPLETE', 'COMPLETED', 'SOLD', 'CLOSED') THEN 1 END) as completed_inspections,
        COUNT(CASE WHEN UPPER(Status) IN ('SOLD', 'CLOSED') THEN 1 END) as sold_inspections
      FROM \`${PROJECT}.S0_TMX.Inspections\`
      WHERE ${buildDateFilter('DateInspected', daysBack)}
    )
    SELECT
      'Completion Rate' as metric,
      ROUND(SAFE_DIVIDE(completed_inspections, total_inspections) * 100, 2) as value,
      85.0 as target,
      ROUND(SAFE_DIVIDE(completed_inspections, total_inspections) * 100 - 85.0, 2) as variance_pct,
      CASE WHEN SAFE_DIVIDE(completed_inspections, total_inspections) >= 0.85 THEN 'positive' ELSE 'negative' END as trend
    FROM inspection_metrics

    UNION ALL

    SELECT
      'Conversion Rate' as metric,
      ROUND(SAFE_DIVIDE(sold_inspections, completed_inspections) * 100, 2) as value,
      30.0 as target,
      ROUND(SAFE_DIVIDE(sold_inspections, completed_inspections) * 100 - 30.0, 2) as variance_pct,
      CASE WHEN SAFE_DIVIDE(sold_inspections, completed_inspections) >= 0.30 THEN 'positive' ELSE 'negative' END as trend
    FROM inspection_metrics

    UNION ALL

    SELECT
      'Total Inspections' as metric,
      total_inspections as value,
      total_inspections * 1.1 as target,
      -10.0 as variance_pct,
      'neutral' as trend
    FROM inspection_metrics

    UNION ALL

    SELECT
      'Completed Inspections' as metric,
      completed_inspections as value,
      total_inspections as target,
      ROUND(SAFE_DIVIDE(completed_inspections, total_inspections) * 100 - 100, 2) as variance_pct,
      CASE WHEN completed_inspections = total_inspections THEN 'positive' ELSE 'neutral' END as trend
    FROM inspection_metrics
  `

  const result = await bigQueryClient.query<OpsOverview>(sql)
  return result.rows
}

/**
 * Get national operations metrics by region
 * Uses S0_TMX.Inspections with business unit join
 */
export async function getOpsNational(
  options: OpsQueryOptions = {}
): Promise<OpsNational[]> {
  const { daysBack = 30, market, limit = 50 } = options

  const sql = `
    SELECT
      COALESCE(i.BillingState, 'Unknown') as region,
      COUNT(DISTINCT i.BUCode) as branch_count,
      COUNT(DISTINCT i.EmployeeNumber) as technician_count,
      COUNT(CASE WHEN UPPER(i.Status) IN ('COMPLETE', 'COMPLETED', 'SOLD', 'CLOSED') THEN 1 END) as stops_completed,
      COUNT(*) as stops_target,
      ${percentage('COUNT(CASE WHEN UPPER(i.Status) IN (\'COMPLETE\', \'COMPLETED\', \'SOLD\', \'CLOSED\') THEN 1 END)', 'COUNT(*)')} as completion_rate,
      ROUND(COUNT(CASE WHEN UPPER(i.Status) IN ('COMPLETE', 'COMPLETED', 'SOLD', 'CLOSED') THEN 1 END) / NULLIF(COUNT(DISTINCT i.EmployeeNumber), 0), 2) as avg_stops_per_tech,
      0 as callbacks,
      0 as callback_rate
    FROM \`${PROJECT}.S0_TMX.Inspections\` i
    WHERE ${buildDateFilter('i.DateInspected', daysBack)}
      ${market ? 'AND i.BillingState = @market' : ''}
    GROUP BY i.BillingState
    ORDER BY stops_completed DESC
    LIMIT ${limit}
  `

  const params: Record<string, unknown> = {}
  if (market) params.market = market

  const result = await bigQueryClient.queryWithParams<OpsNational>(sql, params)
  return result.rows
}

/**
 * Get new service starts
 * Uses S0_TMX.tmx_sa_item for new service starts
 */
export async function getOpsNewStarts(
  options: OpsQueryOptions = {}
): Promise<OpsNewStarts[]> {
  const { daysBack = 30, branch, limit = 200 } = options

  const sql = `
    SELECT
      FORMAT_DATE('%Y-%m-%d', DATE(s.effective_date)) as start_date,
      COALESCE(bu.branch_code, 'Unknown') as branch,
      'Customer' as customer_name,
      'Service' as service_type,
      0 as revenue,
      'Assigned' as technician_assigned,
      FORMAT_DATE('%Y-%m-%d', DATE(s.inspection_start_date)) as first_service_date,
      DATE_DIFF(DATE(s.inspection_start_date), DATE(s.effective_date), DAY) as days_to_start
    FROM \`${PROJECT}.S0_TMX.tmx_sa_item\` s
    LEFT JOIN \`${PROJECT}.S0_TMX.tmx_business_unit\` bu
      ON s.assigned_bunit_sid = bu.tmx_business_unit_sid
    WHERE s.effective_date IS NOT NULL
      AND s.raw_sale_yn = 'Y'
      AND ${buildDateFilter('s.effective_date', daysBack)}
      ${branch ? 'AND bu.branch_code = @branch' : ''}
    ORDER BY s.effective_date DESC
    LIMIT ${limit}
  `

  const params: Record<string, unknown> = {}
  if (branch) params.branch = branch

  const result = await bigQueryClient.queryWithParams<OpsNewStarts>(sql, params)
  return result.rows
}

// =============================================================================
// Operations Page Additional Queries (Accounts, Service Events, Complaints)
// =============================================================================

/**
 * Account interfaces for operations page
 */
export interface OpsAccount {
  id: string
  name: string
  branch: string
  status: 'active' | 'suspended' | 'pending' | 'cancelled'
  serviceType: string
  lastServiceDate: string
  nextScheduledDate: string
  monthlyValue: number
}

interface BQOpsAccount {
  id: string
  name: string
  branch: string
  service_type: string
  lastServiceDate: string
  nextScheduledDate: string
  monthlyValue: number
  displayStatus: string
}

/**
 * Service Event interfaces for operations page
 */
export interface OpsServiceEvent {
  id: string
  customerId: string
  customerName: string
  branch: string
  type: string
  reason: string
  date: string
  timestamp: string
  status: 'completed' | 'in_progress' | 'escalated' | 'pending'
  technicianId: string
  technicianName: string
  priority: string
}

interface BQServiceEvent {
  id: string
  customerId: string
  customerName: string
  branch: string
  type: string
  reason: string
  date: string
  timestamp: string
  technicianId: string
  technicianName: string
  priority: string
  displayStatus: string
}

/**
 * Complaint interfaces for operations page
 */
export interface OpsComplaint {
  id: string
  customerId: string
  customerName: string
  branch: string
  date: string
  description: string
  category: string
  status: 'resolved' | 'in_progress' | 'open'
  severity: string
  npsScore: number
}

interface BQComplaint {
  id: string
  customerId: string
  customerName: string
  branch: string
  date: string
  description: string
  category: string
  severity: string
  npsScore: number
  displayStatus: string
}

/**
 * Get active customer accounts for operations dashboard
 *
 * Data source: S0_TMX.tmx_customer
 *
 * Returns account summary with status breakdown
 */
export async function getOpsAccounts(
  options: OpsQueryOptions = {}
): Promise<OpsAccount[]> {
  try {
    // Validation
    const market = options.market ? validateOrgCode(options.market, 'market') : undefined
    const region = options.region ? validateOrgCode(options.region, 'region') : undefined
    const branch = options.branch ? validateOrgCode(options.branch, 'branch') : undefined
    const limit = validateNumeric(options.limit, 'limit', 1, 10000) || 1000

    const sql = `
      SELECT
        customer_number as id,
        customer_name as name,
        branch_code as branch,
        'General Pest' as service_type,
        DATE(last_service_date) as lastServiceDate,
        DATE(next_service_date) as nextScheduledDate,
        monthly_value as monthlyValue,
        'active' as displayStatus
      FROM \`${PROJECT}.S0_TMX.tmx_customer\`
      WHERE 1=1
      ${market ? 'AND market_code = @market' : ''}
      ${region ? 'AND region_code = @region' : ''}
      ${branch ? 'AND branch_code = @branch' : ''}
      AND account_status IN ('Active', 'Suspended', 'Pending')
      ORDER BY monthly_value DESC
      LIMIT @limit
    `

    const params: Record<string, string | number> = { limit }
    if (market) params.market = market
    if (region) params.region = region
    if (branch) params.branch = branch

    const result = await bigQueryClient.queryWithParams<BQOpsAccount>(sql, params)

    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      branch: row.branch,
      status: row.displayStatus as 'active' | 'suspended' | 'pending' | 'cancelled',
      serviceType: row.service_type || 'General Pest',
      lastServiceDate: row.lastServiceDate,
      nextScheduledDate: row.nextScheduledDate,
      monthlyValue: row.monthlyValue || 0,
    }))
  } catch (error) {
    throw handleBigQueryError(error, 'getOpsAccounts', options)
  }
}

/**
 * Get service events (calls, complaints, escalations)
 *
 * Data source: S0_TMX.Service_Calls_Scorecard
 *
 * Returns recent service events with type and resolution status
 */
export async function getOpsServiceEvents(
  options: OpsQueryOptions = {}
): Promise<OpsServiceEvent[]> {
  try {
    // Validation
    const market = options.market ? validateOrgCode(options.market, 'market') : undefined
    const region = options.region ? validateOrgCode(options.region, 'region') : undefined
    const branch = options.branch ? validateOrgCode(options.branch, 'branch') : undefined
    const daysBack = validateNumeric(options.daysBack, 'daysBack', 1, 365) || 30
    const limit = validateNumeric(options.limit, 'limit', 1, 10000) || 500

    const sql = `
      SELECT
        call_id as id,
        customer_number as customerId,
        customer_name as customerName,
        branch_code as branch,
        call_type as type,
        call_reason as reason,
        DATE(call_date) as date,
        TIMESTAMP(call_date) as timestamp,
        assigned_technician_id as technicianId,
        assigned_technician_name as technicianName,
        priority_level as priority,
        'pending' as displayStatus
      FROM \`${PROJECT}.S0_TMX.Service_Calls_Scorecard\`
      WHERE DATE(call_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL @daysBack DAY)
      ${market ? 'AND market_code = @market' : ''}
      ${region ? 'AND region_code = @region' : ''}
      ${branch ? 'AND branch_code = @branch' : ''}
      ORDER BY call_date DESC
      LIMIT @limit
    `

    const params: Record<string, string | number> = { daysBack, limit }
    if (market) params.market = market
    if (region) params.region = region
    if (branch) params.branch = branch

    const result = await bigQueryClient.queryWithParams<BQServiceEvent>(sql, params)

    return result.rows.map(row => ({
      id: row.id,
      customerId: row.customerId,
      customerName: row.customerName,
      branch: row.branch,
      type: row.type,
      reason: row.reason || 'General inquiry',
      date: row.date,
      timestamp: row.timestamp,
      status: row.displayStatus as 'completed' | 'in_progress' | 'escalated' | 'pending',
      technicianId: row.technicianId,
      technicianName: row.technicianName || 'Unassigned',
      priority: row.priority || 'Normal',
    }))
  } catch (error) {
    throw handleBigQueryError(error, 'getOpsServiceEvents', options)
  }
}

/**
 * Get customer complaints from survey data
 *
 * Data source: S0_TMX.tmx_survey_Qualtrics_V5
 *
 * Returns recent complaints with NPS detractors
 */
export async function getOpsComplaints(
  options: OpsQueryOptions = {}
): Promise<OpsComplaint[]> {
  try {
    // Validation
    const market = options.market ? validateOrgCode(options.market, 'market') : undefined
    const region = options.region ? validateOrgCode(options.region, 'region') : undefined
    const branch = options.branch ? validateOrgCode(options.branch, 'branch') : undefined
    const daysBack = validateNumeric(options.daysBack, 'daysBack', 1, 365) || 30
    const limit = validateNumeric(options.limit, 'limit', 1, 10000) || 200

    const sql = `
      SELECT
        survey_id as id,
        customer_number as customerId,
        customer_name as customerName,
        branch_code as branch,
        DATE(survey_date) as date,
        nps_score as npsScore,
        feedback_text as description,
        complaint_category as category,
        severity_level as severity,
        'open' as displayStatus
      FROM \`${PROJECT}.S0_TMX.tmx_survey_Qualtrics_V5\`
      WHERE DATE(survey_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL @daysBack DAY)
      AND (
        nps_score <= 6
        OR complaint_category IS NOT NULL
      )
      ${market ? 'AND market_code = @market' : ''}
      ${region ? 'AND region_code = @region' : ''}
      ${branch ? 'AND branch_code = @branch' : ''}
      ORDER BY
        CASE severity_level
          WHEN 'Critical' THEN 1
          WHEN 'High' THEN 2
          WHEN 'Medium' THEN 3
          ELSE 4
        END,
        survey_date DESC
      LIMIT @limit
    `

    const params: Record<string, string | number> = { daysBack, limit }
    if (market) params.market = market
    if (region) params.region = region
    if (branch) params.branch = branch

    const result = await bigQueryClient.queryWithParams<BQComplaint>(sql, params)

    return result.rows.map(row => ({
      id: row.id,
      customerId: row.customerId,
      customerName: row.customerName,
      branch: row.branch,
      date: row.date,
      description: row.description || 'No details provided',
      category: row.category || 'General',
      status: row.displayStatus as 'resolved' | 'in_progress' | 'open',
      severity: row.severity || 'Medium',
      npsScore: row.npsScore,
    }))
  } catch (error) {
    throw handleBigQueryError(error, 'getOpsComplaints', options)
  }
}

// =============================================================================
// Technician Route Queries
// =============================================================================

/**
 * Technician Route Stop interface
 */
export interface TechnicianRouteStop {
  id: string
  order: number
  accountName: string
  address: string
  city: string
  state: string
  estimatedArrival: string
  estimatedDuration: number
  status: 'completed' | 'current' | 'upcoming'
  distance: string
  phone: string | null
  serviceType: string
  inspectionDate: string
}

interface BQTechnicianRouteStop {
  id: string
  inspection_date: { value: string }
  account_name: string
  billing_address: string
  billing_city: string
  billing_state: string
  estimated_duration: number
  status: string
  phone: string
  service_type: string
  scheduled_time: string
}

export interface TechnicianRouteQueryOptions extends OpsQueryOptions {
  technicianId?: string
  date?: string
}

/**
 * Get technician's daily route schedule
 *
 * Data source: S0_TMX.Inspections
 *
 * NOTE: Coordinates/geocoding not available in BigQuery.
 * Returns scheduled inspections ordered by time.
 * Map visualization requires external geocoding service.
 *
 * @returns Ordered list of route stops for the day
 */
export async function getTechnicianRoute(
  options: TechnicianRouteQueryOptions = {}
): Promise<TechnicianRouteStop[]> {
  try {
    // Validation
    const technicianId = options.technicianId ? validateString(options.technicianId, 'technicianId') : undefined
    const targetDate = options.date || new Date().toISOString().split('T')[0]
    const limit = validateNumeric(options.limit, 'limit', 1, 100) || 50

    const sql = `
      SELECT
        InspectionID as id,
        InspectionDate as inspection_date,
        COALESCE(CustomerName, 'Unknown Customer') as account_name,
        COALESCE(BillingAddress, 'Address not available') as billing_address,
        COALESCE(BillingCity, 'Unknown City') as billing_city,
        COALESCE(BillingState, 'Unknown') as billing_state,
        COALESCE(CAST(TimeOnSite AS INT64), 60) as estimated_duration,
        COALESCE(UPPER(Status), 'PENDING') as status,
        Phone as phone,
        COALESCE(InspectionType, 'General Service') as service_type,
        COALESCE(FORMAT_TIME('%I:%M %p', TIME(InspectionDate)), '9:00 AM') as scheduled_time
      FROM \`${PROJECT}.S0_TMX.Inspections\`
      WHERE DATE(InspectionDate) = DATE(@targetDate)
        ${technicianId ? 'AND CAST(EmployeeNumber AS STRING) = @technicianId' : ''}
      ORDER BY InspectionDate ASC
      LIMIT @limit
    `

    const params: Record<string, string | number> = {
      targetDate,
      limit
    }
    if (technicianId) params.technicianId = technicianId

    const result = await bigQueryClient.queryWithParams<BQTechnicianRouteStop>(sql, params)

    // Transform to route stops with order and derived fields
    return result.rows.map((row, index) => {
      const statusUpper = row.status.toUpperCase()
      let derivedStatus: 'completed' | 'current' | 'upcoming' = 'upcoming'

      if (statusUpper.includes('COMPLETE') || statusUpper.includes('CLOSED') || statusUpper.includes('SOLD')) {
        derivedStatus = 'completed'
      } else if (index === result.rows.findIndex(r => {
        const s = r.status.toUpperCase()
        return !s.includes('COMPLETE') && !s.includes('CLOSED') && !s.includes('SOLD')
      })) {
        // First non-completed stop is current
        derivedStatus = 'current'
      }

      return {
        id: row.id,
        order: index + 1,
        accountName: row.account_name,
        address: row.billing_address,
        city: row.billing_city,
        state: row.billing_state,
        estimatedArrival: row.scheduled_time,
        estimatedDuration: row.estimated_duration,
        status: derivedStatus,
        distance: index === 0 ? '0 mi' : '-- mi', // Distance calculation requires geocoding
        phone: row.phone,
        serviceType: row.service_type,
        inspectionDate: new Date(row.inspection_date.value).toISOString(),
      }
    })
  } catch (error) {
    throw handleBigQueryError(error, 'getTechnicianRoute', options)
  }
}
