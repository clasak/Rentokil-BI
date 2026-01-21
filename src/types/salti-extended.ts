/**
 * SALTI Extended Types
 *
 * Type definitions for Sales Activity, Leads, Tracking, and Insights.
 * Covers daily check-ins, productivity metrics, and sales rep analytics.
 */

// =============================================================================
// DAILY CHECK-IN TYPES
// =============================================================================

export interface DailyCheckIn {
  id: string
  repId: string
  repName: string
  date: Date
  market: string
  region: string
  branch?: string

  // Activity metrics
  callsMade: number
  callsConnected: number
  appointmentsSet: number
  appointmentsCompleted: number
  proposalsSent: number
  proposalsValue: number
  salesClosed: number
  salesValue: number

  // Goals
  callGoal: number
  appointmentGoal: number
  proposalGoal: number
  salesGoal: number

  // Calculated
  callConnectRate: number
  appointmentSetRate: number
  proposalCloseRate: number
  goalAttainment: number

  // Notes
  challenges?: string
  wins?: string
  planForTomorrow?: string
}

export interface DailyCheckInSummary {
  date: Date
  totalReps: number
  repsCheckedIn: number
  checkInRate: number

  // Aggregated metrics
  totalCalls: number
  totalAppointments: number
  totalProposals: number
  totalSales: number
  totalValue: number

  // Averages
  avgCallsPerRep: number
  avgAppointmentsPerRep: number
  avgProposalsPerRep: number
  avgSalesPerRep: number

  // Top performers
  topPerformers: Array<{
    repId: string
    repName: string
    metric: 'calls' | 'appointments' | 'proposals' | 'sales'
    value: number
  }>
}

// =============================================================================
// PRODUCTIVITY TYPES
// =============================================================================

export interface RepProductivity {
  repId: string
  repName: string
  market: string
  region: string
  branch?: string
  period: string

  // Volume metrics
  leadsAssigned: number
  leadsWorked: number
  contactsMade: number
  appointmentsSet: number
  inspectionsCompleted: number
  proposalsGenerated: number
  proposalsPresented: number
  salesClosed: number

  // Value metrics
  proposalValue: number
  salesValue: number
  avgDealSize: number

  // Rates
  leadWorkRate: number
  contactRate: number
  appointmentRate: number
  inspectionRate: number
  proposalRate: number
  closeRate: number

  // Time metrics
  avgLeadResponseTime: number // minutes
  avgCycleTime: number // days
  avgTimePerLead: number // minutes

  // Ranking
  rank: number
  rankChange: number
  percentile: number
}

export interface ProductivityTrend {
  period: string
  date: Date
  metric: ProductivityMetric
  value: number
  target?: number
  percentOfTarget?: number
}

export type ProductivityMetric =
  | 'leads_worked'
  | 'contacts_made'
  | 'appointments_set'
  | 'proposals_sent'
  | 'sales_closed'
  | 'revenue'
  | 'conversion_rate'
  | 'avg_deal_size'

// =============================================================================
// PROPOSAL PIPELINE TYPES
// =============================================================================

export interface ProposalPipelineItem {
  id: string
  accountName: string
  repId: string
  repName: string
  createdAt: Date
  presentedAt?: Date
  status: ProposalStatus
  amount: number
  serviceType: string
  expiresAt?: Date
  followUpDate?: Date
  notes?: string

  // Customer info
  customerName: string
  customerPhone?: string
  customerEmail?: string

  // Tracking
  daysOpen: number
  touchpoints: number
  lastTouchpoint?: Date
}

export type ProposalStatus =
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'presented'
  | 'negotiating'
  | 'accepted'
  | 'declined'
  | 'expired'

export interface ProposalPipelineSummary {
  totalProposals: number
  totalValue: number
  byStatus: Record<ProposalStatus, { count: number; value: number }>
  avgTimeToClose: number
  avgAmount: number
  winRate: number
  expiringSoon: number
  needsFollowUp: number
}

// =============================================================================
// YOY COMPARISON TYPES
// =============================================================================

export interface YoYComparison {
  metric: string
  metricLabel: string
  currentPeriod: {
    value: number
    start: Date
    end: Date
  }
  priorPeriod: {
    value: number
    start: Date
    end: Date
  }
  change: number
  changePercent: number
  trend: 'up' | 'down' | 'flat'
  isPositive: boolean // Whether increase is good (e.g., true for revenue, false for churn)
}

export interface YoYTrendPoint {
  date: string
  currentYear: number
  priorYear: number
  change: number
  changePercent: number
}

// =============================================================================
// FUNNEL FALLOUT TYPES
// =============================================================================

export interface FunnelFalloutStage {
  stage: string
  stageOrder: number
  entered: number
  exited: number
  converted: number
  lost: number
  conversionRate: number
  falloutRate: number
  avgTimeInStage: number // hours
  topFalloutReasons: Array<{
    reason: string
    count: number
    percent: number
  }>
}

export interface FunnelFalloutAnalysis {
  period: string
  stages: FunnelFalloutStage[]
  overallConversionRate: number
  biggestDropoff: {
    stage: string
    falloutRate: number
    leadsLost: number
  }
  recommendations: string[]
}

// =============================================================================
// SALES LADDER TYPES
// =============================================================================

export interface SalesLadderEntry {
  rank: number
  repId: string
  repName: string
  market: string
  region: string
  branch?: string

  // Performance
  revenue: number
  deals: number
  avgDealSize: number
  winRate: number

  // Goals
  quota: number
  attainment: number

  // Trend
  priorRank?: number
  rankChange: number
  trend: 'up' | 'down' | 'flat'

  // Details
  topServiceType?: string
  topLeadSource?: string
  avgCycleTime?: number
}

export interface SalesLadderSummary {
  period: string
  totalReps: number
  totalRevenue: number
  avgRevenue: number
  avgAttainment: number
  repsAtQuota: number
  percentAtQuota: number
  topPerformer: SalesLadderEntry
  biggestMover: {
    entry: SalesLadderEntry
    movement: number
  }
}

// =============================================================================
// WEEKEND BLITZ TYPES
// =============================================================================

export interface WeekendBlitzCampaign {
  id: string
  name: string
  startDate: Date
  endDate: Date
  status: 'upcoming' | 'active' | 'completed'
  market?: string
  region?: string

  // Goals
  leadGoal: number
  appointmentGoal: number
  salesGoal: number
  revenueGoal: number

  // Results
  leadsGenerated: number
  appointmentsSet: number
  salesClosed: number
  revenueGenerated: number

  // Participation
  totalReps: number
  activeReps: number

  // Calculated
  leadAttainment: number
  appointmentAttainment: number
  salesAttainment: number
  revenueAttainment: number
}

export interface WeekendBlitzLeaderboard {
  campaignId: string
  entries: Array<{
    rank: number
    repId: string
    repName: string
    leads: number
    appointments: number
    sales: number
    revenue: number
    points: number
  }>
  lastUpdated: Date
}

// =============================================================================
// SALTI DASHBOARD STATE
// =============================================================================

export interface SaltiDashboardState {
  selectedPeriod: 'today' | 'wtd' | 'mtd' | 'qtd' | 'ytd'
  selectedMarket?: string
  selectedRegion?: string
  selectedRep?: string
  comparisonMode: 'yoy' | 'mom' | 'wow' | 'none'
  showTargets: boolean
}
