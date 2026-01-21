// RTX Power BI SALTI Extended Types (Sales Lifecycle Tracking & Insights)

export type SaltiStage =
  | 'prospect'
  | 'qualification'
  | 'needs_analysis'
  | 'proposal'
  | 'negotiation'
  | 'closed_won'
  | 'closed_lost'

export type SaltiActivityType =
  | 'call'
  | 'email'
  | 'meeting'
  | 'site_visit'
  | 'proposal_sent'
  | 'follow_up'
  | 'demo'
  | 'contract_review'

export interface SaltiOpportunity {
  id: string
  accountId: string
  accountName: string
  contactName: string
  contactEmail: string
  contactPhone: string

  // Stage tracking
  currentStage: SaltiStage
  stageHistory: SaltiStageChange[]
  probability: number

  // Value
  estimatedValue: number
  weightedValue: number
  mrr: number // Monthly recurring revenue
  arr: number // Annual recurring revenue

  // Service details
  serviceTypes: string[]
  contractLength: number // months

  // Dates
  createdDate: Date
  expectedCloseDate: Date
  actualCloseDate?: Date
  lastActivityDate: Date
  nextActivityDate?: Date

  // Assignment
  ownerId: string
  ownerName: string
  branchId: string
  regionId: string

  // Competition
  competitors: string[]
  competitivePressure: 'none' | 'low' | 'medium' | 'high'

  // Risk
  riskLevel: 'low' | 'medium' | 'high'
  riskFactors: string[]

  // Notes
  notes: string
  lostReason?: string
  winFactors?: string[]
}

export interface SaltiStageChange {
  fromStage: SaltiStage
  toStage: SaltiStage
  changedAt: Date
  changedBy: string
  daysInPreviousStage: number
}

export interface SaltiActivity {
  id: string
  opportunityId: string
  type: SaltiActivityType
  subject: string
  description: string

  performedBy: string
  performedAt: Date
  duration: number // minutes

  outcome: 'completed' | 'no_answer' | 'rescheduled' | 'cancelled'
  nextStep?: string
}

export interface SaltiMetrics {
  // Pipeline
  totalPipeline: number
  weightedPipeline: number
  avgDealSize: number
  avgSalesCycle: number // days

  // Stage metrics
  byStage: Record<SaltiStage, {
    count: number
    value: number
    avgAge: number
  }>

  // Conversion
  stageConversions: {
    fromStage: SaltiStage
    toStage: SaltiStage
    rate: number
    avgDays: number
  }[]

  // Win/Loss
  winRate: number
  lossReasons: Record<string, number>
  avgWinDealSize: number
  avgLossDealSize: number

  // Activity
  activitiesPerDeal: number
  avgResponseTime: number
}

export interface SaltiPipelineSnapshot {
  date: Date
  totalValue: number
  weightedValue: number
  dealCount: number
  byStage: Record<SaltiStage, number>
}

export interface SaltiRepPerformance {
  repId: string
  repName: string

  // Pipeline
  pipelineValue: number
  pipelineCount: number

  // Activity
  activitiesThisPeriod: number
  avgActivitiesPerDeal: number

  // Results
  closedWonValue: number
  closedWonCount: number
  closedLostValue: number
  closedLostCount: number
  winRate: number

  // Efficiency
  avgSalesCycle: number
  quotaAttainment: number
}

export interface SaltiForecast {
  period: string

  // Committed
  committedValue: number
  committedDeals: number

  // Best case
  bestCaseValue: number
  bestCaseDeals: number

  // Pipeline
  pipelineValue: number
  pipelineDeals: number

  // Historical comparison
  lastYearActual: number
  quota: number
  gapToQuota: number
}

export interface SaltiDashboard {
  asOfDate: Date
  metrics: SaltiMetrics
  pipelineHistory: SaltiPipelineSnapshot[]
  repPerformance: SaltiRepPerformance[]
  forecast: SaltiForecast
  opportunities: SaltiOpportunity[]
}
