/**
 * Lead Traceability Service
 *
 * Core service for tracking leads across multiple source systems.
 * Implements the "Master Lead Service Engine" strategic initiative.
 *
 * This module contains:
 * - BigQuery queries for lead data
 * - Traceability calculations
 * - Match rate computations
 * - Demo data generation for development
 */

import seedrandom from 'seedrandom'
import { LEAD_FLOWS, SOURCE_SYSTEMS, getMatchRateStatus } from './source-systems'
import type {
  LeadTrace,
  LeadTraceEvent,
  FlowTraceabilityMetrics,
  TraceabilityReport,
  LeadFilterState,
} from './types'
import type { LeadFlowDefinition, SourceSystemId } from './source-systems'

// =============================================================================
// BIGQUERY QUERIES (Templates for real data)
// =============================================================================

/**
 * Query templates for BigQuery
 * Replace {project}, {dataset}, etc. with actual values
 */
export const TRACEABILITY_QUERIES = {
  /**
   * Get leads from Lead Exec with their current stage
   */
  leadsFromLeadExec: `
    SELECT
      lead_id,
      lead_source,
      lead_stage,
      assigned_to,
      received_date,
      last_modified_date,
      disposition,
      market,
      region,
      branch
    FROM \`{project}.{dataset}.LeadsExecAPIExtract_STG\`
    WHERE received_date >= DATE_SUB(CURRENT_DATE(), INTERVAL @days_back DAY)
      {filters}
    ORDER BY received_date DESC
  `,

  /**
   * Get opportunities from Sales Exec
   */
  opportunitiesFromSalesExec: `
    SELECT
      lead_id,
      opportunity_id,
      stage,
      amount,
      close_date,
      created_date,
      owner_id,
      source,
      market,
      region
    FROM \`{project}.{dataset}.SalesExecAPIExtract\`
    WHERE created_date >= DATE_SUB(CURRENT_DATE(), INTERVAL @days_back DAY)
      {filters}
    ORDER BY created_date DESC
  `,

  /**
   * Join leads across systems to calculate traceability
   * This is the core query for matching leads
   */
  leadTraceability: `
    WITH lead_exec AS (
      SELECT
        lead_id,
        'LEAD_EXEC' as system,
        received_date as event_time,
        lead_stage as stage,
        assigned_to,
        lead_source,
        market,
        region,
        branch
      FROM \`{project}.{dataset}.LeadsExecAPIExtract_STG\`
      WHERE received_date >= DATE_SUB(CURRENT_DATE(), INTERVAL @days_back DAY)
    ),
    sales_exec AS (
      SELECT
        lead_id,
        'SALES_EXEC' as system,
        created_date as event_time,
        stage,
        owner_id as assigned_to,
        source as lead_source,
        market,
        region,
        NULL as branch
      FROM \`{project}.{dataset}.SalesExecAPIExtract\`
      WHERE created_date >= DATE_SUB(CURRENT_DATE(), INTERVAL @days_back DAY)
    ),
    combined AS (
      SELECT * FROM lead_exec
      UNION ALL
      SELECT * FROM sales_exec
    )
    SELECT
      lead_id,
      ARRAY_AGG(STRUCT(system, event_time, stage, assigned_to) ORDER BY event_time) as journey,
      COUNT(DISTINCT system) as systems_touched,
      MIN(event_time) as first_seen,
      MAX(event_time) as last_seen,
      ANY_VALUE(lead_source) as source,
      ANY_VALUE(market) as market,
      ANY_VALUE(region) as region
    FROM combined
    GROUP BY lead_id
    ORDER BY first_seen DESC
  `,

  /**
   * Calculate match rates by flow
   */
  matchRatesByFlow: `
    WITH lead_journey AS (
      -- Get lead journeys (use the traceability query result)
      SELECT
        lead_id,
        systems_touched,
        first_seen,
        last_seen,
        source,
        -- Determine flow based on source and systems
        CASE
          WHEN source LIKE '%outbound%' AND systems_touched = 1 THEN 4
          WHEN source LIKE '%outbound%' AND systems_touched > 1 THEN 5
          WHEN source LIKE '%field%' THEN 6
          WHEN source LIKE '%web%' AND systems_touched = 2 THEN 7
          WHEN source LIKE '%web%' AND systems_touched = 1 THEN 8
          WHEN source LIKE '%tech%' OR source LIKE '%tap%' THEN 10
          ELSE 0
        END as flow_id
      FROM lead_traceability_view
    )
    SELECT
      flow_id,
      COUNT(*) as total_leads,
      SUM(CASE WHEN systems_touched > 0 THEN 1 ELSE 0 END) as traceable_leads,
      SAFE_DIVIDE(
        SUM(CASE WHEN systems_touched > 0 THEN 1 ELSE 0 END),
        COUNT(*)
      ) as match_rate
    FROM lead_journey
    WHERE flow_id > 0
    GROUP BY flow_id
    ORDER BY flow_id
  `,
}

// =============================================================================
// DEMO DATA GENERATION
// =============================================================================

let rng: () => number

function initSeed(seed: number = 98765) {
  rng = seedrandom(seed.toString())
}

function randomInt(min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min
}

function randomFloat(min: number, max: number): number {
  return rng() * (max - min) + min
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)]
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + rng() * (end.getTime() - start.getTime()))
}

/**
 * Generate demo lead traces for development
 */
function generateDemoLeadTrace(id: number, flow: LeadFlowDefinition): LeadTrace {
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const firstSeen = randomDate(thirtyDaysAgo, now)

  // Generate journey through systems based on flow definition
  const journey: LeadTraceEvent[] = []
  let currentTime = new Date(firstSeen)

  for (let i = 0; i < flow.systems.length; i++) {
    const system = flow.systems[i]
    const enteredAt = new Date(currentTime)
    const durationHours = randomFloat(1, 48)
    const exitedAt = new Date(currentTime.getTime() + durationHours * 60 * 60 * 1000)

    journey.push({
      system,
      enteredAt,
      exitedAt: i < flow.systems.length - 1 ? exitedAt : undefined,
      durationMinutes: Math.round(durationHours * 60),
      stage: getStageForSystem(system),
      assignedTo: `Agent-${randomInt(100, 999)}`,
    })

    currentTime = exitedAt
  }

  // Determine if lead is traceable based on flow match rate
  const isTraceable = rng() < flow.matchRate

  // Determine outcome
  const outcomeRoll = rng()
  let outcome: LeadTrace['outcome']
  if (outcomeRoll < 0.35) outcome = 'sold'
  else if (outcomeRoll < 0.55) outcome = 'lost'
  else if (outcomeRoll < 0.60) outcome = 'cancelled'
  else outcome = 'pending'

  const lastSeen = journey[journey.length - 1]?.exitedAt || journey[journey.length - 1]?.enteredAt || firstSeen
  const totalJourneyDays = (lastSeen.getTime() - firstSeen.getTime()) / (24 * 60 * 60 * 1000)

  return {
    leadId: `LEAD-${String(id).padStart(6, '0')}`,
    currentSystem: flow.systems[flow.systems.length - 1],
    currentStage: getStageForSystem(flow.systems[flow.systems.length - 1]),
    flowId: flow.id,
    journey,
    isTraceable,
    matchConfidence: isTraceable ? (rng() > 0.3 ? 'high' : 'medium') : (rng() > 0.5 ? 'low' : 'none'),
    lastKnownSystem: isTraceable ? flow.systems[flow.systems.length - 1] : flow.systems[Math.floor(flow.systems.length / 2)],
    lostAtHandoff: !isTraceable && flow.systems.length > 1 ? {
      fromSystem: flow.systems[0],
      toSystem: flow.systems[1],
      expectedAt: new Date(firstSeen.getTime() + randomInt(12, 48) * 60 * 60 * 1000),
    } : undefined,
    originalSource: getSourceForFlow(flow),
    sourceChannel: randomChoice(['phone', 'web', 'email', 'chat', 'field']),
    outcome,
    value: outcome === 'sold' ? randomInt(500, 15000) : undefined,
    closeDate: outcome === 'sold' || outcome === 'lost' ? lastSeen : undefined,
    firstSeen,
    lastSeen,
    totalJourneyDays: Math.round(totalJourneyDays * 10) / 10,
  }
}

function getStageForSystem(system: SourceSystemId | string): string {
  const stageMap: Record<string, string[]> = {
    INVOCA: ['Call Received', 'Call Qualified', 'Call Transferred'],
    FIVE9: ['Queue', 'Connected', 'Disposition Set'],
    LEAD_EXEC: ['MQL', 'Routed', 'Assigned', 'Contacted'],
    SALES_EXEC: ['SQL', 'Scheduled', 'Inspected', 'Proposed', 'Negotiating'],
    WINNING_FORMULA: ['Field Visit', 'Inspection', 'Proposal', 'Close'],
    PESTPAC: ['Service Created', 'Scheduled', 'Completed'],
    WEB_FORMS: ['Form Submitted', 'Validated'],
    SALESFORCE: ['Lead', 'Contact', 'Opportunity'],
  }
  const stages = stageMap[system] || ['Active']
  return randomChoice(stages)
}

function getSourceForFlow(flow: LeadFlowDefinition): string {
  switch (flow.category) {
    case 'residential_outbound':
      return randomChoice(['Outbound Call', 'Outbound Campaign', 'Cold Call'])
    case 'web_inbound':
      return randomChoice(['Website Form', 'Email', 'Chat', 'Quote Request'])
    case 'trusted_advisor':
      return randomChoice(['Tech Referral', 'TAP Lead', 'Upsell'])
    case 'commercial':
      return randomChoice(['Commercial Inbound', 'Commercial Prospecting', 'Referral'])
    default:
      return 'Other'
  }
}

// =============================================================================
// DATA ACCESS FUNCTIONS
// =============================================================================

let demoLeadTraces: LeadTrace[] = []

/**
 * Generate demo lead traces
 */
export function generateDemoTraces(seed: number = 98765): LeadTrace[] {
  initSeed(seed)

  const traces: LeadTrace[] = []
  let id = 1

  // Generate traces for each flow based on priority and volume
  Object.values(LEAD_FLOWS).forEach(flow => {
    const count = flow.volumeEstimate === 'high' ? randomInt(40, 60)
                : flow.volumeEstimate === 'medium' ? randomInt(20, 35)
                : randomInt(5, 15)

    for (let i = 0; i < count; i++) {
      traces.push(generateDemoLeadTrace(id++, flow))
    }
  })

  demoLeadTraces = traces
  return traces
}

/**
 * Get all lead traces (demo data)
 */
export function getLeadTraces(): LeadTrace[] {
  if (demoLeadTraces.length === 0) {
    generateDemoTraces()
  }
  return demoLeadTraces
}

/**
 * Get lead traces filtered by criteria
 */
export function getFilteredLeadTraces(filters: LeadFilterState): LeadTrace[] {
  let traces = getLeadTraces()

  if (filters.flowIds && filters.flowIds.length > 0) {
    traces = traces.filter(t => filters.flowIds!.includes(t.flowId))
  }

  if (filters.systems && filters.systems.length > 0) {
    traces = traces.filter(t => filters.systems!.includes(t.currentSystem))
  }

  if (filters.traceabilityStatus && filters.traceabilityStatus !== 'all') {
    if (filters.traceabilityStatus === 'traceable') {
      traces = traces.filter(t => t.isTraceable)
    } else if (filters.traceabilityStatus === 'lost') {
      traces = traces.filter(t => !t.isTraceable)
    }
  }

  if (filters.outcome && filters.outcome !== 'all') {
    traces = traces.filter(t => t.outcome === filters.outcome)
  }

  if (filters.matchConfidence && filters.matchConfidence !== 'all') {
    traces = traces.filter(t => t.matchConfidence === filters.matchConfidence)
  }

  return traces
}

/**
 * Get traceability metrics for a specific flow
 */
export function getFlowMetrics(flowId: number): FlowTraceabilityMetrics | null {
  const flow = Object.values(LEAD_FLOWS).find(f => f.id === flowId)
  if (!flow) return null

  const traces = getLeadTraces().filter(t => t.flowId === flowId)
  const traceableCount = traces.filter(t => t.isTraceable).length

  // Calculate breakpoints
  const breakpoints: FlowTraceabilityMetrics['breakpoints'] = []
  for (let i = 0; i < flow.systems.length - 1; i++) {
    const fromSystem = flow.systems[i]
    const toSystem = flow.systems[i + 1]
    const lostAtThisHandoff = traces.filter(
      t => !t.isTraceable && t.lostAtHandoff?.fromSystem === fromSystem && t.lostAtHandoff?.toSystem === toSystem
    ).length

    if (lostAtThisHandoff > 0) {
      breakpoints.push({
        fromSystem,
        toSystem,
        leadsLost: lostAtThisHandoff,
        percentLost: traces.length > 0 ? (lostAtThisHandoff / traces.length) * 100 : 0,
      })
    }
  }

  // Calculate outcomes
  const outcomes = {
    sold: traces.filter(t => t.outcome === 'sold').length,
    lost: traces.filter(t => t.outcome === 'lost').length,
    cancelled: traces.filter(t => t.outcome === 'cancelled').length,
    pending: traces.filter(t => t.outcome === 'pending').length,
    unknown: traces.filter(t => t.outcome === 'unknown' || !t.outcome).length,
  }

  // Value metrics
  const soldTraces = traces.filter(t => t.outcome === 'sold' && t.value)
  const totalValue = soldTraces.reduce((sum, t) => sum + (t.value || 0), 0)
  const atRiskTraces = traces.filter(t => !t.isTraceable && t.outcome === 'pending')
  const avgEstimatedValue = 3500 // Estimated average deal value
  const atRiskValue = atRiskTraces.length * avgEstimatedValue

  return {
    flowId: flow.id,
    flowName: flow.name,
    totalLeads: traces.length,
    traceableLeads: traceableCount,
    matchRate: traces.length > 0 ? traceableCount / traces.length : 0,
    avgJourneyDays: traces.length > 0
      ? traces.reduce((sum, t) => sum + t.totalJourneyDays, 0) / traces.length
      : 0,
    breakpoints,
    outcomes,
    totalValue,
    avgValue: soldTraces.length > 0 ? totalValue / soldTraces.length : 0,
    atRiskValue,
  }
}

/**
 * Get full traceability report
 */
export function getTraceabilityReport(filters?: LeadFilterState): TraceabilityReport {
  const traces = filters ? getFilteredLeadTraces(filters) : getLeadTraces()
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const traceableCount = traces.filter(t => t.isTraceable).length
  const avgEstimatedValue = 3500

  // Get metrics by flow
  const byFlow: FlowTraceabilityMetrics[] = []
  Object.values(LEAD_FLOWS).forEach(flow => {
    const metrics = getFlowMetrics(flow.id)
    if (metrics && metrics.totalLeads > 0) {
      byFlow.push(metrics)
    }
  })

  // Calculate by system
  const systemMetrics: Record<string, { entered: number; exited: number; lost: number; totalTime: number }> = {}

  traces.forEach(trace => {
    trace.journey.forEach((event, idx) => {
      if (!systemMetrics[event.system]) {
        systemMetrics[event.system] = { entered: 0, exited: 0, lost: 0, totalTime: 0 }
      }
      systemMetrics[event.system].entered++
      if (event.exitedAt) {
        systemMetrics[event.system].exited++
      }
      if (event.durationMinutes) {
        systemMetrics[event.system].totalTime += event.durationMinutes
      }
    })

    if (!trace.isTraceable && trace.lostAtHandoff) {
      const lostSystem = trace.lostAtHandoff.fromSystem
      if (systemMetrics[lostSystem]) {
        systemMetrics[lostSystem].lost++
      }
    }
  })

  const bySystem = Object.entries(systemMetrics).map(([system, metrics]) => ({
    system,
    leadsEntered: metrics.entered,
    leadsExited: metrics.exited,
    leadsLost: metrics.lost,
    avgTimeInSystem: metrics.entered > 0 ? metrics.totalTime / metrics.entered : 0,
  }))

  // Top breakpoints
  const allBreakpoints: Map<string, { count: number; value: number }> = new Map()
  byFlow.forEach(flow => {
    flow.breakpoints.forEach(bp => {
      const key = `${bp.fromSystem}→${bp.toSystem}`
      const existing = allBreakpoints.get(key) || { count: 0, value: 0 }
      allBreakpoints.set(key, {
        count: existing.count + bp.leadsLost,
        value: existing.value + bp.leadsLost * avgEstimatedValue,
      })
    })
  })

  const topBreakpoints = Array.from(allBreakpoints.entries())
    .map(([key, data]) => {
      const [from, to] = key.split('→')
      return {
        fromSystem: from,
        toSystem: to,
        leadsLost: data.count,
        percentOfTotal: traces.length > 0 ? (data.count / traces.length) * 100 : 0,
        estimatedValueLost: data.value,
      }
    })
    .sort((a, b) => b.leadsLost - a.leadsLost)
    .slice(0, 5)

  const criticalFlowCount = byFlow.filter(f => getMatchRateStatus(f.matchRate) === 'critical').length
  const lostLeadsValue = traces.filter(t => !t.isTraceable).length * avgEstimatedValue

  return {
    generatedAt: now,
    dateRange: {
      start: thirtyDaysAgo,
      end: now,
    },
    summary: {
      totalLeads: traces.length,
      traceableLeads: traceableCount,
      overallMatchRate: traces.length > 0 ? traceableCount / traces.length : 0,
      criticalFlowCount,
      improvementOpportunity: lostLeadsValue,
    },
    byFlow,
    bySystem,
    topBreakpoints,
  }
}

/**
 * Get summary statistics for dashboard
 */
export function getTraceabilitySummary(): {
  totalLeads: number
  traceableLeads: number
  matchRate: number
  criticalFlows: number
  perfectFlows: number
  topIssue: string
  valueAtRisk: number
} {
  const report = getTraceabilityReport()

  const topBreakpoint = report.topBreakpoints[0]
  const topIssue = topBreakpoint
    ? `${topBreakpoint.leadsLost} leads lost at ${topBreakpoint.fromSystem}→${topBreakpoint.toSystem}`
    : 'No significant issues'

  return {
    totalLeads: report.summary.totalLeads,
    traceableLeads: report.summary.traceableLeads,
    matchRate: report.summary.overallMatchRate,
    criticalFlows: report.summary.criticalFlowCount,
    perfectFlows: report.byFlow.filter(f => getMatchRateStatus(f.matchRate) === 'perfect').length,
    topIssue,
    valueAtRisk: report.summary.improvementOpportunity,
  }
}

// Initialize demo data
generateDemoTraces()
