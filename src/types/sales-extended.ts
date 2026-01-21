/**
 * Sales Extended Types
 *
 * Extended type definitions for sales operations beyond core opportunities.
 * Covers speed to install, backlog, cancellations, and daily metrics.
 */

// =============================================================================
// SPEED TO INSTALL TYPES
// =============================================================================

export interface SpeedToInstallMetric {
  period: string
  periodStart: Date
  periodEnd: Date

  // Volume
  totalSold: number
  totalInstalled: number

  // Time metrics
  avgDaysToInstall: number
  medianDaysToInstall: number
  minDaysToInstall: number
  maxDaysToInstall: number

  // SLA buckets
  within24Hours: number
  within48Hours: number
  within7Days: number
  within14Days: number
  over14Days: number

  // Rates
  onTimeRate: number // % installed within SLA
  slaTarget: number // SLA target in days
}

export interface SpeedToInstallDetail {
  saleId: string
  accountName: string
  repName: string
  technicianName?: string
  serviceType: string
  saleAmount: number

  // Dates
  soldDate: Date
  scheduledDate?: Date
  installedDate?: Date

  // Calculated
  daysToSchedule?: number
  daysToInstall?: number
  totalDays?: number
  status: 'pending' | 'scheduled' | 'installed' | 'delayed'
  isOverdue: boolean
}

export interface SpeedToInstallTrend {
  date: string
  avgDays: number
  onTimeRate: number
  volume: number
  target: number
}

// =============================================================================
// BACKLOG TYPES
// =============================================================================

export interface BacklogItem {
  id: string
  accountName: string
  accountId: string
  repId: string
  repName: string
  serviceType: string
  amount: number

  // Dates
  soldDate: Date
  scheduledInstallDate?: Date
  expectedStartDate?: Date

  // Status
  status: BacklogStatus
  priority: 'high' | 'medium' | 'low'
  blockedReason?: string

  // Metrics
  daysSinceSold: number
  daysPastDue?: number
  isAtRisk: boolean
}

export type BacklogStatus =
  | 'pending_schedule'
  | 'scheduled'
  | 'parts_ordered'
  | 'waiting_customer'
  | 'blocked'
  | 'ready'

export interface BacklogSummary {
  totalItems: number
  totalValue: number

  // By status
  byStatus: Record<BacklogStatus, { count: number; value: number }>

  // By age
  under7Days: { count: number; value: number }
  days7to14: { count: number; value: number }
  days14to30: { count: number; value: number }
  over30Days: { count: number; value: number }

  // Risk
  atRiskCount: number
  atRiskValue: number
  blockedCount: number
  blockedValue: number

  // Trends
  avgAge: number
  oldestItem: number
}

export interface BacklogTrend {
  date: string
  totalCount: number
  totalValue: number
  avgAge: number
  atRiskCount: number
}

// =============================================================================
// CANCELED AGREEMENT TYPES
// =============================================================================

export interface CanceledAgreement {
  id: string
  accountName: string
  accountId: string
  repId: string
  repName: string
  serviceType: string
  amount: number

  // Dates
  soldDate: Date
  cancelDate: Date
  daysToCancel: number

  // Cancellation details
  cancelReason: CancelReason
  cancelReasonDetail?: string
  cancelInitiator: 'customer' | 'company' | 'other'
  wasStarted: boolean

  // Recovery
  recoveryAttempted: boolean
  recoverySuccessful?: boolean
  recoveryNotes?: string
}

export type CancelReason =
  | 'price'
  | 'competitor'
  | 'changed_mind'
  | 'service_not_needed'
  | 'moved'
  | 'financial'
  | 'poor_service'
  | 'scheduling'
  | 'other'

export interface CancelReasonAnalysis {
  reason: CancelReason
  reasonLabel: string
  count: number
  value: number
  percentOfTotal: number
  avgDaysToCancel: number
  trend: 'increasing' | 'decreasing' | 'stable'
}

export interface CancellationSummary {
  period: string
  totalCanceled: number
  totalValue: number
  cancelRate: number // % of sales canceled
  avgDaysToCancel: number

  // By reason
  byReason: CancelReasonAnalysis[]

  // By initiator
  customerInitiated: { count: number; value: number }
  companyInitiated: { count: number; value: number }

  // Recovery
  recoveryAttempts: number
  successfulRecoveries: number
  recoveryRate: number
  recoveredValue: number

  // Pre vs post start
  preStartCancels: { count: number; value: number }
  postStartCancels: { count: number; value: number }
}

// =============================================================================
// TODAY'S SALES TYPES
// =============================================================================

export interface SalesTodayMetrics {
  date: Date
  lastUpdated: Date

  // Closed
  closedWon: number
  closedWonValue: number
  closedLost: number
  closedLostValue: number

  // Pipeline activity
  proposalsSent: number
  proposalsValue: number
  proposalsAccepted: number
  proposalsDeclined: number

  // Appointments
  inspectionsScheduled: number
  inspectionsCompleted: number
  appointmentsSet: number

  // Leads
  newLeadsReceived: number
  leadsAssigned: number
  leadsContacted: number

  // Calls
  totalCalls: number
  connectedCalls: number

  // Comparisons
  vsYesterdayPercent: number
  vsSameDayLastWeekPercent: number
  vsDailyTargetPercent: number
}

export interface SalesTodayByRep {
  repId: string
  repName: string
  market: string
  region: string

  closedWon: number
  closedWonValue: number
  proposalsSent: number
  proposalsValue: number
  inspections: number
  calls: number

  // Rank for today
  rank: number
  isTopPerformer: boolean
}

// =============================================================================
// START RATE TYPES
// =============================================================================

export interface StartRateMetric {
  period: string
  periodStart: Date
  periodEnd: Date

  // Volume
  totalSold: number
  totalStarted: number
  totalCanceled: number

  // Rates
  startRate: number // started / sold
  cancelRate: number // canceled / sold

  // Time
  avgDaysToStart: number

  // By segment
  byServiceType: Record<string, { sold: number; started: number; rate: number }>
  byMarket: Record<string, { sold: number; started: number; rate: number }>
}

export interface StartRateTrend {
  date: string
  sold: number
  started: number
  canceled: number
  startRate: number
  cancelRate: number
  target: number
}

// =============================================================================
// SALES PERFORMANCE TYPES
// =============================================================================

export interface SalesPerformanceCard {
  metric: string
  metricLabel: string
  value: number
  formattedValue: string
  target?: number
  percentOfTarget?: number
  trend: {
    direction: 'up' | 'down' | 'flat'
    value: number
    isPositive: boolean
  }
  sparklineData?: number[]
}

export interface SalesPerformanceDashboard {
  period: string
  cards: SalesPerformanceCard[]
  topDeals: Array<{
    id: string
    accountName: string
    amount: number
    repName: string
    serviceType: string
  }>
  recentActivity: Array<{
    type: 'sale' | 'proposal' | 'inspection' | 'call'
    description: string
    amount?: number
    timestamp: Date
    repName: string
  }>
}
