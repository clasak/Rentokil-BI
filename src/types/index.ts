// Core domain types for Rentokil BI

export type Role = 'exec' | 'director' | 'manager' | 'ops_manager' | 'rep' | 'technician'

export type DemoMode = 'exec_bi_review' | 'sales_ops_execution' | 'branch_field_manager'

export type Scenario = 'base' | 'upside' | 'downside'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  title: string
  assignedMarkets: string[]
  assignedBranches: string[]
  assignedTeams: string[]
}

export interface Market {
  id: string
  name: string
  region: string
}

export interface Branch {
  id: string
  name: string
  marketId: string
  address: string
}

export interface Team {
  id: string
  name: string
  branchId: string
  managerId: string
}

export interface Route {
  id: string
  name: string
  branchId: string
  technicianId: string
}

export interface Account {
  id: string
  name: string
  vertical: 'Commercial' | 'Residential' | 'Government' | 'Healthcare' | 'Food Service'
  contractValue: number
  retentionRisk: 'low' | 'medium' | 'high'
  lastServiceDate: Date
  openIssues: number
  marketId: string
  branchId: string
  ownerId: string
  createdAt: Date
  arBalance: number
  serviceFrequency: 'monthly' | 'quarterly' | 'annual'
  complaints: number
}

export interface Opportunity {
  id: string
  accountId: string
  accountName: string
  name: string
  stage: 'prospect' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost'
  amount: number
  probability: number
  createdDate: Date
  closeDate: Date
  nextStepDate: Date | null
  stageLastChanged: Date
  ownerId: string
  ownerName: string
  marketId: string
  branchId: string
  daysInStage: number
  isStalled: boolean
  nextStep: string
  lostReason?: string
}

export interface Activity {
  id: string
  type: 'call' | 'email' | 'visit' | 'meeting'
  opportunityId?: string
  accountId: string
  userId: string
  timestamp: Date
  notes: string
  outcome?: string
}

export interface ServiceEvent {
  id: string
  accountId: string
  technicianId: string
  routeId: string
  scheduledDate: Date
  completedDate?: Date
  status: 'scheduled' | 'completed' | 'missed' | 'callback'
  timeOnSite: number // minutes
  serviceType: string
  notes?: string
}

export interface Complaint {
  id: string
  accountId: string
  type: 'service_quality' | 'billing' | 'scheduling' | 'technician' | 'other'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  createdAt: Date
  resolvedAt?: Date
  status: 'open' | 'in_progress' | 'resolved' | 'escalated'
}

export interface Invoice {
  id: string
  accountId: string
  accountName: string
  amount: number
  invoiceDate: Date
  dueDate: Date
  status: 'paid' | 'open' | 'overdue' | 'disputed' | 'void'
  paidDate?: Date
  agingBucket: '0-30' | '31-60' | '61-90' | '90+'
}

export interface TechnicianCapacity {
  id: string
  technicianId: string
  technicianName: string
  branchId: string
  routeId: string
  availableHours: number
  usedHours: number
  utilization: number
  date: Date
}

// KPI Types
export type KPICategory = 'revenue' | 'sales' | 'operations' | 'finance' | 'workforce' | 'quality'

export interface KPIDefinition {
  slug: string
  name: string
  category: KPICategory
  definition: string
  calculationNotes: string
  grain: string
  filters: string[]
  primarySource: string
  secondarySources: string[]
  refreshCadence: string
  owner: string
  reconciliationTarget: string
  dataQualityChecks: string[]
  drillPath: string
  format: 'currency' | 'percent' | 'number' | 'days' | 'index'
  higherIsBetter: boolean
  target?: number
  warningThreshold?: number
  criticalThreshold?: number
}

export interface KPIValue {
  slug: string
  value: number
  previousValue: number
  delta: number
  deltaPercent: number
  target?: number
  status: 'good' | 'warning' | 'critical' | 'neutral'
  trend: number[] // last 12 data points for sparkline
  asOfDate: Date
}

export interface DataSource {
  name: string
  system: string
  lastRefresh: Date
  status: 'fresh' | 'stale' | 'error'
  recordCount: number
  knownIssues: string[]
}

export interface DataQualityMetric {
  source: string
  metric: string
  value: number
  threshold: number
  status: 'good' | 'warning' | 'critical'
  details: string
}

export interface ReconciliationItem {
  kpiSlug: string
  kpiTotal: number
  sourceTotal: number
  difference: number
  tolerancePercent: number
  isWithinTolerance: boolean
  explanations: string[]
}

export interface ActionItem {
  id: string
  type: 'stalled_opp' | 'at_risk_account' | 'capacity_pressure' | 'collection_priority'
  entityId: string
  entityType: 'opportunity' | 'account' | 'branch' | 'invoice'
  title: string
  owner: string
  ownerId: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  financialImpact: number
  nextBestAction: string
  dueDate?: Date
  details: Record<string, any>
}

export interface VarianceDriver {
  factor: string
  impact: number
  direction: 'positive' | 'negative'
  explanation: string
}

export interface ForecastPoint {
  date: Date
  base: number
  upside: number
  downside: number
  actual?: number
  confidenceLower: number
  confidenceUpper: number
}

export interface ForecastAssumption {
  name: string
  baseValue: number
  upsideValue: number
  downsideValue: number
  unit: string
}

export interface BacktestResult {
  weekEnding: Date
  predicted: number
  actual: number
  error: number
  errorPercent: number
}

// Permissions
export interface Permission {
  resource: string
  actions: ('view' | 'edit' | 'export' | 'approve')[]
}

export interface RolePermissions {
  role: Role
  permissions: Permission[]
  scopeDescription: string
}

// Settings
export interface AppSettings {
  demoMode: DemoMode
  role: Role
  userId: string
  selectedMarkets: string[]
  scenario: Scenario
  dataQualityIssuesEnabled: boolean
  refreshSeed: number
}

// Filters
export interface GlobalFilters {
  dateRange: {
    start: Date
    end: Date
  }
  marketIds: string[]
  branchIds: string[]
  ownerIds: string[]
}

// WBR/QBR
export interface ReviewSection {
  id: string
  title: string
  type: 'kpi_summary' | 'trend' | 'exceptions' | 'drill_down' | 'action_items'
  kpis?: string[]
  content?: any
}

export interface BusinessReview {
  type: 'wbr' | 'qbr'
  periodStart: Date
  periodEnd: Date
  sections: ReviewSection[]
}
