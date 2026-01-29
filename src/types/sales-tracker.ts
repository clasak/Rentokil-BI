// Sales Tracker Types - matches CSV structure from Google Sheets

// NEW: Simplified Lead Types for BigQuery-based tracker (only 3 options)
export type LeadType = 'Inbound' | 'TAP' | 'Creative'

// Legacy lead types (kept for backward compatibility)
export type LegacyLeadType = 'Inbound' | 'Outbound' | 'Referral' | 'Self-Gen' | 'Canvass' | 'In Bound' | ''
export type ServiceType = 'Pest Control' | 'Termite' | 'Termite (Res)' | 'Wildlife' | 'Mosquito' | 'Bed Bug' | 'Commercial' | 'Rodent Control' | 'Gen Pest' | 'Exclusion' | 'Insulation' | ''
export type JobType = 'One-Time' | 'Contract' | 'Recurring' | ''

export const LEAD_TYPES: LeadType[] = ['Inbound', 'TAP', 'Creative']

export const LEAD_TYPE_LABELS: Record<LeadType, string> = {
  'Inbound': 'Inbound',
  'TAP': 'TAP (Trusted Advisor Program)',
  'Creative': 'Creative',
}

// Service categories for Totals Dashboard matrix
export type ServiceCategory = 'Termite' | 'Pest Control' | 'Rodent' | 'Exclusion' | 'Insulation'

// Individual proposal entry
export interface Proposal {
  id: string
  date: string
  companyName: string
  leadType: LeadType
  service: ServiceType
  jobType: JobType
  sold: boolean
  dead: boolean
  jobWorkPrice: number
  termitePrice: number
  contractPrice: number
}

// Individual sale entry
export interface Sale {
  id: string
  date: string
  companyName: string
  leadType: LeadType
  service: ServiceType
  jobType: JobType
  jobWorkPrice: number
  termitePrice: number
  contractPrice: number
  started: boolean
  paid: boolean
  pestPacId: string
}

// Monthly summary for proposals
export interface ProposalSummary {
  proposalGoal: number
  jobWorkTotal: number
  termiteTotal: number
  contractTotal: number
  grandTotal: number
  totalProposals: number
}

// Monthly summary for sales
export interface SalesSummary {
  monthISQ: number
  jobWorkTotal: number
  termiteTotal: number
  contractTotal: number
  grandTotal: number
  totalSales: number
  totalStartedSales: number
}

// Monthly data container
export interface MonthlyData {
  month: string
  year: number
  proposals: Proposal[]
  proposalSummary: ProposalSummary
  sales: Sale[]
  salesSummary: SalesSummary
}

// Yearly totals structure
export interface YearlyTotals {
  year: number
  isq: number
  goal: number
  actual: number
  monthlyBreakdown: {
    month: string
    proposalCount: number
    proposalTotal: number
    salesCount: number
    salesTotal: number
    termiteProposals: number
    termiteSales: number
  }[]
}

// Account Executive profile
export interface AccountExecutive {
  id: string
  name: string
  branch: string
  areaManager: string
  yearlyGoal: number
  monthlyData: MonthlyData[]
  yearlyTotals: YearlyTotals
}

// Role types for the application
export type UserRole =
  | 'account_executive'
  | 'area_sales_manager'
  | 'operations_manager'
  | 'technician'
  | 'branch_manager'
  | 'executive'

export interface AppUser {
  id: string
  name: string
  email: string
  role: UserRole
  branchId: string
  managerId?: string
}

// Form input types
export interface ProposalInput {
  date: string
  companyName: string
  leadType: LeadType
  service: ServiceType
  jobType: JobType
  jobWorkPrice: string
  termitePrice: string
  contractPrice: string
}

export interface SaleInput {
  date: string
  companyName: string
  leadType: LeadType
  service: ServiceType
  jobType: JobType
  jobWorkPrice: string
  termitePrice: string
  contractPrice: string
  pestPacId: string
}

// Dashboard stats for Account Executive
export interface AEDashboardStats {
  mtdProposals: number
  mtdSales: number
  mtdRevenue: number
  proposalToSaleRate: number
  avgDealSize: number
  pipelineValue: number
  goalProgress: number
  monthlyGoal: number
}

// Category breakdown for Totals Dashboard
export interface CategoryMetrics {
  category: ServiceCategory
  proposalTotal: number
  proposalCount: number
  salesTotal: number
  salesCount: number
}

// Monthly progression row for Totals Dashboard
export interface MonthlyProgression {
  month: string
  totalProposals: number
  totalSales: number
  totalStartedSales: number
  isq: number
  personalGoal: number
}

// Totals Dashboard summary
export interface TotalsDashboard {
  year: number
  yearlyGoal: number
  yearlyActual: number
  yearlyISQ: number
  categoryBreakdown: CategoryMetrics[]
  monthlyProgression: MonthlyProgression[]
}

// Month selector type
export type MonthName = 'Jan' | 'Feb' | 'Mar' | 'Apr' | 'May' | 'Jun' | 'Jul' | 'Aug' | 'Sept' | 'Oct' | 'Nov' | 'Dec'

// =============================================================================
// NEW: BigQuery-Based Sales Tracker Types (Phase 2)
// =============================================================================

/**
 * Individual transaction from BigQuery (with manual additions)
 */
export interface Transaction {
  id: string
  date: string // YYYY-MM-DD
  companyName: string
  leadType: LeadType // Simplified to 3 options
  productGroup?: string // Raw BigQuery product groups (comma-separated, e.g., "I, P, PC")
  service: ServiceType // Service type (mapped from productGroup)
  jobType: JobType // One-Time, Contract, Recurring
  type: 'proposal' | 'sale'
  // Proposal-specific fields
  sold?: boolean // For proposals only
  dead?: boolean // For proposals only
  // Price breakdown (separate fields for each category)
  jobWorkPrice: number
  termitePrice: number
  contractPrice: number
  // Sales-specific fields
  started?: boolean // For sales only - if shown in Xactly, it was started
  paid?: boolean // For sales only
  pestPacId?: string // For sales only
  source: 'bigquery' | 'manual' // Track data origin
}

/**
 * Monthly totals from BigQuery query
 */
export interface MonthlyTotalsDetail {
  month: number // 1-12
  year: number
  // Proposals
  proposalTermite: number
  proposalContract: number
  proposalJobWork: number
  proposalGrandTotal: number
  totalProposalsCount: number
  proposalsPerDay: number
  // Sales
  salesTermite: number
  salesContract: number
  salesJobWork: number
  salesGrandTotal: number
  totalSalesCount: number
  totalStartedSalesCount: number
  // Manual fields (to be overridden via localStorage)
  isq: number
  personalGoal: number
}

/**
 * Year-to-date summary (auto-calculated from monthly data)
 */
export interface YTDSummary {
  year: number
  currentMonth: number

  // Proposals YTD
  ytdProposalTermite: number
  ytdProposalContract: number
  ytdProposalJobWork: number
  ytdProposalGrandTotal: number
  ytdProposalsCount: number

  // Sales YTD
  ytdSalesTermite: number
  ytdSalesContract: number
  ytdSalesJobWork: number
  ytdSalesGrandTotal: number
  ytdSalesCount: number
  ytdStartedSalesCount: number

  // Goals YTD
  ytdISQ: number
  ytdPersonalGoal: number

  // Progress
  ytdGoalProgress: number // (ytdSalesGrandTotal / ytdPersonalGoal) * 100
  ytdISQProgress: number  // (ytdSalesGrandTotal / ytdISQ) * 100
}

/**
 * Transaction form data for add/edit modal
 */
export interface TransactionFormData {
  date: string
  companyName: string
  leadType: LeadType
  service: ServiceType
  jobType: JobType
  type: 'proposal' | 'sale'
  // Proposal-specific fields
  sold?: boolean
  dead?: boolean
  // Price breakdown
  jobWorkPrice: number
  termitePrice: number
  contractPrice: number
  // Sales-specific fields
  started?: boolean
  paid?: boolean
  pestPacId?: string
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get badge color for lead type
 */
export function getLeadTypeBadgeColor(leadType: LeadType): string {
  switch (leadType) {
    case 'Inbound':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
    case 'TAP':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
    case 'Creative':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
  }
}

/**
 * Get badge color for category
 */
export function getCategoryBadgeColor(category: 'Termite' | 'Contract' | 'Job Work'): string {
  switch (category) {
    case 'Termite':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    case 'Contract':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
    case 'Job Work':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
  }
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Format date for display
 */
export function formatDisplayDate(dateString: string): string {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}
