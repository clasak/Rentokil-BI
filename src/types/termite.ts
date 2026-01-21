/**
 * Termite Types
 *
 * Type definitions for termite-specific business operations.
 * Covers PNI (Pre-New Install), renewals, inspections, and treatments.
 */

// =============================================================================
// PNI (PRE-NEW INSTALL) TYPES
// =============================================================================

export interface PNIInspection {
  id: string
  accountId: string
  accountName: string
  propertyAddress: string
  propertyType: PropertyType

  // Inspection details
  inspectorId: string
  inspectorName: string
  inspectionDate: Date
  inspectionType: InspectionType
  status: PNIStatus

  // Property info
  squareFootage: number
  yearBuilt?: number
  foundationType: FoundationType
  constructionType: ConstructionType

  // Findings
  termiteActivityFound: boolean
  activityType?: TermiteActivityType
  damageLevel?: DamageLevel
  infestationAreas?: string[]
  moistureIssues: boolean
  woodToGroundContact: boolean

  // Recommendations
  treatmentRecommended: TreatmentType[]
  estimatedCost: number
  urgency: 'immediate' | 'soon' | 'preventive'

  // Follow-up
  proposalSent: boolean
  proposalDate?: Date
  proposalAmount?: number
  saleConverted: boolean
  saleAmount?: number
}

export type PropertyType =
  | 'single_family'
  | 'multi_family'
  | 'condo'
  | 'townhouse'
  | 'commercial'
  | 'industrial'

export type InspectionType =
  | 'real_estate'
  | 'new_construction'
  | 'existing_home'
  | 'annual_renewal'
  | 'callback'

export type PNIStatus =
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'needs_follow_up'
  | 'proposal_sent'
  | 'converted'
  | 'lost'

export type FoundationType =
  | 'slab'
  | 'crawlspace'
  | 'basement'
  | 'pier_beam'
  | 'mixed'

export type ConstructionType =
  | 'wood_frame'
  | 'brick'
  | 'stucco'
  | 'concrete'
  | 'steel'
  | 'mixed'

export type TermiteActivityType =
  | 'subterranean'
  | 'drywood'
  | 'dampwood'
  | 'formosan'
  | 'unknown'

export type DamageLevel =
  | 'none'
  | 'minor'
  | 'moderate'
  | 'severe'
  | 'extensive'

export type TreatmentType =
  | 'liquid_barrier'
  | 'bait_system'
  | 'fumigation'
  | 'spot_treatment'
  | 'wood_treatment'
  | 'preventive'

// =============================================================================
// PNI METRICS TYPES
// =============================================================================

export interface PNISummary {
  period: string
  periodStart: Date
  periodEnd: Date

  // Volume
  totalInspections: number
  completedInspections: number
  pendingInspections: number

  // Findings
  withActivityFound: number
  activityRate: number
  avgDamageLevel: number

  // Conversion
  proposalsSent: number
  proposalRate: number
  salesConverted: number
  conversionRate: number
  totalRevenue: number
  avgSaleAmount: number

  // By type
  byInspectionType: Record<InspectionType, {
    count: number
    activityRate: number
    conversionRate: number
    revenue: number
  }>

  // By inspector
  topInspectors: Array<{
    inspectorId: string
    inspectorName: string
    inspections: number
    conversionRate: number
    revenue: number
  }>
}

export interface PNITrend {
  period: string
  inspections: number
  activityRate: number
  conversionRate: number
  revenue: number
  avgTicket: number
}

// =============================================================================
// RENEWAL TYPES
// =============================================================================

export interface TermiteRenewal {
  id: string
  contractId: string
  accountId: string
  accountName: string
  propertyAddress: string

  // Contract details
  originalStartDate: Date
  currentTermStart: Date
  currentTermEnd: Date
  renewalDate: Date
  daysUntilRenewal: number

  // Value
  currentAnnualValue: number
  proposedRenewalValue: number
  priceChange: number
  priceChangePercent: number

  // Status
  status: RenewalStatus
  renewalType: RenewalType
  autoRenew: boolean

  // Treatment
  treatmentType: TreatmentType
  lastServiceDate?: Date
  servicesThisTerm: number
  claimsThisTerm: number

  // Risk
  churnRisk: 'low' | 'medium' | 'high'
  riskFactors?: string[]
  competitorThreat?: boolean
}

export type RenewalStatus =
  | 'upcoming'
  | 'due'
  | 'in_negotiation'
  | 'renewed'
  | 'canceled'
  | 'lapsed'

export type RenewalType =
  | 'annual'
  | 'multi_year'
  | 'month_to_month'

export interface RenewalSummary {
  period: string
  periodStart: Date
  periodEnd: Date

  // Volume
  totalDue: number
  totalValue: number

  // Results
  renewed: number
  renewedValue: number
  renewalRate: number

  canceled: number
  canceledValue: number
  cancelRate: number

  pending: number
  pendingValue: number

  // Price changes
  avgPriceIncrease: number
  avgPriceIncreasePercent: number
  priceIncreaseAcceptance: number

  // Risk
  highRiskCount: number
  highRiskValue: number
}

export interface RenewalTrend {
  period: string
  dueCount: number
  dueValue: number
  renewedCount: number
  renewedValue: number
  renewalRate: number
  avgPriceChange: number
}

// =============================================================================
// TERMITE SERVICE TYPES
// =============================================================================

export interface TermiteService {
  id: string
  accountId: string
  accountName: string
  propertyAddress: string
  contractId: string

  // Service details
  serviceDate: Date
  serviceType: TermiteServiceType
  technicianId: string
  technicianName: string

  // Treatment
  treatmentApplied: TreatmentType[]
  areasServiced: string[]
  productUsed?: string
  quantity?: number

  // Findings
  activityFound: boolean
  activityType?: TermiteActivityType
  damageObserved: boolean
  damageNotes?: string

  // Time
  arrivalTime: Date
  completionTime: Date
  durationMinutes: number

  // Follow-up
  followUpRequired: boolean
  followUpReason?: string
  followUpScheduled?: Date
}

export type TermiteServiceType =
  | 'initial_treatment'
  | 'follow_up'
  | 'annual_inspection'
  | 'quarterly_service'
  | 'retreat'
  | 'claim_service'
  | 'bait_check'

// =============================================================================
// CLAIM TYPES
// =============================================================================

export interface TermiteClaim {
  id: string
  contractId: string
  accountId: string
  accountName: string
  propertyAddress: string

  // Claim details
  claimDate: Date
  reportedBy: string
  damageDescription: string
  damageLocation: string[]

  // Assessment
  inspectionDate?: Date
  inspectorId?: string
  damageLevel: DamageLevel
  estimatedRepairCost: number
  isCovered: boolean
  coverageNotes?: string

  // Resolution
  status: ClaimStatus
  resolution?: ClaimResolution
  paidAmount?: number
  resolvedDate?: Date
  daysToResolve?: number
}

export type ClaimStatus =
  | 'reported'
  | 'under_review'
  | 'inspection_scheduled'
  | 'inspected'
  | 'approved'
  | 'denied'
  | 'paid'
  | 'closed'

export type ClaimResolution =
  | 'full_payment'
  | 'partial_payment'
  | 'denied_not_covered'
  | 'denied_pre_existing'
  | 'denied_maintenance'
  | 'withdrawn'

// =============================================================================
// TERMITE DASHBOARD TYPES
// =============================================================================

export interface TermiteDashboardState {
  selectedPeriod: 'mtd' | 'qtd' | 'ytd' | 'trailing_12'
  selectedMarket?: string
  selectedRegion?: string
  viewMode: 'pni' | 'renewals' | 'claims' | 'overview'
}

export interface TermiteKPI {
  name: string
  slug: string
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
