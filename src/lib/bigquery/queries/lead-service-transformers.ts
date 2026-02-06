/**
 * Client-safe transformers for Lead Service Engine BigQuery data
 *
 * These transformers convert BigQuery response types to the Lead Engine
 * interfaces expected by the UI components.
 *
 * IMPORTANT: This file is imported by client components ('use client').
 * Do NOT import any server-side BigQuery modules here.
 */

import type {
  StageMetrics,
  HandoffMetrics,
  LeadStage,
  HealthStatus,
  HandoffType,
} from '@/lib/lead-engine-data'

// =============================================================================
// BigQuery Response Types (for client-side type safety)
// =============================================================================

export interface BQStageMetricsRow {
  stage: string
  lead_count: number
  avg_hours_in_stage: number
  healthy_count: number
  at_risk_count: number
  critical_count: number
  sla_compliance: number
  total_value: number
  avg_value: number
  at_risk_value: number
}

export interface BQHandoffMetricsRow {
  handoff_type: string
  pending: number
  avg_wait_hours: number
  delayed_count: number
  sla_compliance: number
  leads_at_risk: number
}

export interface BQHandoffTrendRow {
  day: string
  hours: number
  count: number
}

export interface BQPipelineSummaryRow {
  total_leads: number
  healthy_leads: number
  at_risk_leads: number
  critical_leads: number
  avg_lead_to_service_days: number | null
  conversion_rate: number | null
  bottleneck_stage: string | null
  bottleneck_sla_compliance: number | null
  total_pipeline_value: number
  at_risk_value: number
  avg_deal_size: number
}

export interface BQAtRiskLeadRow {
  lead_id: string
  company_name: string
  contact_name: string
  current_stage: string
  hours_in_stage: number
  health_status: string
  estimated_value: number
  created_at: string
}

export interface BQHandoffLeadRow {
  lead_id: string
  company_name: string
  contact_name: string
  assigned_bd: string
  assigned_ae: string
  hours_in_stage: number
  health_status: string
  handoff_status: string
  start_packet_complete: boolean
  estimated_value: number
}

export interface BQRiskReasonRow {
  reason: string
  count: number
}

// =============================================================================
// Configuration
// =============================================================================

const STAGE_NAMES: Record<string, string> = {
  lead_intake: 'Lead Intake',
  sales_handoff: 'Sales Handoff',
  sales_process: 'Sales Process',
  start_packet: 'Start Packet',
  ops_handoff: 'Ops Handoff',
  service_delivery: 'Service Delivery',
}

const STAGE_ORDER: LeadStage[] = [
  'lead_intake',
  'sales_handoff',
  'sales_process',
  'start_packet',
  'ops_handoff',
  'service_delivery',
]

// =============================================================================
// Transformers
// =============================================================================

/**
 * Transform BigQuery stage metrics to Lead Engine StageMetrics[]
 */
export function transformStageMetrics(bqData: BQStageMetricsRow[]): StageMetrics[] {
  const stageMap = new Map((bqData || []).map((row) => [row.stage, row]))

  return STAGE_ORDER.map((stage) => {
    const row = stageMap.get(stage)

    if (!row) {
      return {
        stage,
        stageName: STAGE_NAMES[stage] || stage,
        leadCount: 0,
        avgDaysInStage: 0,
        avgHoursInStage: 0,
        healthyCount: 0,
        atRiskCount: 0,
        criticalCount: 0,
        slaCompliance: 100,
        healthStatus: 'healthy' as HealthStatus,
        totalValue: 0,
        avgValue: 0,
        atRiskValue: 0,
      }
    }

    let healthStatus: HealthStatus = 'healthy'
    if (row.critical_count > 0 || row.sla_compliance < 70) {
      healthStatus = 'critical'
    } else if (row.at_risk_count > 2 || row.sla_compliance < 85) {
      healthStatus = 'at_risk'
    }

    return {
      stage: stage as LeadStage,
      stageName: STAGE_NAMES[stage] || stage,
      leadCount: row.lead_count || 0,
      avgDaysInStage: Math.round(((row.avg_hours_in_stage || 0) / 24) * 10) / 10,
      avgHoursInStage: Math.round((row.avg_hours_in_stage || 0) * 10) / 10,
      healthyCount: row.healthy_count || 0,
      atRiskCount: row.at_risk_count || 0,
      criticalCount: row.critical_count || 0,
      slaCompliance: Math.round(row.sla_compliance || 100),
      healthStatus,
      totalValue: row.total_value || 0,
      avgValue: Math.round(row.avg_value || 0),
      atRiskValue: row.at_risk_value || 0,
    }
  })
}

/**
 * Transform BigQuery handoff metrics to Lead Engine HandoffMetrics[]
 */
export function transformHandoffMetrics(
  bqData: BQHandoffMetricsRow[],
  trendData?: Map<string, BQHandoffTrendRow[]>
): HandoffMetrics[] {
  const handoffDisplayNames: Record<string, string> = {
    bd_to_sales: 'BD \u2192 Sales Handoff',
    sales_to_ops: 'Sales \u2192 Ops Handoff',
  }

  const defaultTrend = Array.from({ length: 14 }, (_, i) => ({
    day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i % 7],
    hours: 12,
    count: 5,
  }))

  return (['bd_to_sales', 'sales_to_ops'] as const).map((type) => {
    const row = (bqData || []).find((r) => r.handoff_type === type)

    if (!row) {
      return {
        type: type as HandoffType,
        displayName: handoffDisplayNames[type],
        pending: 0,
        avgWaitHours: 0,
        delayedCount: 0,
        slaCompliance: 100,
        trend: trendData?.get(type) || defaultTrend,
        leadsAtRisk: 0,
      }
    }

    return {
      type: type as HandoffType,
      displayName: handoffDisplayNames[type],
      pending: row.pending || 0,
      avgWaitHours: Math.round((row.avg_wait_hours || 0) * 10) / 10,
      delayedCount: row.delayed_count || 0,
      slaCompliance: Math.round(row.sla_compliance || 100),
      trend: trendData?.get(type) || defaultTrend,
      leadsAtRisk: row.leads_at_risk || 0,
    }
  })
}

/**
 * Transform BigQuery pipeline summary
 */
export function transformPipelineSummary(row: BQPipelineSummaryRow) {
  if (!row) return { totalLeads: 0, healthyLeads: 0, atRiskLeads: 0, criticalLeads: 0, avgLeadToServiceDays: 0, conversionRate: 0, bottleneckStage: 'None', bottleneckSlaCompliance: 100, totalPipelineValue: 0, atRiskValue: 0, avgDealSize: 0 }
  return {
    totalLeads: row.total_leads || 0,
    healthyLeads: row.healthy_leads || 0,
    atRiskLeads: row.at_risk_leads || 0,
    criticalLeads: row.critical_leads || 0,
    avgLeadToServiceDays: Math.round((row.avg_lead_to_service_days || 0) * 10) / 10,
    conversionRate: Math.round(row.conversion_rate || 0),
    bottleneckStage: row.bottleneck_stage
      ? STAGE_NAMES[row.bottleneck_stage] || row.bottleneck_stage
      : 'None',
    bottleneckSlaCompliance: Math.round(row.bottleneck_sla_compliance || 100),
    totalPipelineValue: row.total_pipeline_value || 0,
    atRiskValue: row.at_risk_value || 0,
    avgDealSize: Math.round(row.avg_deal_size || 0),
  }
}

// =============================================================================
// At-Risk Lead Transformers
// =============================================================================

export type RiskReason =
  | 'exceeded_sla'
  | 'no_activity'
  | 'missing_data'
  | 'handoff_delayed'
  | 'reassignment_pending'

export interface LeadServiceAtRiskLead {
  id: string
  companyName: string
  contactName: string
  currentStage: LeadStage
  hoursInStage: number
  daysInStage: number
  healthStatus: HealthStatus
  estimatedValue: number
  riskReasons: RiskReason[]
  createdAt: Date
}

/**
 * Determine risk reasons based on lead data
 */
function getRiskReasons(lead: BQAtRiskLeadRow): RiskReason[] {
  const reasons: RiskReason[] = []

  // Exceeded SLA if critical
  if (lead.health_status === 'critical') {
    reasons.push('exceeded_sla')
  }

  // Handoff delayed if in handoff stage and at risk
  if (
    (lead.current_stage === 'sales_handoff' || lead.current_stage === 'ops_handoff') &&
    lead.hours_in_stage >= 18
  ) {
    reasons.push('handoff_delayed')
  }

  // Simulate no activity for some at-risk leads (based on hours)
  if (lead.hours_in_stage > 48) {
    reasons.push('no_activity')
  }

  return reasons
}

/**
 * Transform BigQuery at-risk leads to Lead Engine format
 */
export function transformAtRiskLeads(bqData: BQAtRiskLeadRow[]): LeadServiceAtRiskLead[] {
  return (bqData || []).map((row) => ({
    id: row.lead_id || `LEAD-${Math.random().toString(36).substring(7)}`,
    companyName: row.company_name || 'Unknown Company',
    contactName: row.contact_name || 'Unknown Contact',
    currentStage: (row.current_stage as LeadStage) || 'lead_intake',
    hoursInStage: Math.round((row.hours_in_stage || 0) * 10) / 10,
    daysInStage: Math.round(((row.hours_in_stage || 0) / 24) * 10) / 10,
    healthStatus: (row.health_status as HealthStatus) || 'at_risk',
    estimatedValue: row.estimated_value || 2500,
    riskReasons: getRiskReasons(row),
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
  }))
}

// =============================================================================
// Handoff Lead Transformers
// =============================================================================

export interface HandoffLead {
  id: string
  companyName: string
  contactName: string
  assignedBD: string | undefined
  assignedAE: string | undefined
  hoursInStage: number
  healthStatus: HealthStatus
  handoffStatus: 'pending' | 'completed' | 'delayed'
  startPacketComplete: boolean
}

/**
 * Transform BigQuery handoff leads to Lead Engine format
 */
export function transformHandoffLeads(bqData: BQHandoffLeadRow[]): HandoffLead[] {
  return (bqData || []).map((row) => ({
    id: row.lead_id || `LEAD-${Math.random().toString(36).substring(7)}`,
    companyName: row.company_name || 'Unknown Company',
    contactName: row.contact_name || 'Unknown Contact',
    assignedBD: row.assigned_bd === 'Unassigned' ? undefined : row.assigned_bd,
    assignedAE: row.assigned_ae === 'Unassigned' ? undefined : row.assigned_ae,
    hoursInStage: Math.round((row.hours_in_stage || 0) * 10) / 10,
    healthStatus: (row.health_status as HealthStatus) || 'healthy',
    handoffStatus: (row.handoff_status as 'pending' | 'completed' | 'delayed') || 'pending',
    startPacketComplete: row.start_packet_complete || false,
  }))
}

// =============================================================================
// Risk Reason Transformers
// =============================================================================

const RISK_REASON_LABELS: Record<string, string> = {
  exceeded_sla: 'Exceeded SLA',
  no_activity: 'No Activity',
  missing_data: 'Missing Data',
  handoff_delayed: 'Handoff Delayed',
  reassignment_pending: 'Reassignment Pending',
}

export interface RiskReasonBreakdown {
  name: string
  value: number
}

/**
 * Transform BigQuery risk reasons to chart format
 */
export function transformRiskReasons(bqData: BQRiskReasonRow[]): RiskReasonBreakdown[] {
  return (bqData || [])
    .filter((row) => row.count > 0)
    .map((row) => ({
      name: RISK_REASON_LABELS[row.reason] || row.reason,
      value: row.count || 0,
    }))
    .sort((a, b) => b.value - a.value)
}
