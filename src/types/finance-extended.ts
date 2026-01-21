// RTX Power BI Finance Extended Types

export type PaymentStatus = 'pending' | 'paid' | 'partial' | 'overdue' | 'written_off' | 'disputed'

export type PaymentMethod = 'credit_card' | 'ach' | 'check' | 'cash' | 'wire' | 'autopay'

export type AgingBucket = 'current' | '1_30' | '31_60' | '61_90' | '90_plus'

export type RevenueType = 'recurring' | 'one_time' | 'service_call' | 'material' | 'termite'

export interface FinanceTransaction {
  id: string
  date: Date
  type: 'invoice' | 'payment' | 'credit' | 'refund' | 'adjustment'

  // Account
  accountId: string
  accountName: string

  // Amount
  amount: number
  originalAmount: number
  appliedAmount: number
  balanceRemaining: number

  // Invoice details
  invoiceNumber?: string
  invoiceDate?: Date
  dueDate?: Date
  status: PaymentStatus

  // Payment details
  paymentMethod?: PaymentMethod
  paymentDate?: Date
  paymentReference?: string

  // Revenue classification
  revenueType: RevenueType
  serviceType: string

  // Location
  branchId: string
  regionId: string
}

export interface ARAgingDetail {
  accountId: string
  accountName: string
  branchId: string
  regionId: string

  // Balances by bucket
  current: number
  days1_30: number
  days31_60: number
  days61_90: number
  days90Plus: number
  totalBalance: number

  // Account info
  lastPaymentDate?: Date
  lastPaymentAmount?: number
  avgPaymentDays: number
  paymentTerms: string

  // Collection
  collectionStatus: 'current' | 'at_risk' | 'in_collection' | 'legal'
  lastContactDate?: Date
  nextActionDate?: Date
  assignedCollector?: string
}

export interface RevenueMetrics {
  // Revenue
  totalRevenue: number
  recurringRevenue: number
  oneTimeRevenue: number
  serviceCallRevenue: number

  // MRR/ARR
  mrr: number
  arr: number
  mrrGrowth: number

  // Collections
  totalCollected: number
  collectionRate: number
  dso: number // Days Sales Outstanding

  // AR
  totalAR: number
  currentAR: number
  pastDueAR: number
  badDebtReserve: number

  // Breakdown
  byAgingBucket: Record<AgingBucket, number>
  byRevenueType: Record<RevenueType, number>
  byPaymentMethod: Record<PaymentMethod, number>
}

export interface CollectionMetrics {
  totalOutstanding: number
  currentBalance: number
  pastDueBalance: number

  // By bucket
  bucket1_30: number
  bucket31_60: number
  bucket61_90: number
  bucket90Plus: number

  // Performance
  collectedThisPeriod: number
  writeOffsThisPeriod: number
  dso: number
  collectionEfficiency: number

  // Trend
  arTrendDirection: 'improving' | 'stable' | 'worsening'
  pastDueTrend: 'improving' | 'stable' | 'worsening'
}

export interface RevenueTrend {
  date: Date
  totalRevenue: number
  recurringRevenue: number
  oneTimeRevenue: number
  mrr: number
  collections: number
}

export interface DSOTrend {
  date: Date
  dso: number
  targetDso: number
  industryBenchmark: number
}

export interface CollectionAction {
  id: string
  accountId: string
  accountName: string
  balance: number
  daysOverdue: number

  actionType: 'call' | 'email' | 'letter' | 'collection_agency' | 'legal'
  scheduledDate: Date
  assignedTo: string

  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'pending' | 'in_progress' | 'completed' | 'escalated'

  notes: string
  lastContactResult?: string
}

export interface WriteOff {
  id: string
  date: Date
  accountId: string
  accountName: string
  amount: number
  reason: string
  approvedBy: string
  recoverable: boolean
}

export interface FinanceByBranch {
  branchId: string
  branchName: string
  regionId: string

  revenue: number
  revenueGrowth: number

  collections: number
  collectionRate: number

  arBalance: number
  pastDueBalance: number
  dso: number

  writeOffs: number
}

export interface FinanceDashboard {
  period: string
  metrics: RevenueMetrics
  collectionMetrics: CollectionMetrics
  revenueTrend: RevenueTrend[]
  dsoTrend: DSOTrend[]
  agingDetail: ARAgingDetail[]
  pendingActions: CollectionAction[]
  byBranch: FinanceByBranch[]
}
