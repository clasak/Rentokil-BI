// Sales Tracker Types - matches CSV structure from Google Sheets

export type LeadType = 'Inbound' | 'Outbound' | 'Referral' | 'Self-Gen' | 'Canvass' | ''
export type ServiceType = 'Pest Control' | 'Termite' | 'Wildlife' | 'Mosquito' | 'Bed Bug' | 'Commercial' | ''
export type JobType = 'One-Time' | 'Contract' | 'Recurring' | ''

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
