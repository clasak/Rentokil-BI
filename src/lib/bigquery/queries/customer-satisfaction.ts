/**
 * BigQuery Queries for Customer Satisfaction (NPS)
 *
 * Data source: S0_TMX.tmx_survey_Qualtrics_V5 (5.7M rows)
 * Survey system: Qualtrics CVC (Customer Voice of Customer)
 *
 * NPS Scoring:
 * - Promoters (9-10): q1_26_nps_group = '3'
 * - Passives (7-8): q1_26_nps_group = '2'
 * - Detractors (0-6): q1_26_nps_group = '1'
 * - NPS Formula: ((Promoters - Detractors) / Total Responses) * 100
 *
 * Key columns:
 * - q1_26: NPS score (0-10)
 * - q1_26_nps_group: NPS category (3=Promoter, 2=Passive, 1=Detractor)
 * - q218: Customer feedback text
 * - recordeddate: Survey completion date
 * - district_id: Branch identifier
 * - region: Region code
 * - market_name: Market name
 * - customer_name, customer_email: Customer info
 * - specialist_colleague: Technician/rep ID
 */

import { bigQueryClient, BIGQUERY_CONFIG } from '../client'
import { handleBigQueryError } from '../error-handler'
import { validateOrgCode, validateNumeric } from '../validation'
import { buildDateFilter, percentage } from './field-calculators'

// =============================================================================
// Types
// =============================================================================

export interface NPSScore {
  period: string
  nps_score: number
  promoter_count: number
  passive_count: number
  detractor_count: number
  total_responses: number
  promoter_pct: number
  passive_pct: number
  detractor_pct: number
}

export interface SurveyResponse {
  response_id: string
  recorded_date: string
  customer_name: string
  customer_email: string
  nps_score: number
  nps_category: string
  feedback_text: string | null
  branch_id: string
  branch_name: string
  region: string
  market: string
  technician_id: string | null
  survey_type: string
}

export interface DetractorAnalysis {
  category: string
  detractor_count: number
  avg_score: number
  feedback_sample: string | null
  pct_of_detractors: number
}

export interface BranchNPSComparison {
  branch_id: string
  branch_name: string
  region: string
  market: string
  nps_score: number
  total_responses: number
  promoter_count: number
  detractor_count: number
  trend: string
}

// =============================================================================
// Query Options
// =============================================================================

export interface CustomerSatisfactionQueryOptions {
  daysBack?: number
  market?: string
  region?: string
  branch?: string
  limit?: number
  startDate?: string
  endDate?: string
}

// =============================================================================
// Queries
// =============================================================================

const PROJECT = BIGQUERY_CONFIG.projectId

/**
 * Build geographic filter conditions for survey queries
 */
function buildGeoFilterConditions(options: CustomerSatisfactionQueryOptions): {
  where: string
  params: Record<string, unknown>
} {
  const { market, region, branch } = options
  const params: Record<string, unknown> = {}
  const whereConditions: string[] = []

  if (market) {
    whereConditions.push('s.market_name = @market')
    params.market = market
  }

  if (region) {
    whereConditions.push('s.region = @region')
    params.region = region
  }

  if (branch) {
    whereConditions.push('s.district_id = @branch')
    params.branch = branch
  }

  return {
    where: whereConditions.length > 0 ? 'AND ' + whereConditions.join(' AND ') : '',
    params,
  }
}

/**
 * Get NPS score with promoter/passive/detractor breakdown
 * Supports trending over time (monthly aggregation)
 */
export async function getNPSScore(
  options: CustomerSatisfactionQueryOptions = {}
): Promise<NPSScore[]> {
  const { daysBack = 30 } = options
  const geoFilter = buildGeoFilterConditions(options)

  const sql = `
    WITH survey_data AS (
      SELECT
        FORMAT_DATE('%Y-%m', DATE(recordeddate)) as period,
        CAST(q1_26 AS INT64) as nps_score,
        q1_26_nps_group
      FROM \`${PROJECT}.S0_TMX.tmx_survey_Qualtrics_V5\` s
      WHERE recordeddate IS NOT NULL
        AND ${buildDateFilter('recordeddate', daysBack)}
        AND q1_26 IS NOT NULL
        AND q1_26_nps_group IS NOT NULL
        ${geoFilter.where}
    )
    SELECT
      period,
      -- NPS Formula: ((Promoters - Detractors) / Total) * 100
      ROUND(
        ((SUM(CASE WHEN q1_26_nps_group = '3' THEN 1 ELSE 0 END) -
          SUM(CASE WHEN q1_26_nps_group = '1' THEN 1 ELSE 0 END)) /
         NULLIF(COUNT(*), 0)) * 100,
        1
      ) as nps_score,
      SUM(CASE WHEN q1_26_nps_group = '3' THEN 1 ELSE 0 END) as promoter_count,
      SUM(CASE WHEN q1_26_nps_group = '2' THEN 1 ELSE 0 END) as passive_count,
      SUM(CASE WHEN q1_26_nps_group = '1' THEN 1 ELSE 0 END) as detractor_count,
      COUNT(*) as total_responses,
      ${percentage('SUM(CASE WHEN q1_26_nps_group = \'3\' THEN 1 ELSE 0 END)', 'COUNT(*)')} as promoter_pct,
      ${percentage('SUM(CASE WHEN q1_26_nps_group = \'2\' THEN 1 ELSE 0 END)', 'COUNT(*)')} as passive_pct,
      ${percentage('SUM(CASE WHEN q1_26_nps_group = \'1\' THEN 1 ELSE 0 END)', 'COUNT(*)')} as detractor_pct
    FROM survey_data
    GROUP BY period
    ORDER BY period DESC
  `

  const result = await bigQueryClient.queryWithParams<NPSScore>(sql, geoFilter.params)
  return result.rows
}

/**
 * Get detailed survey responses with filters
 */
export async function getSurveyResponses(
  options: CustomerSatisfactionQueryOptions = {}
): Promise<SurveyResponse[]> {
  const { daysBack = 30, limit = 100 } = options
  const geoFilter = buildGeoFilterConditions(options)

  const sql = `
    SELECT
      responseid as response_id,
      FORMAT_TIMESTAMP('%Y-%m-%d %H:%M', CAST(recordeddate AS TIMESTAMP)) as recorded_date,
      COALESCE(customer_name, 'Anonymous') as customer_name,
      customer_email,
      CAST(q1_26 AS INT64) as nps_score,
      CASE q1_26_nps_group
        WHEN '3' THEN 'Promoter'
        WHEN '2' THEN 'Passive'
        WHEN '1' THEN 'Detractor'
        ELSE 'Unknown'
      END as nps_category,
      q218 as feedback_text,
      COALESCE(district_id, 'Unknown') as branch_id,
      COALESCE(district_name, 'Unknown Branch') as branch_name,
      COALESCE(region, 'Unknown') as region,
      COALESCE(market_name, 'Unknown') as market,
      specialist_colleague as technician_id,
      survey_type
    FROM \`${PROJECT}.S0_TMX.tmx_survey_Qualtrics_V5\` s
    WHERE recordeddate IS NOT NULL
      AND ${buildDateFilter('recordeddate', daysBack)}
      AND q1_26 IS NOT NULL
      AND q1_26_nps_group IS NOT NULL
      ${geoFilter.where}
    ORDER BY recordeddate DESC
    LIMIT ${limit}
  `

  const result = await bigQueryClient.queryWithParams<SurveyResponse>(sql, geoFilter.params)
  return result.rows
}

/**
 * Analyze detractor feedback by category
 * Groups detractors by service type, region, etc. to identify improvement areas
 */
export async function getDetractorAnalysis(
  options: CustomerSatisfactionQueryOptions = {}
): Promise<DetractorAnalysis[]> {
  const { daysBack = 30, limit = 20 } = options
  const geoFilter = buildGeoFilterConditions(options)

  const sql = `
    WITH detractors AS (
      SELECT
        COALESCE(service_code, 'Unknown Service') as category,
        CAST(q1_26 AS INT64) as nps_score,
        q218 as feedback_text
      FROM \`${PROJECT}.S0_TMX.tmx_survey_Qualtrics_V5\` s
      WHERE recordeddate IS NOT NULL
        AND ${buildDateFilter('recordeddate', daysBack)}
        AND q1_26_nps_group = '1'  -- Detractors only
        AND q1_26 IS NOT NULL
        ${geoFilter.where}
    ),
    total_detractors AS (
      SELECT COUNT(*) as total FROM detractors
    )
    SELECT
      d.category,
      COUNT(*) as detractor_count,
      ROUND(AVG(d.nps_score), 1) as avg_score,
      -- Get sample feedback (non-null preferred)
      ANY_VALUE(CASE WHEN d.feedback_text IS NOT NULL THEN d.feedback_text ELSE NULL END) as feedback_sample,
      ${percentage('COUNT(*)', '(SELECT total FROM total_detractors)')} as pct_of_detractors
    FROM detractors d
    GROUP BY d.category
    HAVING detractor_count >= 3  -- Minimum 3 detractors per category
    ORDER BY detractor_count DESC
    LIMIT ${limit}
  `

  const result = await bigQueryClient.queryWithParams<DetractorAnalysis>(sql, geoFilter.params)
  return result.rows
}

/**
 * Get branch NPS comparison (best/worst performers)
 */
export async function getBranchNPSComparison(
  options: CustomerSatisfactionQueryOptions = {}
): Promise<BranchNPSComparison[]> {
  const { daysBack = 30, limit = 20 } = options
  const geoFilter = buildGeoFilterConditions(options)

  const sql = `
    WITH current_period AS (
      SELECT
        district_id as branch_id,
        district_name as branch_name,
        region,
        market_name as market,
        q1_26_nps_group
      FROM \`${PROJECT}.S0_TMX.tmx_survey_Qualtrics_V5\` s
      WHERE recordeddate IS NOT NULL
        AND ${buildDateFilter('recordeddate', daysBack)}
        AND q1_26 IS NOT NULL
        AND q1_26_nps_group IS NOT NULL
        AND district_id IS NOT NULL
        ${geoFilter.where}
    ),
    prior_period AS (
      SELECT
        district_id,
        ROUND(
          ((SUM(CASE WHEN q1_26_nps_group = '3' THEN 1 ELSE 0 END) -
            SUM(CASE WHEN q1_26_nps_group = '1' THEN 1 ELSE 0 END)) /
           NULLIF(COUNT(*), 0)) * 100,
          1
        ) as prior_nps
      FROM \`${PROJECT}.S0_TMX.tmx_survey_Qualtrics_V5\` s
      WHERE recordeddate IS NOT NULL
        AND DATE(recordeddate) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${daysBack * 2} DAY)
        AND DATE(recordeddate) < DATE_SUB(CURRENT_DATE(), INTERVAL ${daysBack} DAY)
        AND q1_26 IS NOT NULL
        AND q1_26_nps_group IS NOT NULL
        AND district_id IS NOT NULL
        ${geoFilter.where}
      GROUP BY district_id
    )
    SELECT
      c.branch_id,
      ANY_VALUE(c.branch_name) as branch_name,
      ANY_VALUE(c.region) as region,
      ANY_VALUE(c.market) as market,
      ROUND(
        ((SUM(CASE WHEN c.q1_26_nps_group = '3' THEN 1 ELSE 0 END) -
          SUM(CASE WHEN c.q1_26_nps_group = '1' THEN 1 ELSE 0 END)) /
         NULLIF(COUNT(*), 0)) * 100,
        1
      ) as nps_score,
      COUNT(*) as total_responses,
      SUM(CASE WHEN c.q1_26_nps_group = '3' THEN 1 ELSE 0 END) as promoter_count,
      SUM(CASE WHEN c.q1_26_nps_group = '1' THEN 1 ELSE 0 END) as detractor_count,
      CASE
        WHEN ROUND(
          ((SUM(CASE WHEN c.q1_26_nps_group = '3' THEN 1 ELSE 0 END) -
            SUM(CASE WHEN c.q1_26_nps_group = '1' THEN 1 ELSE 0 END)) /
           NULLIF(COUNT(*), 0)) * 100, 1
        ) > COALESCE(MAX(p.prior_nps), 0) THEN 'Improving'
        WHEN ROUND(
          ((SUM(CASE WHEN c.q1_26_nps_group = '3' THEN 1 ELSE 0 END) -
            SUM(CASE WHEN c.q1_26_nps_group = '1' THEN 1 ELSE 0 END)) /
           NULLIF(COUNT(*), 0)) * 100, 1
        ) < COALESCE(MAX(p.prior_nps), 0) THEN 'Declining'
        ELSE 'Stable'
      END as trend
    FROM current_period c
    LEFT JOIN prior_period p ON c.branch_id = p.district_id
    GROUP BY c.branch_id
    HAVING total_responses >= 10  -- Minimum 10 responses for statistical significance
    ORDER BY nps_score DESC
    LIMIT ${limit}
  `

  const result = await bigQueryClient.queryWithParams<BranchNPSComparison>(sql, geoFilter.params)
  return result.rows
}
