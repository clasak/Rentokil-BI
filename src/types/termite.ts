// RTX Power BI Termite Service Types

export type TermiteServiceType =
  | 'inspection'
  | 'treatment_liquid'
  | 'treatment_bait'
  | 'treatment_fumigation'
  | 'renewal'
  | 'retreatment'
  | 'damage_repair'
  | 'warranty_claim'

export type TermiteStatus =
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'rescheduled'
  | 'warranty_pending'

export type InspectionResult =
  | 'no_activity'
  | 'activity_found'
  | 'evidence_found'
  | 'damage_found'
  | 'treatment_recommended'

export type TreatmentMethod =
  | 'liquid_barrier'
  | 'bait_system'
  | 'fumigation'
  | 'spot_treatment'
  | 'combination'

export interface TermiteService {
  id: string
  accountId: string
  accountName: string
  propertyAddress: string

  // Service details
  serviceType: TermiteServiceType
  status: TermiteStatus

  // Dates
  scheduledDate: Date
  completedDate?: Date
  followUpDate?: Date

  // Inspection
  inspectionResult?: InspectionResult
  activityLocation?: string
  damageEstimate?: number

  // Treatment
  treatmentMethod?: TreatmentMethod
  productUsed?: string
  linearFeet?: number
  baitsInstalled?: number

  // Assignment
  technicianId: string
  technicianName: string
  branchId: string
  regionId: string

  // Revenue
  serviceRevenue: number
  materialCost: number
  laborCost: number
  margin: number

  // Warranty
  warrantyId?: string
  warrantyExpiration?: Date
  isWarrantyWork: boolean

  notes: string
}

export interface TermiteContract {
  id: string
  accountId: string
  accountName: string
  propertyAddress: string

  // Contract details
  contractType: 'new' | 'renewal' | 'transfer'
  startDate: Date
  expirationDate: Date
  renewalDate?: Date

  // Coverage
  coverageType: 'retreatment_only' | 'damage_repair' | 'full_coverage'
  linearFeetCovered: number

  // Revenue
  contractValue: number
  annualRenewalAmount: number
  paymentFrequency: 'monthly' | 'quarterly' | 'annual'

  // History
  yearsWithCompany: number
  claimsCount: number
  claimsAmount: number

  // Assignment
  branchId: string
  regionId: string
}

export interface TermiteMetrics {
  // Services
  totalServices: number
  inspections: number
  treatments: number
  renewals: number
  retreatments: number

  // Revenue
  totalRevenue: number
  newContractRevenue: number
  renewalRevenue: number
  serviceRevenue: number
  avgJobValue: number

  // Contracts
  activeContracts: number
  newContracts: number
  renewedContracts: number
  cancelledContracts: number
  renewalRate: number

  // Warranty
  warrantyClaimsCount: number
  warrantyClaimsAmount: number
  claimsRate: number

  // Efficiency
  avgLinearFeetPerJob: number
  avgJobDuration: number // hours
  conversionRate: number // inspection to treatment
}

export interface TermiteTrend {
  date: Date
  inspections: number
  treatments: number
  revenue: number
  newContracts: number
  renewals: number
  cancellations: number
}

export interface TermiteByRegion {
  regionId: string
  regionName: string
  activeContracts: number
  revenue: number
  newContracts: number
  renewalRate: number
  claimsRate: number
  avgContractValue: number
}

export interface TermiteByTechnician {
  technicianId: string
  technicianName: string
  branchId: string

  servicesCompleted: number
  revenue: number
  avgJobValue: number
  conversionRate: number
  productivityScore: number

  inspections: number
  treatments: number
  retreatments: number
}

export interface TermiteSeasonality {
  month: string
  inspections: number
  treatments: number
  newContracts: number
  revenue: number
  historicalAvg: number
}

export interface TermiteDashboard {
  period: string
  metrics: TermiteMetrics
  trend: TermiteTrend[]
  byRegion: TermiteByRegion[]
  byTechnician: TermiteByTechnician[]
  seasonality: TermiteSeasonality[]
  upcomingRenewals: TermiteContract[]
  recentServices: TermiteService[]
}
