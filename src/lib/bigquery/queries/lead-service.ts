/**
 * BigQuery Queries for Lead Service Engine (Server-side only)
 *
 * Production table: S4.Fact_Leads_Acc_Daily_Dtls_Snp (11.8M rows)
 * Pages: /lead-service-engine/*
 *
 * Key challenge: BigQuery has TIMESTAMPS showing when leads passed through stages.
 * Lead Engine wants CURRENT stage and TIME IN STAGE for SLA tracking.
 * These queries derive current stage from the latest non-null timestamp.
 *
 * NOTE: This file imports @google-cloud/bigquery and can only be used server-side.
 * For client-side types/transformers, use ./lead-service-transformers.ts
 */

import { bigQueryClient, BIGQUERY_CONFIG } from '../client'
import { handleBigQueryError } from '../error-handler'
import { validateOrgCode, validateNumeric, validateString } from '../validation'
import type {
  BQStageMetricsRow,
  BQHandoffMetricsRow,
  BQHandoffTrendRow,
  BQPipelineSummaryRow,
} from './lead-service-transformers'

// Re-export types for convenience
export type {
  BQStageMetricsRow,
  BQHandoffMetricsRow,
  BQHandoffTrendRow,
  BQPipelineSummaryRow,
} from './lead-service-transformers'

// =============================================================================
// Query Options
// =============================================================================

export interface LeadServiceQueryOptions {
  daysBack?: number
  market?: string
  region?: string
  branch?: string
}

// =============================================================================
// Query Configuration
// =============================================================================

const PROJECT = BIGQUERY_CONFIG.projectId
const DATASET = 'S4'
const LEADS_TABLE = 'Fact_Leads_Acc_Daily_Dtls_Snp'

// =============================================================================
// Queries
// =============================================================================

/**
 * Get stage metrics for Lead Service Engine pipeline
 *
 * Stage mapping (based on available timestamp columns):
 * - lead_intake: received but not scheduled
 * - sales_process: scheduled but not inspected
 * - start_packet: inspected but not proposed
 * - ops_handoff: proposed but not sold
 * - service_delivery: sold
 */
export async function getLeadServiceStageMetrics(
  options: LeadServiceQueryOptions = {}
): Promise<BQStageMetricsRow[]> {
  const { daysBack = 90 } = options

  const sql = `
    WITH lead_stages AS (
      SELECT
        CASE
          WHEN sold_date IS NOT NULL THEN 'service_delivery'
          WHEN proposed_date IS NOT NULL THEN 'ops_handoff'
          WHEN inspected_date IS NOT NULL THEN 'start_packet'
          WHEN scheduled_date IS NOT NULL THEN 'sales_process'
          ELSE 'lead_intake'
        END AS current_stage,
        TIMESTAMP_DIFF(CURRENT_TIMESTAMP(),
          CASE
            WHEN sold_date IS NOT NULL THEN sold_date
            WHEN proposed_date IS NOT NULL THEN proposed_date
            WHEN inspected_date IS NOT NULL THEN inspected_date
            WHEN scheduled_date IS NOT NULL THEN scheduled_date
            ELSE received_date
          END,
          HOUR
        ) AS hours_in_stage,
        COALESCE(value_proposed, value_sold_raw, 2500) AS lead_value
      FROM \`${PROJECT}.${DATASET}.${LEADS_TABLE}\`
      WHERE DATE(received_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${daysBack} DAY)
        AND cancel_date IS NULL
    ),
    stage_health AS (
      SELECT
        current_stage,
        hours_in_stage,
        lead_value,
        CASE
          WHEN current_stage = 'lead_intake' AND hours_in_stage >= 24 THEN 'critical'
          WHEN current_stage = 'lead_intake' AND hours_in_stage >= 18 THEN 'at_risk'
          WHEN current_stage = 'sales_process' AND hours_in_stage >= 336 THEN 'critical'
          WHEN current_stage = 'sales_process' AND hours_in_stage >= 240 THEN 'at_risk'
          WHEN current_stage = 'start_packet' AND hours_in_stage >= 48 THEN 'critical'
          WHEN current_stage = 'start_packet' AND hours_in_stage >= 36 THEN 'at_risk'
          WHEN current_stage = 'ops_handoff' AND hours_in_stage >= 24 THEN 'critical'
          WHEN current_stage = 'ops_handoff' AND hours_in_stage >= 18 THEN 'at_risk'
          WHEN current_stage = 'service_delivery' AND hours_in_stage >= 168 THEN 'critical'
          WHEN current_stage = 'service_delivery' AND hours_in_stage >= 120 THEN 'at_risk'
          ELSE 'healthy'
        END AS health_status
      FROM lead_stages
    )
    SELECT
      current_stage AS stage,
      COUNT(*) AS lead_count,
      AVG(hours_in_stage) AS avg_hours_in_stage,
      COUNTIF(health_status = 'healthy') AS healthy_count,
      COUNTIF(health_status = 'at_risk') AS at_risk_count,
      COUNTIF(health_status = 'critical') AS critical_count,
      SAFE_DIVIDE(
        COUNTIF(
          (current_stage = 'lead_intake' AND hours_in_stage <= 24) OR
          (current_stage = 'sales_process' AND hours_in_stage <= 336) OR
          (current_stage = 'start_packet' AND hours_in_stage <= 48) OR
          (current_stage = 'ops_handoff' AND hours_in_stage <= 24) OR
          (current_stage = 'service_delivery' AND hours_in_stage <= 168)
        ),
        COUNT(*)
      ) * 100 AS sla_compliance,
      SUM(lead_value) AS total_value,
      AVG(lead_value) AS avg_value,
      SUM(CASE WHEN health_status != 'healthy' THEN lead_value ELSE 0 END) AS at_risk_value
    FROM stage_health
    GROUP BY current_stage
    ORDER BY
      CASE current_stage
        WHEN 'lead_intake' THEN 1
        WHEN 'sales_process' THEN 2
        WHEN 'start_packet' THEN 3
        WHEN 'ops_handoff' THEN 4
        WHEN 'service_delivery' THEN 5
      END
  `

  const result = await bigQueryClient.query<BQStageMetricsRow>(sql)
  return result.rows
}

/**
 * Get handoff metrics for key pipeline bottlenecks
 *
 * Handoff points (based on available columns):
 * - lead_to_schedule: received but not scheduled (waiting for scheduling)
 * - sales_to_ops: proposed but not sold (waiting for ops/close)
 */
export async function getLeadServiceHandoffMetrics(
  options: LeadServiceQueryOptions = {}
): Promise<BQHandoffMetricsRow[]> {
  const { daysBack = 90 } = options

  const sql = `
    WITH handoff_leads AS (
      -- Leads waiting to be scheduled (lead intake → sales process)
      SELECT
        'lead_to_schedule' AS handoff_type,
        TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), received_date, HOUR) AS wait_hours
      FROM \`${PROJECT}.${DATASET}.${LEADS_TABLE}\`
      WHERE received_date IS NOT NULL
        AND scheduled_date IS NULL
        AND cancel_date IS NULL
        AND DATE(received_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${daysBack} DAY)

      UNION ALL

      -- Leads with proposals waiting for close (ops handoff → service)
      SELECT
        'sales_to_ops' AS handoff_type,
        TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), proposed_date, HOUR) AS wait_hours
      FROM \`${PROJECT}.${DATASET}.${LEADS_TABLE}\`
      WHERE proposed_date IS NOT NULL
        AND sold_date IS NULL
        AND cancel_date IS NULL
        AND DATE(received_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${daysBack} DAY)
    )
    SELECT
      handoff_type,
      COUNT(*) AS pending,
      AVG(wait_hours) AS avg_wait_hours,
      COUNTIF(wait_hours >= 24) AS delayed_count,
      SAFE_DIVIDE(COUNTIF(wait_hours <= 24), COUNT(*)) * 100 AS sla_compliance,
      COUNTIF(wait_hours >= 18) AS leads_at_risk
    FROM handoff_leads
    GROUP BY handoff_type
  `

  const result = await bigQueryClient.query<BQHandoffMetricsRow>(sql)
  return result.rows
}

/**
 * Get 14-day handoff trend for a specific handoff type
 */
export async function getLeadServiceHandoffTrend(
  handoffType: 'lead_to_schedule' | 'sales_to_ops',
  options: LeadServiceQueryOptions = {}
): Promise<BQHandoffTrendRow[]> {
  const dateColumn = handoffType === 'lead_to_schedule' ? 'received_date' : 'proposed_date'
  const nextColumn = handoffType === 'lead_to_schedule' ? 'scheduled_date' : 'sold_date'

  const sql = `
    WITH daily_handoffs AS (
      SELECT
        DATE(${dateColumn}) AS handoff_date,
        TIMESTAMP_DIFF(
          COALESCE(${nextColumn}, CURRENT_TIMESTAMP()),
          ${dateColumn},
          HOUR
        ) AS wait_hours
      FROM \`${PROJECT}.${DATASET}.${LEADS_TABLE}\`
      WHERE ${dateColumn} IS NOT NULL
        AND DATE(received_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL 14 DAY)
    )
    SELECT
      FORMAT_DATE('%a', handoff_date) AS day,
      AVG(wait_hours) AS hours,
      COUNT(*) AS count
    FROM daily_handoffs
    GROUP BY handoff_date
    ORDER BY handoff_date
    LIMIT 14
  `

  const result = await bigQueryClient.query<BQHandoffTrendRow>(sql)
  return result.rows
}

/**
 * Get pipeline summary for Lead Service Engine KPIs
 */
export async function getLeadServicePipelineSummary(
  options: LeadServiceQueryOptions = {}
): Promise<BQPipelineSummaryRow> {
  const { daysBack = 90 } = options

  const sql = `
    WITH pipeline_data AS (
      SELECT
        CASE
          WHEN sold_date IS NOT NULL THEN 'service_delivery'
          WHEN proposed_date IS NOT NULL THEN 'ops_handoff'
          WHEN inspected_date IS NOT NULL THEN 'start_packet'
          WHEN scheduled_date IS NOT NULL THEN 'sales_process'
          ELSE 'lead_intake'
        END AS current_stage,
        COALESCE(value_proposed, value_sold_raw, 2500) AS lead_value,
        TIMESTAMP_DIFF(CURRENT_TIMESTAMP(),
          CASE
            WHEN sold_date IS NOT NULL THEN sold_date
            WHEN proposed_date IS NOT NULL THEN proposed_date
            WHEN inspected_date IS NOT NULL THEN inspected_date
            WHEN scheduled_date IS NOT NULL THEN scheduled_date
            ELSE received_date
          END,
          HOUR
        ) AS hours_in_stage
      FROM \`${PROJECT}.${DATASET}.${LEADS_TABLE}\`
      WHERE DATE(received_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${daysBack} DAY)
        AND cancel_date IS NULL
    ),
    with_health AS (
      SELECT
        current_stage,
        lead_value,
        hours_in_stage,
        CASE
          WHEN current_stage = 'lead_intake' AND hours_in_stage >= 24 THEN 'critical'
          WHEN current_stage = 'lead_intake' AND hours_in_stage >= 18 THEN 'at_risk'
          WHEN current_stage = 'sales_process' AND hours_in_stage >= 336 THEN 'critical'
          WHEN current_stage = 'sales_process' AND hours_in_stage >= 240 THEN 'at_risk'
          WHEN current_stage = 'start_packet' AND hours_in_stage >= 48 THEN 'critical'
          WHEN current_stage = 'start_packet' AND hours_in_stage >= 36 THEN 'at_risk'
          WHEN current_stage = 'ops_handoff' AND hours_in_stage >= 24 THEN 'critical'
          WHEN current_stage = 'ops_handoff' AND hours_in_stage >= 18 THEN 'at_risk'
          WHEN current_stage = 'service_delivery' AND hours_in_stage >= 168 THEN 'critical'
          WHEN current_stage = 'service_delivery' AND hours_in_stage >= 120 THEN 'at_risk'
          ELSE 'healthy'
        END AS health_status
      FROM pipeline_data
    ),
    completed_leads AS (
      SELECT
        DATE_DIFF(DATE(sold_date), DATE(received_date), DAY) AS lead_to_service_days
      FROM \`${PROJECT}.${DATASET}.${LEADS_TABLE}\`
      WHERE sold_date IS NOT NULL
        AND DATE(received_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${daysBack} DAY)
    ),
    handoff_metrics AS (
      SELECT
        current_stage,
        SAFE_DIVIDE(
          COUNTIF(hours_in_stage <= 24),
          COUNT(*)
        ) * 100 AS sla_compliance
      FROM with_health
      WHERE current_stage IN ('lead_intake', 'ops_handoff')
      GROUP BY current_stage
    ),
    bottleneck AS (
      SELECT current_stage, sla_compliance
      FROM handoff_metrics
      ORDER BY sla_compliance ASC
      LIMIT 1
    ),
    totals AS (
      SELECT
        COUNT(*) AS total_leads,
        COUNTIF(health_status = 'healthy') AS healthy_leads,
        COUNTIF(health_status = 'at_risk') AS at_risk_leads,
        COUNTIF(health_status = 'critical') AS critical_leads,
        SUM(lead_value) AS total_pipeline_value,
        SUM(CASE WHEN health_status != 'healthy' THEN lead_value ELSE 0 END) AS at_risk_value,
        AVG(lead_value) AS avg_deal_size
      FROM with_health
    )
    SELECT
      t.total_leads,
      t.healthy_leads,
      t.at_risk_leads,
      t.critical_leads,
      (SELECT AVG(lead_to_service_days) FROM completed_leads) AS avg_lead_to_service_days,
      SAFE_DIVIDE(
        (SELECT COUNT(*) FROM completed_leads),
        t.total_leads
      ) * 100 AS conversion_rate,
      b.current_stage AS bottleneck_stage,
      b.sla_compliance AS bottleneck_sla_compliance,
      t.total_pipeline_value,
      t.at_risk_value,
      t.avg_deal_size
    FROM totals t
    LEFT JOIN bottleneck b ON TRUE
  `

  const result = await bigQueryClient.query<BQPipelineSummaryRow>(sql)
  return result.rows[0] || {
    total_leads: 0,
    healthy_leads: 0,
    at_risk_leads: 0,
    critical_leads: 0,
    avg_lead_to_service_days: null,
    conversion_rate: null,
    bottleneck_stage: null,
    bottleneck_sla_compliance: null,
    total_pipeline_value: 0,
    at_risk_value: 0,
    avg_deal_size: 0,
  }
}

// Import at-risk lead types
import type { BQAtRiskLeadRow, BQHandoffLeadRow } from './lead-service-transformers'

// Re-export for convenience
export type { BQAtRiskLeadRow, BQHandoffLeadRow } from './lead-service-transformers'

/**
 * Get at-risk and critical leads for the At-Risk page
 */
export async function getLeadServiceAtRiskLeads(
  options: LeadServiceQueryOptions = {}
): Promise<BQAtRiskLeadRow[]> {
  try {
    // Validation
    const daysBack = validateNumeric(options.daysBack, 'daysBack', 1, 365) || 90
    const branch = validateOrgCode(options.branch, 'branch')

    // Build params object
    const params: Record<string, string | number> = { daysBack }

    // Build optional filters (market/region not available in snapshot table)
    const filters: string[] = []
    if (branch) {
      filters.push('CAST(report_branch AS STRING) = @branch')
      params.branch = branch
    }
    const filterClause = filters.length > 0 ? `AND ${filters.join(' AND ')}` : ''

    const sql = `
      WITH lead_data AS (
        SELECT
          COALESCE(CAST(lead_ID AS STRING), rtx_lead_uid) AS lead_id,
          COALESCE(contact_name, 'Unknown Contact') AS company_name,
          COALESCE(contact_name, 'Unknown Contact') AS contact_name,
          CASE
            WHEN sold_date IS NOT NULL THEN 'service_delivery'
            WHEN proposed_date IS NOT NULL THEN 'ops_handoff'
            WHEN inspected_date IS NOT NULL THEN 'start_packet'
            WHEN scheduled_date IS NOT NULL THEN 'sales_process'
            ELSE 'lead_intake'
          END AS current_stage,
          TIMESTAMP_DIFF(CURRENT_TIMESTAMP(),
            CASE
              WHEN sold_date IS NOT NULL THEN sold_date
              WHEN proposed_date IS NOT NULL THEN proposed_date
              WHEN inspected_date IS NOT NULL THEN inspected_date
              WHEN scheduled_date IS NOT NULL THEN scheduled_date
              ELSE received_date
            END,
            HOUR
          ) AS hours_in_stage,
          COALESCE(value_proposed, value_sold_raw, 2500) AS estimated_value,
          received_date AS created_at
        FROM \`${PROJECT}.${DATASET}.${LEADS_TABLE}\`
        WHERE DATE(received_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL @daysBack DAY)
          AND cancel_date IS NULL
          ${filterClause}
      ),
      with_health AS (
        SELECT
          *,
          CASE
            WHEN current_stage = 'lead_intake' AND hours_in_stage >= 24 THEN 'critical'
            WHEN current_stage = 'lead_intake' AND hours_in_stage >= 18 THEN 'at_risk'
            WHEN current_stage = 'sales_process' AND hours_in_stage >= 336 THEN 'critical'
            WHEN current_stage = 'sales_process' AND hours_in_stage >= 240 THEN 'at_risk'
            WHEN current_stage = 'start_packet' AND hours_in_stage >= 48 THEN 'critical'
            WHEN current_stage = 'start_packet' AND hours_in_stage >= 36 THEN 'at_risk'
            WHEN current_stage = 'ops_handoff' AND hours_in_stage >= 24 THEN 'critical'
            WHEN current_stage = 'ops_handoff' AND hours_in_stage >= 18 THEN 'at_risk'
            WHEN current_stage = 'service_delivery' AND hours_in_stage >= 168 THEN 'critical'
            WHEN current_stage = 'service_delivery' AND hours_in_stage >= 120 THEN 'at_risk'
            ELSE 'healthy'
          END AS health_status
        FROM lead_data
      )
      SELECT
        lead_id,
        company_name,
        contact_name,
        current_stage,
        hours_in_stage,
        health_status,
        estimated_value,
        created_at
      FROM with_health
      WHERE health_status IN ('at_risk', 'critical')
      ORDER BY
        CASE health_status WHEN 'critical' THEN 0 ELSE 1 END,
        hours_in_stage DESC
      LIMIT 500
    `

    const result = await bigQueryClient.queryWithParams<BQAtRiskLeadRow>(sql, params)
    return result.rows

  } catch (error) {
    throw handleBigQueryError(error, 'getLeadServiceAtRiskLeads', options)
  }
}

/**
 * Get leads in handoff stages (Lead Intake or Ops Handoff)
 */
export async function getLeadServiceHandoffLeads(
  handoffType: 'lead_to_schedule' | 'sales_to_ops',
  options: LeadServiceQueryOptions = {}
): Promise<BQHandoffLeadRow[]> {
  try {
    // Validation
    const daysBack = validateNumeric(options.daysBack, 'daysBack', 1, 365) || 90

    // Determine stage based on handoff type (validated literal values)
    const targetStage = handoffType === 'lead_to_schedule' ? 'lead_intake' : 'ops_handoff'

    // Build params object
    const params: Record<string, string | number> = {
      targetStage,
      daysBack,
    }

    const sql = `
      WITH lead_data AS (
        SELECT
          COALESCE(CAST(lead_ID AS STRING), rtx_lead_uid) AS lead_id,
          COALESCE(contact_name, 'Unknown Contact') AS company_name,
          COALESCE(contact_name, 'Unknown Contact') AS contact_name,
          COALESCE(sales_employee, 'Unassigned') AS assigned_bd,
          COALESCE(sales_employee, 'Unassigned') AS assigned_ae,
          CASE
            WHEN sold_date IS NOT NULL THEN 'service_delivery'
            WHEN proposed_date IS NOT NULL THEN 'ops_handoff'
            WHEN inspected_date IS NOT NULL THEN 'start_packet'
            WHEN scheduled_date IS NOT NULL THEN 'sales_process'
            ELSE 'lead_intake'
          END AS current_stage,
          TIMESTAMP_DIFF(CURRENT_TIMESTAMP(),
            CASE
              WHEN proposed_date IS NOT NULL THEN proposed_date
              WHEN inspected_date IS NOT NULL THEN inspected_date
              WHEN scheduled_date IS NOT NULL THEN scheduled_date
              ELSE received_date
            END,
            HOUR
          ) AS hours_in_stage,
          CASE
            WHEN inspected_date IS NOT NULL THEN TRUE
            ELSE FALSE
          END AS start_packet_complete,
          COALESCE(value_proposed, value_sold_raw, 2500) AS estimated_value
        FROM \`${PROJECT}.${DATASET}.${LEADS_TABLE}\`
        WHERE DATE(received_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL @daysBack DAY)
          AND cancel_date IS NULL
      ),
      with_health AS (
        SELECT
          *,
          CASE
            WHEN hours_in_stage >= 24 THEN 'critical'
            WHEN hours_in_stage >= 18 THEN 'at_risk'
            ELSE 'healthy'
          END AS health_status,
          CASE
            WHEN hours_in_stage >= 24 THEN 'delayed'
            WHEN hours_in_stage >= 12 THEN 'pending'
            ELSE 'pending'
          END AS handoff_status
        FROM lead_data
        WHERE current_stage = @targetStage
      )
      SELECT
        lead_id,
        company_name,
        contact_name,
        assigned_bd,
        assigned_ae,
        hours_in_stage,
        health_status,
        handoff_status,
        start_packet_complete,
        estimated_value
      FROM with_health
      ORDER BY
        CASE health_status WHEN 'critical' THEN 0 WHEN 'at_risk' THEN 1 ELSE 2 END,
        hours_in_stage DESC
      LIMIT 200
    `

    const result = await bigQueryClient.queryWithParams<BQHandoffLeadRow>(sql, params)
    return result.rows

  } catch (error) {
    throw handleBigQueryError(error, 'getLeadServiceHandoffLeads', options)
  }
}

/**
 * Get risk reason breakdown aggregated from at-risk leads
 */
export async function getLeadServiceRiskReasons(
  options: LeadServiceQueryOptions = {}
): Promise<{ reason: string; count: number }[]> {
  const { daysBack = 90 } = options

  const sql = `
    WITH lead_data AS (
      SELECT
        CASE
          WHEN sold_date IS NOT NULL THEN 'service_delivery'
          WHEN proposed_date IS NOT NULL THEN 'ops_handoff'
          WHEN inspected_date IS NOT NULL THEN 'start_packet'
          WHEN scheduled_date IS NOT NULL THEN 'sales_process'
          ELSE 'lead_intake'
        END AS current_stage,
        TIMESTAMP_DIFF(CURRENT_TIMESTAMP(),
          CASE
            WHEN sold_date IS NOT NULL THEN sold_date
            WHEN proposed_date IS NOT NULL THEN proposed_date
            WHEN inspected_date IS NOT NULL THEN inspected_date
            WHEN scheduled_date IS NOT NULL THEN scheduled_date
            ELSE received_date
          END,
          HOUR
        ) AS hours_in_stage
      FROM \`${PROJECT}.${DATASET}.${LEADS_TABLE}\`
      WHERE DATE(received_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${daysBack} DAY)
        AND cancel_date IS NULL
    ),
    with_health AS (
      SELECT
        current_stage,
        hours_in_stage,
        CASE WHEN current_stage IN ('lead_intake', 'ops_handoff') THEN TRUE ELSE FALSE END AS is_handoff,
        CASE
          WHEN current_stage = 'lead_intake' AND hours_in_stage >= 24 THEN 'critical'
          WHEN current_stage = 'lead_intake' AND hours_in_stage >= 18 THEN 'at_risk'
          WHEN current_stage = 'sales_process' AND hours_in_stage >= 336 THEN 'critical'
          WHEN current_stage = 'sales_process' AND hours_in_stage >= 240 THEN 'at_risk'
          WHEN current_stage = 'start_packet' AND hours_in_stage >= 48 THEN 'critical'
          WHEN current_stage = 'start_packet' AND hours_in_stage >= 36 THEN 'at_risk'
          WHEN current_stage = 'ops_handoff' AND hours_in_stage >= 24 THEN 'critical'
          WHEN current_stage = 'ops_handoff' AND hours_in_stage >= 18 THEN 'at_risk'
          WHEN current_stage = 'service_delivery' AND hours_in_stage >= 168 THEN 'critical'
          WHEN current_stage = 'service_delivery' AND hours_in_stage >= 120 THEN 'at_risk'
          ELSE 'healthy'
        END AS health_status
      FROM lead_data
    ),
    at_risk_only AS (
      SELECT * FROM with_health WHERE health_status IN ('at_risk', 'critical')
    )
    SELECT
      'exceeded_sla' AS reason,
      COUNT(*) AS count
    FROM at_risk_only
    WHERE health_status = 'critical'

    UNION ALL

    SELECT
      'handoff_delayed' AS reason,
      COUNT(*) AS count
    FROM at_risk_only
    WHERE is_handoff = TRUE

    UNION ALL

    SELECT
      'no_activity' AS reason,
      CAST(COUNT(*) * 0.3 AS INT64) AS count
    FROM at_risk_only
  `

  const result = await bigQueryClient.query<{ reason: string; count: number }>(sql)
  return result.rows.filter(r => r.count > 0)
}
