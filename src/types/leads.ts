/**
 * Lead Types
 *
 * Type definitions for lead management and traceability.
 */

import type { SourceSystemId } from '@/lib/bigquery/source-systems'

// =============================================================================
// CORE LEAD TYPES
// =============================================================================

export interface Lead {
  id: string
  source: string
  stage: LeadStage
  assignedTo: string
  receivedAt: Date
  updatedAt: Date
  disposition?: LeadDisposition
  market: string
  region: string
  branch?: string

  // Contact info
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zip?: string

  // Lead details
  pestType?: string
  serviceType?: string
  estimatedValue?: number
  notes?: string

  // Traceability
  flowId?: number
  isTraceable?: boolean
  matchConfidence?: MatchConfidence
}

export type LeadStage =
  | 'New'
  | 'Contacted'
  | 'Qualified'
  | 'Scheduled'
  | 'Inspected'
  | 'Proposed'
  | 'Negotiating'
  | 'Closed Won'
  | 'Closed Lost'

export type LeadDisposition =
  | 'Converted'
  | 'Lost'
  | 'No Contact'
  | 'Not Interested'
  | 'Bad Contact'
  | 'Duplicate'
  | 'Scheduled'
  | 'Callback'

export type MatchConfidence = 'high' | 'medium' | 'low' | 'none'

// =============================================================================
// LEAD SOURCE TYPES
// =============================================================================

export interface LeadSource {
  id: string
  name: string
  category: LeadSourceCategory
  channel: LeadChannel
  cost?: number
  averageQuality: number // 1-5 stars
  conversionRate: number
  avgDealSize: number
}

export type LeadSourceCategory =
  | 'inbound'
  | 'outbound'
  | 'referral'
  | 'partner'
  | 'campaign'
  | 'organic'

export type LeadChannel =
  | 'phone'
  | 'web'
  | 'email'
  | 'chat'
  | 'field'
  | 'social'
  | 'direct_mail'

// =============================================================================
// LEAD FUNNEL TYPES
// =============================================================================

export interface LeadFunnelStage {
  stage: LeadStage
  count: number
  value: number
  conversionRate: number
  avgTimeInStage: number // hours
  dropoffRate: number
}

export interface LeadFunnel {
  stages: LeadFunnelStage[]
  totalLeads: number
  totalValue: number
  overallConversionRate: number
  avgCycleTime: number // days
}

// =============================================================================
// LEAD TRACEABILITY TYPES
// =============================================================================

export interface LeadTrace {
  leadId: string
  currentSystem: SourceSystemId
  currentStage: string
  flowId: number
  journey: LeadTraceEvent[]
  isTraceable: boolean
  matchConfidence: MatchConfidence
  lastKnownSystem: SourceSystemId
  lostAtHandoff?: {
    fromSystem: SourceSystemId
    toSystem: SourceSystemId
    expectedAt: Date
  }
  originalSource: string
  sourceChannel: LeadChannel
  outcome: LeadOutcome
  value?: number
  closeDate?: Date
  firstSeen: Date
  lastSeen: Date
  totalJourneyDays: number
}

export interface LeadTraceEvent {
  system: SourceSystemId
  enteredAt: Date
  exitedAt?: Date
  durationMinutes: number
  stage: string
  assignedTo: string
  metadata?: Record<string, unknown>
}

export type LeadOutcome =
  | 'sold'
  | 'lost'
  | 'cancelled'
  | 'pending'
  | 'unknown'

// =============================================================================
// FLOW TRACEABILITY TYPES
// =============================================================================

export interface FlowTraceabilityMetrics {
  flowId: number
  flowName: string
  totalLeads: number
  traceableLeads: number
  matchRate: number
  avgJourneyDays: number
  breakpoints: FlowBreakpoint[]
  outcomes: {
    sold: number
    lost: number
    cancelled: number
    pending: number
    unknown: number
  }
  totalValue: number
  avgValue: number
  atRiskValue: number
}

export interface FlowBreakpoint {
  fromSystem: SourceSystemId
  toSystem: SourceSystemId
  leadsLost: number
  percentLost: number
}

// =============================================================================
// TRACEABILITY REPORT TYPES
// =============================================================================

export interface TraceabilityReport {
  generatedAt: Date
  dateRange: {
    start: Date
    end: Date
  }
  summary: {
    totalLeads: number
    traceableLeads: number
    overallMatchRate: number
    criticalFlowCount: number
    improvementOpportunity: number // $ value
  }
  byFlow: FlowTraceabilityMetrics[]
  bySystem: SystemTraceabilityMetrics[]
  topBreakpoints: TopBreakpoint[]
}

export interface SystemTraceabilityMetrics {
  system: string
  leadsEntered: number
  leadsExited: number
  leadsLost: number
  avgTimeInSystem: number
}

export interface TopBreakpoint {
  fromSystem: string
  toSystem: string
  leadsLost: number
  percentOfTotal: number
  estimatedValueLost: number
}

// =============================================================================
// LEAD ANALYTICS TYPES
// =============================================================================

export interface LeadTrend {
  date: string
  leads: number
  converted: number
  conversionRate: number
  avgValue?: number
}

export interface LeadsBySource {
  source: string
  count: number
  converted: number
  conversionRate: number
  avgValue?: number
}

export interface LeadsByTypePest {
  pestType: string
  leadCount: number
  converted: number
  avgValue: number
  marketShare?: number
}

export interface LeadRanking {
  rank: number
  entity: string
  entityType: 'market' | 'region' | 'branch' | 'rep'
  leads: number
  converted: number
  conversionRate: number
  change: number
  trend: 'up' | 'down' | 'flat'
}

export interface LeadGeographic {
  market: string
  region: string
  lat?: number
  lng?: number
  leads: number
  converted: number
  avgResponseTime: number
  heatmapValue: number
}

// =============================================================================
// LEAD FILTER STATE
// =============================================================================

export interface LeadFilterState {
  flowIds?: number[]
  systems?: SourceSystemId[]
  traceabilityStatus?: 'all' | 'traceable' | 'lost'
  outcome?: LeadOutcome | 'all'
  matchConfidence?: MatchConfidence | 'all'
  dateRange?: {
    start: Date
    end: Date
  }
  market?: string
  region?: string
  branch?: string
  source?: string[]
  stage?: LeadStage[]
}
