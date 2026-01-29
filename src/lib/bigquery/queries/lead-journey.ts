/**
 * BigQuery Queries for Lead Journey Tracking
 *
 * Data sources:
 * - BCG_RTD_DB.DR_Leads: 3.3M rows - Lead analytics with source/channel/market_type
 * - S4.Fact_Leads_Acc_Daily_Dtls_Snp: 11.8M rows - Lead funnel stages
 *
 * Key columns in DR_Leads:
 * - market_type: 'Residential' | 'Commercial' | other
 * - lead_source: Source system (Web, Phone, Email, Referral, etc.)
 * - lead_channel_1: Marketing channel
 * - lead_type: Lead status/outcome
 * - received_date: Lead received timestamp
 */

import { bigQueryClient, BIGQUERY_CONFIG } from '../client'
import { handleBigQueryError } from '../error-handler'
import { validateOrgCode, validateNumeric, validateString } from '../validation'

// =============================================================================
// Types
// =============================================================================

export interface LeadJourneyByChannel {
  channel: string
  channel_name: string
  market_type: string
  total_leads: number
  matched_leads: number
  match_rate: number
  converted_leads: number
  conversion_rate: number
  missing_count: number
}

export interface LeadJourneyTrend {
  date: string
  channel: string
  market_type: string
  total_leads: number
  matched_leads: number
  match_rate: number
}

export interface LeadJourneySummary {
  total_leads: number
  residential_leads: number
  commercial_leads: number
  matched_leads: number
  overall_match_rate: number
  channels_above_target: number
  channels_below_target: number
  critical_channels: number
}

export interface LeadGapAnalysisRow {
  channel: string
  channel_name: string
  market_type: string
  total_unmatched: number
  missing_source: number
  missing_contact: number
  missing_account: number
  top_issue: string
}

export interface LeadFunnelByChannel {
  channel: string
  market_type: string
  mql_count: number
  scheduled_count: number
  inspected_count: number
  proposed_count: number
  sold_count: number
  canceled_count: number
}

// =============================================================================
// Query Options
// =============================================================================

export interface LeadJourneyQueryOptions {
  daysBack?: number
  marketType?: 'Residential' | 'Commercial' | 'all'
  channel?: string
  limit?: number
}

// =============================================================================
// Channel Mapping
// =============================================================================

/**
 * Map BigQuery lead_source values to our channel taxonomy
 */
const CHANNEL_MAP: Record<string, { id: string; name: string; baseline: number }> = {
  'Trusted Advisor': { id: 'trusted_advisor', name: 'Trusted Advisor', baseline: 100 },
  'TAP': { id: 'trusted_advisor', name: 'Trusted Advisor', baseline: 100 },
  'Tech Referral': { id: 'trusted_advisor', name: 'Trusted Advisor', baseline: 100 },
  'CCM': { id: 'ccm', name: 'CCM (Winning Formula)', baseline: 96.1 },
  'Winning Formula': { id: 'ccm', name: 'CCM (Winning Formula)', baseline: 96.1 },
  'Invoca': { id: 'invoca', name: 'Invoca', baseline: 53.9 },
  'Phone': { id: 'invoca', name: 'Invoca', baseline: 53.9 },
  'Inbound Call': { id: 'invoca', name: 'Invoca', baseline: 53.9 },
  'Web': { id: 'web_form', name: 'Web Form', baseline: 9.6 },
  'Web Form': { id: 'web_form', name: 'Web Form', baseline: 9.6 },
  'Website': { id: 'web_form', name: 'Web Form', baseline: 9.6 },
  'Online': { id: 'web_form', name: 'Web Form', baseline: 9.6 },
  'Email': { id: 'email_chat', name: 'Email/Chat', baseline: 3.1 },
  'Chat': { id: 'email_chat', name: 'Email/Chat', baseline: 3.1 },
  'Email/Chat': { id: 'email_chat', name: 'Email/Chat', baseline: 3.1 },
  'Marketing': { id: 'marketing', name: 'Marketing', baseline: 30.1 },
  'Campaign': { id: 'marketing', name: 'Marketing', baseline: 30.1 },
  'Referral': { id: 'referral', name: 'Referral', baseline: 70 },
  'Customer Referral': { id: 'referral', name: 'Referral', baseline: 70 },
  'Partner': { id: 'partner', name: 'Partner', baseline: 70 },
  'Affiliate': { id: 'partner', name: 'Partner', baseline: 70 },
}

function mapChannel(source: string): { id: string; name: string; baseline: number } {
  // Try exact match first
  if (CHANNEL_MAP[source]) {
    return CHANNEL_MAP[source]
  }
  // Try partial match
  for (const [key, value] of Object.entries(CHANNEL_MAP)) {
    if (source.toLowerCase().includes(key.toLowerCase())) {
      return value
    }
  }
  // Default
  return { id: 'other', name: source || 'Other', baseline: 50 }
}

// =============================================================================
// Queries
// =============================================================================

const PROJECT = BIGQUERY_CONFIG.projectId
const BCG_DATASET = 'BCG_RTD_DB'
const S4_DATASET = 'S4'

/**
 * Get lead journey metrics by channel and market type
 * Uses BCG_RTD_DB.DR_Leads for source attribution
 */
export async function getLeadJourneyByChannel(
  options: LeadJourneyQueryOptions = {}
): Promise<LeadJourneyByChannel[]> {
  const { daysBack = 30, marketType = 'all', limit = 100 } = options

  let whereClause = `DATE(received_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${daysBack} DAY)`
  if (marketType !== 'all') {
    whereClause += ` AND market_type = @marketType`
  }

  const sql = `
    WITH lead_data AS (
      SELECT
        COALESCE(lead_source, 'Unknown') as source,
        COALESCE(market_type, 'Unknown') as market_type,
        lead_type,
        rtx_lead_uid,
        -- A lead is "matched" if it has key identifiers
        CASE
          WHEN rtx_lead_uid IS NOT NULL
            AND lead_type IS NOT NULL
          THEN 1
          ELSE 0
        END as is_matched,
        -- A lead is "converted" if sold
        CASE
          WHEN lead_type = 'Sold'
            OR lead_type LIKE '%Won%'
            OR lead_type = 'Closed Won'
          THEN 1
          ELSE 0
        END as is_converted
      FROM \`${PROJECT}.${BCG_DATASET}.DR_Leads\`
      WHERE ${whereClause}
    )
    SELECT
      source as channel,
      source as channel_name,
      market_type,
      COUNT(*) as total_leads,
      SUM(is_matched) as matched_leads,
      SAFE_DIVIDE(SUM(is_matched), COUNT(*)) * 100 as match_rate,
      SUM(is_converted) as converted_leads,
      SAFE_DIVIDE(SUM(is_converted), COUNT(*)) * 100 as conversion_rate,
      COUNT(*) - SUM(is_matched) as missing_count
    FROM lead_data
    GROUP BY source, market_type
    ORDER BY total_leads DESC
    LIMIT ${limit}
  `

  try {
    const params: Record<string, unknown> = {}
    if (marketType !== 'all') params.marketType = marketType

    const result = await bigQueryClient.queryWithParams<LeadJourneyByChannel>(sql, params)

    // Map channels to our taxonomy
    return result.rows.map(row => {
      const mapped = mapChannel(row.channel)
      return {
        ...row,
        channel: mapped.id,
        channel_name: mapped.name,
      }
    })
  } catch (error) {
    console.error('[LeadJourney] getLeadJourneyByChannel failed:', error)
    return []
  }
}

/**
 * Get lead journey trends over time by channel
 */
export async function getLeadJourneyTrends(
  options: LeadJourneyQueryOptions = {}
): Promise<LeadJourneyTrend[]> {
  const { daysBack = 30, marketType = 'all' } = options

  let whereClause = `DATE(received_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${daysBack} DAY)`
  if (marketType !== 'all') {
    whereClause += ` AND market_type = @marketType`
  }

  const sql = `
    SELECT
      FORMAT_DATE('%Y-%m-%d', DATE(received_date)) as date,
      COALESCE(lead_source, 'Unknown') as channel,
      COALESCE(market_type, 'Unknown') as market_type,
      COUNT(*) as total_leads,
      COUNTIF(rtx_lead_uid IS NOT NULL AND lead_type IS NOT NULL) as matched_leads,
      SAFE_DIVIDE(
        COUNTIF(rtx_lead_uid IS NOT NULL AND lead_type IS NOT NULL),
        COUNT(*)
      ) * 100 as match_rate
    FROM \`${PROJECT}.${BCG_DATASET}.DR_Leads\`
    WHERE ${whereClause}
    GROUP BY date, lead_source, market_type
    ORDER BY date, channel
  `

  try {
    const params: Record<string, unknown> = {}
    if (marketType !== 'all') params.marketType = marketType

    const result = await bigQueryClient.queryWithParams<LeadJourneyTrend>(sql, params)

    // Map channels
    return result.rows.map(row => {
      const mapped = mapChannel(row.channel)
      return {
        ...row,
        channel: mapped.id,
      }
    })
  } catch (error) {
    console.error('[LeadJourney] getLeadJourneyTrends failed:', error)
    return []
  }
}

/**
 * Get overall lead journey summary
 */
export async function getLeadJourneySummary(
  options: LeadJourneyQueryOptions = {}
): Promise<LeadJourneySummary> {
  const { daysBack = 30 } = options

  const sql = `
    WITH channel_metrics AS (
      SELECT
        COALESCE(lead_source, 'Unknown') as channel,
        COUNT(*) as total_leads,
        COUNTIF(rtx_lead_uid IS NOT NULL AND lead_type IS NOT NULL) as matched_leads,
        SAFE_DIVIDE(
          COUNTIF(rtx_lead_uid IS NOT NULL AND lead_type IS NOT NULL),
          COUNT(*)
        ) * 100 as match_rate
      FROM \`${PROJECT}.${BCG_DATASET}.DR_Leads\`
      WHERE DATE(received_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${daysBack} DAY)
      GROUP BY lead_source
    )
    SELECT
      SUM(total_leads) as total_leads,
      0 as residential_leads,
      0 as commercial_leads,
      SUM(matched_leads) as matched_leads,
      SAFE_DIVIDE(SUM(matched_leads), SUM(total_leads)) * 100 as overall_match_rate,
      COUNTIF(match_rate >= 50) as channels_above_target,
      COUNTIF(match_rate < 50) as channels_below_target,
      COUNTIF(match_rate < 20) as critical_channels
    FROM channel_metrics
  `

  // Separate query for residential/commercial breakdown
  const marketSql = `
    SELECT
      COUNTIF(market_type = 'Residential') as residential_leads,
      COUNTIF(market_type = 'Commercial') as commercial_leads
    FROM \`${PROJECT}.${BCG_DATASET}.DR_Leads\`
    WHERE DATE(received_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${daysBack} DAY)
  `

  try {
    const [summaryResult, marketResult] = await Promise.all([
      bigQueryClient.query<LeadJourneySummary>(sql),
      bigQueryClient.query<{ residential_leads: number; commercial_leads: number }>(marketSql),
    ])

    const summary = summaryResult.rows[0] || {
      total_leads: 0,
      residential_leads: 0,
      commercial_leads: 0,
      matched_leads: 0,
      overall_match_rate: 0,
      channels_above_target: 0,
      channels_below_target: 0,
      critical_channels: 0,
    }

    const market = marketResult.rows[0] || { residential_leads: 0, commercial_leads: 0 }

    return {
      ...summary,
      residential_leads: market.residential_leads,
      commercial_leads: market.commercial_leads,
    }
  } catch (error) {
    console.error('[LeadJourney] getLeadJourneySummary failed:', error)
    return {
      total_leads: 0,
      residential_leads: 0,
      commercial_leads: 0,
      matched_leads: 0,
      overall_match_rate: 0,
      channels_above_target: 0,
      channels_below_target: 0,
      critical_channels: 0,
    }
  }
}

/**
 * Get gap analysis - why leads are unmatched
 */
export async function getLeadGapAnalysis(
  options: LeadJourneyQueryOptions = {}
): Promise<LeadGapAnalysisRow[]> {
  const { daysBack = 30, marketType = 'all', limit = 20 } = options

  let whereClause = `DATE(received_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${daysBack} DAY)`
  if (marketType !== 'all') {
    whereClause += ` AND market_type = @marketType`
  }

  // Analyze unmatched leads by source
  const sql = `
    WITH unmatched_analysis AS (
      SELECT
        COALESCE(lead_source, 'Unknown') as channel,
        COALESCE(market_type, 'Unknown') as market_type,
        -- Count missing fields
        CASE WHEN rtx_lead_uid IS NULL THEN 1 ELSE 0 END as missing_uid,
        CASE WHEN lead_type IS NULL THEN 1 ELSE 0 END as missing_type,
        CASE WHEN received_date IS NULL THEN 1 ELSE 0 END as missing_date,
        1 as lead_count
      FROM \`${PROJECT}.${BCG_DATASET}.DR_Leads\`
      WHERE ${whereClause}
        AND (rtx_lead_uid IS NULL OR lead_type IS NULL)
    )
    SELECT
      channel,
      channel as channel_name,
      market_type,
      SUM(lead_count) as total_unmatched,
      SUM(missing_uid) as missing_source,
      SUM(missing_type) as missing_contact,
      0 as missing_account,
      CASE
        WHEN SUM(missing_uid) > SUM(missing_type) THEN 'Missing Lead UID'
        ELSE 'Missing Lead Type/Stage'
      END as top_issue
    FROM unmatched_analysis
    GROUP BY channel, market_type
    ORDER BY total_unmatched DESC
    LIMIT ${limit}
  `

  try {
    const params: Record<string, unknown> = {}
    if (marketType !== 'all') params.marketType = marketType

    const result = await bigQueryClient.queryWithParams<LeadGapAnalysisRow>(sql, params)

    // Map channels
    return result.rows.map(row => {
      const mapped = mapChannel(row.channel)
      return {
        ...row,
        channel: mapped.id,
        channel_name: mapped.name,
      }
    })
  } catch (error) {
    console.error('[LeadJourney] getLeadGapAnalysis failed:', error)
    return []
  }
}

/**
 * Get lead funnel by channel (from S4 leads table)
 */
export async function getLeadFunnelByChannel(
  options: LeadJourneyQueryOptions = {}
): Promise<LeadFunnelByChannel[]> {
  const { daysBack = 30, limit = 50 } = options

  // S4 leads table has funnel stage dates
  const sql = `
    SELECT
      'all' as channel,
      'all' as market_type,
      COUNT(CASE WHEN received_date IS NOT NULL THEN 1 END) as mql_count,
      COUNT(CASE WHEN scheduled_date IS NOT NULL THEN 1 END) as scheduled_count,
      COUNT(CASE WHEN inspected_date IS NOT NULL THEN 1 END) as inspected_count,
      COUNT(CASE WHEN proposed_date IS NOT NULL THEN 1 END) as proposed_count,
      COUNT(CASE WHEN sold_date IS NOT NULL THEN 1 END) as sold_count,
      COUNT(CASE WHEN cancel_date IS NOT NULL THEN 1 END) as canceled_count
    FROM \`${PROJECT}.${S4_DATASET}.Fact_Leads_Acc_Daily_Dtls_Snp\`
    WHERE DATE(received_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${daysBack} DAY)
  `

  try {
    const result = await bigQueryClient.query<LeadFunnelByChannel>(sql)
    return result.rows
  } catch (error) {
    console.error('[LeadJourney] getLeadFunnelByChannel failed:', error)
    return []
  }
}
