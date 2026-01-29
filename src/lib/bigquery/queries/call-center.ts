/**
 * BigQuery Queries for Call Center Performance
 *
 * Data source: S0_TMX.Five9_CallLog_Export (59.8M rows)
 * Call center system: Five9 CTI (Computer Telephony Integration)
 *
 * Key columns (expected schema):
 * - call_id: Unique call identifier
 * - call_timestamp: Call start time
 * - call_duration_seconds: Call length in seconds
 * - call_outcome: Outcome (Connected, Voicemail, Busy, No Answer, etc.)
 * - call_direction: Inbound or Outbound
 * - agent_id: Five9 agent ID
 * - agent_name: Agent full name
 * - branch_id: Branch identifier (linked to RTX_Branch_Codes)
 * - customer_id: Customer/prospect identifier
 * - disposition: Call disposition code
 * - queue_time_seconds: Time in queue before answered
 * - talk_time_seconds: Active talk time
 * - wrap_time_seconds: After-call work time
 * - transfer_count: Number of transfers
 * - resolved_flag: First call resolution indicator
 *
 * Metrics:
 * - AHT (Average Handle Time): AVG(call_duration_seconds) in minutes
 * - FCR (First Call Resolution): COUNT(resolved_flag=1) / COUNT(*) * 100
 * - Connection Rate: COUNT(call_outcome='Connected') / COUNT(*) * 100
 * - ASA (Average Speed to Answer): AVG(queue_time_seconds) in seconds
 */

import { bigQueryClient, BIGQUERY_CONFIG } from '../client'
import { handleBigQueryError } from '../error-handler'
import { validateOrgCode, validateNumeric } from '../validation'
import { buildDateFilter, percentage } from './field-calculators'

// =============================================================================
// Types
// =============================================================================

export interface CallVolume {
  call_date: string
  total_calls: number
  inbound_calls: number
  outbound_calls: number
  connected_calls: number
  connection_rate: number
  avg_handle_time_minutes: number
}

export interface AgentPerformance {
  agent_id: string
  agent_name: string
  branch_id: string
  total_calls: number
  calls_handled: number
  avg_handle_time_minutes: number
  first_call_resolution_rate: number
  connection_rate: number
  total_talk_time_hours: number
  avg_queue_time_seconds: number
  productivity_score: number
}

export interface CallOutcome {
  outcome: string
  call_count: number
  percentage: number
  avg_duration_minutes: number
}

export interface HourlyDistribution {
  hour_of_day: number
  call_count: number
  inbound_count: number
  outbound_count: number
  avg_handle_time_minutes: number
  connection_rate: number
}

// =============================================================================
// Query Options
// =============================================================================

export interface CallCenterQueryOptions {
  daysBack?: number
  market?: string
  region?: string
  branch?: string
  agentId?: string
  limit?: number
  startDate?: string
  endDate?: string
}

// =============================================================================
// Queries
// =============================================================================

const PROJECT = BIGQUERY_CONFIG.projectId

/**
 * Build geographic filter conditions for call center queries
 * Joins with branch hierarchy when market or region filters are used
 */
function buildGeoFilterConditions(options: CallCenterQueryOptions): {
  join: string
  where: string
  params: Record<string, unknown>
} {
  const { market, region, branch } = options
  const params: Record<string, unknown> = {}
  let join = ''
  const whereConditions: string[] = []

  // If market or region is specified, we need to join with branch hierarchy
  if (market || region) {
    join = `LEFT JOIN \`${PROJECT}.S2.VwUnf_Branch\` b ON c.branch_id = b.RTX_Branch_Codes`

    if (market) {
      whereConditions.push('b.RTX_Market_Code = @market')
      params.market = market
    }
    if (region) {
      whereConditions.push('b.RTX_Region_Code = @region')
      params.region = region
    }
  }

  // Branch can be filtered directly on the call log table
  if (branch) {
    whereConditions.push('c.branch_id = @branch')
    params.branch = branch
  }

  return {
    join,
    where: whereConditions.length > 0 ? 'AND ' + whereConditions.join(' AND ') : '',
    params,
  }
}

/**
 * Get daily call volume with inbound/outbound split
 * Shows trend of call volume over time with connection rates
 */
export async function getCallVolume(
  options: CallCenterQueryOptions = {}
): Promise<CallVolume[]> {
  const { daysBack = 30 } = options
  const geoFilter = buildGeoFilterConditions(options)

  const sql = `
    SELECT
      FORMAT_DATE('%Y-%m-%d', DATE(c.call_timestamp)) as call_date,
      COUNT(*) as total_calls,
      COUNT(CASE WHEN c.call_direction = 'Inbound' THEN 1 END) as inbound_calls,
      COUNT(CASE WHEN c.call_direction = 'Outbound' THEN 1 END) as outbound_calls,
      COUNT(CASE WHEN c.call_outcome = 'Connected' THEN 1 END) as connected_calls,
      ${percentage('COUNT(CASE WHEN c.call_outcome = \'Connected\' THEN 1 END)', 'COUNT(*)')} as connection_rate,
      ROUND(AVG(c.call_duration_seconds) / 60.0, 2) as avg_handle_time_minutes
    FROM \`${PROJECT}.S0_TMX.Five9_CallLog_Export\` c
    ${geoFilter.join}
    WHERE c.call_timestamp IS NOT NULL
      AND ${buildDateFilter('c.call_timestamp', daysBack)}
      ${geoFilter.where}
    GROUP BY FORMAT_DATE('%Y-%m-%d', DATE(c.call_timestamp))
    ORDER BY call_date DESC
  `

  try {
    const result = await bigQueryClient.queryWithParams<CallVolume>(sql, geoFilter.params)
    return result.rows
  } catch (error: any) {
    // If Five9_CallLog_Export table doesn't exist, return empty data gracefully
    if (error?.message?.includes('Five9_CallLog_Export') && error?.message?.includes('not found')) {
      console.log('[getCallVolume] Five9_CallLog_Export table not available, returning empty data')
      return []
    }
    throw handleBigQueryError(error, 'getCallVolume')
  }
}

/**
 * Get agent performance rankings
 * Ranks agents by calls handled, AHT, FCR, and productivity
 */
export async function getAgentPerformance(
  options: CallCenterQueryOptions = {}
): Promise<AgentPerformance[]> {
  const { daysBack = 30, limit = 50, agentId } = options
  const geoFilter = buildGeoFilterConditions(options)

  // Merge agent filter with geo filter params
  const params = { ...geoFilter.params }
  if (agentId) params.agentId = agentId

  const sql = `
    SELECT
      c.agent_id,
      COALESCE(c.agent_name, 'Unknown Agent') as agent_name,
      COALESCE(c.branch_id, 'Unknown') as branch_id,
      COUNT(*) as total_calls,
      COUNT(CASE WHEN c.call_outcome = 'Connected' THEN 1 END) as calls_handled,
      ROUND(AVG(c.call_duration_seconds) / 60.0, 2) as avg_handle_time_minutes,
      ${percentage('COUNT(CASE WHEN c.resolved_flag = 1 THEN 1 END)', 'NULLIF(COUNT(CASE WHEN c.call_outcome = \'Connected\' THEN 1 END), 0)')} as first_call_resolution_rate,
      ${percentage('COUNT(CASE WHEN c.call_outcome = \'Connected\' THEN 1 END)', 'COUNT(*)')} as connection_rate,
      ROUND(SUM(COALESCE(c.talk_time_seconds, 0)) / 3600.0, 2) as total_talk_time_hours,
      ROUND(AVG(COALESCE(c.queue_time_seconds, 0)), 1) as avg_queue_time_seconds,
      -- Productivity score: weighted average of key metrics
      ROUND(
        (${percentage('COUNT(CASE WHEN c.call_outcome = \'Connected\' THEN 1 END)', 'COUNT(*)')} * 0.4) +
        (${percentage('COUNT(CASE WHEN c.resolved_flag = 1 THEN 1 END)', 'NULLIF(COUNT(CASE WHEN c.call_outcome = \'Connected\' THEN 1 END), 0)')} * 0.4) +
        (CASE WHEN AVG(c.call_duration_seconds) > 0 THEN LEAST((300.0 / AVG(c.call_duration_seconds)) * 100, 100) ELSE 0 END * 0.2),
        1
      ) as productivity_score
    FROM \`${PROJECT}.S0_TMX.Five9_CallLog_Export\` c
    ${geoFilter.join}
    WHERE c.call_timestamp IS NOT NULL
      AND ${buildDateFilter('c.call_timestamp', daysBack)}
      AND c.agent_id IS NOT NULL
      ${geoFilter.where}
      ${agentId ? 'AND c.agent_id = @agentId' : ''}
    GROUP BY c.agent_id, c.agent_name, c.branch_id
    HAVING total_calls >= 10  -- Minimum 10 calls for statistical significance
    ORDER BY productivity_score DESC
    LIMIT ${limit}
  `

  try {
    const result = await bigQueryClient.queryWithParams<AgentPerformance>(sql, params)
    return result.rows
  } catch (error: any) {
    // If Five9_CallLog_Export table doesn't exist, return empty data gracefully
    if (error?.message?.includes('Five9_CallLog_Export') && error?.message?.includes('not found')) {
      console.log('[getAgentPerformance] Five9_CallLog_Export table not available, returning empty data')
      return []
    }
    throw handleBigQueryError(error, 'getAgentPerformance')
  }
}

/**
 * Get call outcomes breakdown
 * Shows distribution of call outcomes (Connected, Voicemail, Busy, etc.)
 */
export async function getCallOutcomes(
  options: CallCenterQueryOptions = {}
): Promise<CallOutcome[]> {
  const { daysBack = 30, limit = 20 } = options
  const geoFilter = buildGeoFilterConditions(options)

  const sql = `
    WITH total_calls AS (
      SELECT COUNT(*) as total FROM \`${PROJECT}.S0_TMX.Five9_CallLog_Export\` c
      ${geoFilter.join}
      WHERE c.call_timestamp IS NOT NULL
        AND ${buildDateFilter('c.call_timestamp', daysBack)}
        ${geoFilter.where}
    )
    SELECT
      COALESCE(c.call_outcome, 'Unknown') as outcome,
      COUNT(*) as call_count,
      ${percentage('COUNT(*)', '(SELECT total FROM total_calls)')} as percentage,
      ROUND(AVG(c.call_duration_seconds) / 60.0, 2) as avg_duration_minutes
    FROM \`${PROJECT}.S0_TMX.Five9_CallLog_Export\` c
    ${geoFilter.join}
    WHERE c.call_timestamp IS NOT NULL
      AND ${buildDateFilter('c.call_timestamp', daysBack)}
      ${geoFilter.where}
    GROUP BY c.call_outcome
    ORDER BY call_count DESC
    LIMIT ${limit}
  `

  try {
    const result = await bigQueryClient.queryWithParams<CallOutcome>(sql, geoFilter.params)
    return result.rows
  } catch (error: any) {
    // If Five9_CallLog_Export table doesn't exist, return empty data gracefully
    if (error?.message?.includes('Five9_CallLog_Export') && error?.message?.includes('not found')) {
      console.log('[getCallOutcomes] Five9_CallLog_Export table not available, returning empty data')
      return []
    }
    throw handleBigQueryError(error, 'getCallOutcomes')
  }
}

/**
 * Get hourly call distribution
 * Shows call volume by hour of day for staffing optimization
 */
export async function getHourlyDistribution(
  options: CallCenterQueryOptions = {}
): Promise<HourlyDistribution[]> {
  const { daysBack = 30 } = options
  const geoFilter = buildGeoFilterConditions(options)

  const sql = `
    SELECT
      EXTRACT(HOUR FROM c.call_timestamp) as hour_of_day,
      COUNT(*) as call_count,
      COUNT(CASE WHEN c.call_direction = 'Inbound' THEN 1 END) as inbound_count,
      COUNT(CASE WHEN c.call_direction = 'Outbound' THEN 1 END) as outbound_count,
      ROUND(AVG(c.call_duration_seconds) / 60.0, 2) as avg_handle_time_minutes,
      ${percentage('COUNT(CASE WHEN c.call_outcome = \'Connected\' THEN 1 END)', 'COUNT(*)')} as connection_rate
    FROM \`${PROJECT}.S0_TMX.Five9_CallLog_Export\` c
    ${geoFilter.join}
    WHERE c.call_timestamp IS NOT NULL
      AND ${buildDateFilter('c.call_timestamp', daysBack)}
      ${geoFilter.where}
    GROUP BY EXTRACT(HOUR FROM c.call_timestamp)
    ORDER BY hour_of_day
  `

  try {
    const result = await bigQueryClient.queryWithParams<HourlyDistribution>(sql, geoFilter.params)
    return result.rows
  } catch (error: any) {
    // If Five9_CallLog_Export table doesn't exist, return empty data gracefully
    if (error?.message?.includes('Five9_CallLog_Export') && error?.message?.includes('not found')) {
      console.log('[getHourlyDistribution] Five9_CallLog_Export table not available, returning empty data')
      return []
    }
    throw handleBigQueryError(error, 'getHourlyDistribution')
  }
}
