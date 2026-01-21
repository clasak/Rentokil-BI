// RTX Power BI Sales Extended Types

export type SalesChannel = 'direct' | 'inside_sales' | 'field_sales' | 'partner' | 'digital'

export type SalesType = 'new_business' | 'expansion' | 'renewal' | 'reactivation'

export type ContractType = 'monthly' | 'quarterly' | 'annual' | 'multi_year'

export interface SalesTransaction {
  id: string
  date: Date

  // Account
  accountId: string
  accountName: string
  isNewCustomer: boolean

  // Sale details
  salesType: SalesType
  channel: SalesChannel

  // Revenue
  oneTimeRevenue: number
  recurringRevenue: number
  totalRevenue: number

  // Contract
  contractType: ContractType
  contractStartDate: Date
  contractEndDate: Date
  contractValue: number
  mrr: number

  // Service
  serviceTypes: string[]

  // Attribution
  repId: string
  repName: string
  branchId: string
  regionId: string

  // Lead source
  leadSource: string
  campaignId?: string
}

export interface SalesQuota {
  id: string
  period: string

  // Assignment
  repId: string
  repName: string
  branchId: string
  regionId: string

  // Quotas
  newBusinessQuota: number
  renewalQuota: number
  totalQuota: number

  // Actuals
  newBusinessActual: number
  renewalActual: number
  totalActual: number

  // Attainment
  attainmentPercent: number
  gapToQuota: number
  onTrackForQuota: boolean
}

export interface SalesMetrics {
  // Revenue
  totalRevenue: number
  newBusinessRevenue: number
  expansionRevenue: number
  renewalRevenue: number

  // Growth
  revenueGrowth: number
  yoyGrowth: number

  // Customer
  newCustomers: number
  avgDealSize: number
  avgContractLength: number

  // Efficiency
  salesCycleLength: number
  winRate: number
  quotaAttainment: number

  // Breakdown
  byChannel: Record<SalesChannel, number>
  byType: Record<SalesType, number>
  byServiceLine: Record<string, number>
}

export interface SalesTrend {
  date: Date
  revenue: number
  newBusiness: number
  renewal: number
  transactions: number
  avgDealSize: number
}

export interface SalesLeaderboard {
  repId: string
  repName: string
  branchName: string

  revenue: number
  transactions: number
  avgDealSize: number
  quotaAttainment: number
  rank: number

  priorPeriodRevenue: number
  growth: number
}

export interface SalesByProduct {
  productLine: string
  revenue: number
  transactions: number
  avgDealSize: number
  growth: number
  percentOfTotal: number
}

export interface SalesByRegion {
  regionId: string
  regionName: string
  revenue: number
  quota: number
  attainment: number
  growth: number
  transactions: number
  avgDealSize: number
  topRep: string
}

export interface SalesVelocity {
  stage: string
  avgDays: number
  conversionRate: number
  value: number
  deals: number
}

export interface SalesDashboard {
  period: string
  metrics: SalesMetrics
  trend: SalesTrend[]
  leaderboard: SalesLeaderboard[]
  byProduct: SalesByProduct[]
  byRegion: SalesByRegion[]
  velocity: SalesVelocity[]
  quotaProgress: SalesQuota[]
}
