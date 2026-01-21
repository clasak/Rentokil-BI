/**
 * Finance Extended Types
 *
 * Extended type definitions for finance operations.
 * Covers AR aging, projections, P&L, and financial analytics.
 */

// =============================================================================
// AR AGING TYPES
// =============================================================================

export interface ARAgingBucket {
  bucket: ARBucketName
  bucketLabel: string
  invoiceCount: number
  totalAmount: number
  percentOfTotal: number
  avgDaysOutstanding: number
  topAccounts: Array<{
    accountId: string
    accountName: string
    amount: number
    daysOutstanding: number
  }>
}

export type ARBucketName = 'current' | '1-30' | '31-60' | '61-90' | '90+'

export interface ARAgingSummary {
  asOfDate: Date
  totalOutstanding: number
  totalInvoices: number
  avgDaysOutstanding: number

  buckets: ARAgingBucket[]

  // Trends
  totalVsLastMonth: number
  totalVsLastMonthPercent: number

  // Risk
  highRiskAmount: number // 61+ days
  highRiskPercent: number

  // Collections
  collectedMTD: number
  collectedVsTarget: number
}

export interface ARDetailItem {
  invoiceId: string
  invoiceNumber: string
  accountId: string
  accountName: string
  accountType: 'residential' | 'commercial'
  market: string
  region: string

  // Amounts
  originalAmount: number
  paidAmount: number
  balanceDue: number

  // Dates
  invoiceDate: Date
  dueDate: Date
  lastPaymentDate?: Date
  daysOutstanding: number

  // Status
  status: 'current' | 'overdue' | 'collections' | 'write_off'
  agingBucket: ARBucketName
  collectionStatus?: string
  lastContactDate?: Date
  nextActionDate?: Date

  // Notes
  notes?: string
  paymentPromise?: Date
}

export interface ARTrend {
  date: string
  totalOutstanding: number
  current: number
  overdue: number
  avgDSO: number
}

// =============================================================================
// REVENUE PROJECTION TYPES
// =============================================================================

export interface RevenueProjection {
  period: string
  periodStart: Date
  periodEnd: Date

  // Pipeline-based
  pipelineValue: number
  weightedPipeline: number
  expectedClose: number

  // Recurring
  recurringRevenue: number
  renewalRevenue: number
  expansionRevenue: number

  // Total
  totalProjected: number
  confidenceLevel: 'high' | 'medium' | 'low'

  // Comparison
  vsTarget: number
  vsTargetPercent: number
  vsPriorYear: number
  vsPriorYearPercent: number
}

export interface RevenueProjectionScenario {
  name: string
  description: string
  assumptions: string[]
  projections: RevenueProjection[]
  totalProjected: number
  probability: number
}

export interface RevenueProjectionDashboard {
  currentMonth: RevenueProjection
  currentQuarter: RevenueProjection
  fullYear: RevenueProjection
  scenarios: RevenueProjectionScenario[]
  trends: Array<{
    period: string
    actual?: number
    projected: number
    target: number
  }>
}

// =============================================================================
// P&L TYPES
// =============================================================================

export interface PnLLineItem {
  category: PnLCategory
  subcategory?: string
  label: string
  amount: number
  budgetAmount?: number
  priorYearAmount?: number
  percentOfRevenue?: number
  variance?: number
  variancePercent?: number
}

export type PnLCategory =
  | 'revenue'
  | 'cost_of_goods_sold'
  | 'gross_profit'
  | 'operating_expenses'
  | 'operating_income'
  | 'other_income'
  | 'other_expense'
  | 'net_income'

export interface PnLStatement {
  period: string
  periodStart: Date
  periodEnd: Date
  entityType: 'company' | 'market' | 'region' | 'branch'
  entityId?: string
  entityName?: string

  // Summary metrics
  revenue: number
  costOfGoodsSold: number
  grossProfit: number
  grossMargin: number
  operatingExpenses: number
  operatingIncome: number
  operatingMargin: number
  netIncome: number
  netMargin: number

  // Line items
  lineItems: PnLLineItem[]

  // Comparisons
  vsBudget: {
    revenue: number
    grossProfit: number
    operatingIncome: number
    netIncome: number
  }
  vsPriorYear: {
    revenue: number
    grossProfit: number
    operatingIncome: number
    netIncome: number
  }
}

export interface PnLTrend {
  period: string
  revenue: number
  grossProfit: number
  grossMargin: number
  operatingIncome: number
  operatingMargin: number
  netIncome: number
  netMargin: number
}

// =============================================================================
// DSO TYPES
// =============================================================================

export interface DSOMetric {
  period: string
  periodEnd: Date
  dso: number
  target: number
  variance: number
  trend: 'improving' | 'worsening' | 'stable'

  // Components
  avgInvoiceAmount: number
  avgPaymentDays: number
  collectionEfficiency: number

  // By segment
  byAccountType: Record<string, number>
  byMarket: Record<string, number>
}

export interface DSOTrend {
  date: string
  dso: number
  target: number
  revenue: number
  arBalance: number
}

// =============================================================================
// FINANCIAL KPI TYPES
// =============================================================================

export interface FinancialKPI {
  name: string
  slug: string
  value: number
  formattedValue: string
  unit: 'currency' | 'percent' | 'days' | 'ratio'
  target?: number
  variance?: number
  variancePercent?: number
  trend: {
    direction: 'up' | 'down' | 'flat'
    value: number
    isPositive: boolean
  }
  status: 'good' | 'warning' | 'critical'
  sparklineData?: number[]
}

export interface FinanceDashboardState {
  selectedPeriod: 'mtd' | 'qtd' | 'ytd' | 'custom'
  selectedEntity: 'company' | 'market' | 'region' | 'branch'
  entityId?: string
  comparisonMode: 'budget' | 'prior_year' | 'both' | 'none'
  showDetails: boolean
}

// =============================================================================
// COLLECTIONS TYPES
// =============================================================================

export interface CollectionTask {
  id: string
  accountId: string
  accountName: string
  invoiceId: string
  invoiceNumber: string
  amountDue: number
  daysOverdue: number

  // Task details
  taskType: 'call' | 'email' | 'letter' | 'escalate'
  priority: 'high' | 'medium' | 'low'
  dueDate: Date
  assignedTo?: string
  status: 'pending' | 'in_progress' | 'completed' | 'skipped'

  // History
  lastContactDate?: Date
  lastContactResult?: string
  promisedPaymentDate?: Date
  promisedAmount?: number
  attemptCount: number
}

export interface CollectionsSummary {
  period: string
  totalTasks: number
  completedTasks: number
  completionRate: number

  // By type
  byTaskType: Record<string, { count: number; completed: number }>;

  // Results
  totalCollected: number
  avgCollectionTime: number
  promiseToPayRate: number
  promiseKeptRate: number
}
