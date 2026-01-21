/**
 * HR Types
 *
 * Type definitions for HR analytics and workforce management.
 * Covers retention, headcount, performance, and engagement.
 */

// =============================================================================
// EMPLOYEE TYPES
// =============================================================================

export interface Employee {
  id: string
  employeeNumber: string
  firstName: string
  lastName: string
  fullName: string
  email: string

  // Position
  title: string
  department: Department
  role: EmployeeRole
  level: number
  reportsTo?: string

  // Location
  market: string
  region: string
  branch?: string

  // Dates
  hireDate: Date
  startDate: Date
  terminationDate?: Date
  tenureMonths: number

  // Status
  status: EmployeeStatus
  employmentType: 'full_time' | 'part_time' | 'contractor'

  // Performance
  lastReviewDate?: Date
  performanceRating?: number
  isHighPerformer?: boolean

  // Compensation
  salary?: number
  payGrade?: string
}

export type Department =
  | 'sales'
  | 'operations'
  | 'service'
  | 'customer_service'
  | 'finance'
  | 'hr'
  | 'marketing'
  | 'it'
  | 'executive'

export type EmployeeRole =
  | 'technician'
  | 'sales_rep'
  | 'sales_manager'
  | 'branch_manager'
  | 'regional_manager'
  | 'market_director'
  | 'customer_service_rep'
  | 'dispatcher'
  | 'accountant'
  | 'hr_specialist'
  | 'other'

export type EmployeeStatus =
  | 'active'
  | 'on_leave'
  | 'terminated'
  | 'resigned'
  | 'retired'

// =============================================================================
// RETENTION TYPES
// =============================================================================

export interface RetentionMetrics {
  period: string
  periodStart: Date
  periodEnd: Date

  // Headcount
  startingHeadcount: number
  endingHeadcount: number
  netChange: number

  // Movement
  hires: number
  terminations: number
  voluntaryTerminations: number
  involuntaryTerminations: number
  transfers: number

  // Rates
  turnoverRate: number
  voluntaryTurnoverRate: number
  retentionRate: number
  attritionRate: number

  // Tenure
  avgTenure: number
  medianTenure: number

  // Benchmarks
  industryBenchmark?: number
  companyTarget?: number
}

export interface RetentionBySegment {
  segment: string
  segmentType: 'department' | 'role' | 'market' | 'tenure_band' | 'performance'
  headcount: number
  terminations: number
  turnoverRate: number
  retentionRate: number
  avgTenure: number
  vsCompanyAvg: number
  riskLevel: 'low' | 'medium' | 'high'
}

export interface TerminationReason {
  reason: string
  category: 'voluntary' | 'involuntary'
  count: number
  percentOfTotal: number
  trend: 'increasing' | 'decreasing' | 'stable'
}

export interface RetentionTrend {
  period: string
  headcount: number
  turnoverRate: number
  retentionRate: number
  hires: number
  terminations: number
}

// =============================================================================
// HEADCOUNT TYPES
// =============================================================================

export interface HeadcountSummary {
  asOfDate: Date
  totalHeadcount: number
  activeEmployees: number
  onLeave: number

  // By department
  byDepartment: Record<Department, number>

  // By role
  byRole: Record<EmployeeRole, number>

  // By location
  byMarket: Record<string, number>

  // By type
  fullTime: number
  partTime: number
  contractor: number

  // Trends
  vsLastMonth: number
  vsLastMonthPercent: number
  vsLastYear: number
  vsLastYearPercent: number
}

export interface HeadcountPlan {
  period: string
  department: Department
  role: EmployeeRole
  market?: string

  // Plan
  budgetedHeadcount: number
  actualHeadcount: number
  variance: number
  openPositions: number

  // Hiring
  plannedHires: number
  actualHires: number
  timeToFill: number
}

// =============================================================================
// PERFORMANCE TYPES
// =============================================================================

export interface PerformanceDistribution {
  period: string
  totalReviewed: number
  distribution: Array<{
    rating: number
    ratingLabel: string
    count: number
    percentOfTotal: number
  }>
  avgRating: number
  highPerformers: number
  lowPerformers: number
  needsImprovement: number
}

export interface PerformanceBySegment {
  segment: string
  segmentType: 'department' | 'role' | 'market' | 'tenure_band'
  employeesReviewed: number
  avgRating: number
  highPerformers: number
  highPerformerPercent: number
  vsCompanyAvg: number
}

// =============================================================================
// ENGAGEMENT TYPES
// =============================================================================

export interface EngagementScore {
  period: string
  surveyDate: Date
  responseRate: number
  totalResponses: number

  // Overall
  overallScore: number
  vsLastPeriod: number
  vsBenchmark: number

  // By dimension
  dimensions: Array<{
    name: string
    score: number
    vsLastPeriod: number
    topStrength: string
    topOpportunity: string
  }>

  // By segment
  byDepartment: Record<Department, number>
  byTenure: Record<string, number>
}

export interface EngagementDriver {
  driver: string
  score: number
  importance: number // correlation with engagement
  gap: number // vs expected
  priority: 'high' | 'medium' | 'low'
  actionItems?: string[]
}

// =============================================================================
// WORKFORCE PLANNING TYPES
// =============================================================================

export interface WorkforceProjection {
  period: string
  periodStart: Date
  periodEnd: Date

  // Starting point
  currentHeadcount: number

  // Changes
  plannedHires: number
  expectedAttrition: number
  plannedTerminations: number
  expectedTransfers: number

  // Projected
  projectedHeadcount: number
  confidence: 'high' | 'medium' | 'low'

  // Requirements
  businessDemand: number
  gap: number
  gapPercent: number
}

export interface SuccessionPlan {
  positionId: string
  positionTitle: string
  currentIncumbent?: string
  incumbentRisk: 'low' | 'medium' | 'high'
  criticality: 'critical' | 'important' | 'standard'

  successors: Array<{
    employeeId: string
    employeeName: string
    readiness: 'ready_now' | 'ready_1_year' | 'ready_2_years' | 'development_needed'
    developmentPlan?: string
  }>
}

// =============================================================================
// HR DASHBOARD TYPES
// =============================================================================

export interface HRDashboardCard {
  metric: string
  metricLabel: string
  value: number
  formattedValue: string
  target?: number
  variance?: number
  trend: {
    direction: 'up' | 'down' | 'flat'
    value: number
    isPositive: boolean
  }
  status: 'good' | 'warning' | 'critical'
}

export interface HRDashboardState {
  selectedPeriod: 'mtd' | 'qtd' | 'ytd' | 'trailing_12'
  selectedDepartment?: Department
  selectedMarket?: string
  viewMode: 'summary' | 'detail' | 'trends'
}
