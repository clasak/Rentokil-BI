// Daily Sales Cadence Types - matches Midwest Daily Sales Cadence CSV structure
// Branch Managers fill out daily metrics for their branches

export type RegionCode = 'R16' | 'R23' | 'R24' | 'R52' | 'R54' | 'R75'

export interface Branch {
  region: RegionCode
  code: string
  name: string
  branchManager: string
  phone: string
}

// Daily metrics filled by Branch Manager
export interface DailySalesMetrics {
  pccInField: number              // "# Of PCC's in the Field"
  tapLeads?: number               // "TAP Leads" - OPTIONAL (added in later months)
  inspPrp: number                 // "INSP PRP" - Inspections Prepared
  lobsPrp: number                 // "LOBs PRP" - LOBs Prepared
  lobsSold: number                // "LOBs Sold"
  dollarsSold: number             // "Dollars SLD"
  nextDayConf: number             // "Next Day CONF"
  pcNoTcConversions: boolean      // "PC NO TC Conversions" - Yes/No
}

// Complete daily entry for a branch
export interface DailySalesEntry {
  id: string
  branchCode: string
  date: string                    // YYYY-MM-DD
  metrics: DailySalesMetrics
  createdAt: string
  updatedAt: string
  submittedBy: string             // Branch Manager name
}

// Goals per metric
export interface DailySalesGoals {
  inspPrpPerPcc: number           // Goal 5.5 per PCC
  lobsPrpPerPcc: number           // Goal 11 per PCC
  lobsSoldPerPcc: number          // Goal 2 per PCC
  nextDayConfPerPcc: number       // Goal 5.5 per PCC
}

// Default goals from the CSV
export const DEFAULT_DAILY_GOALS: DailySalesGoals = {
  inspPrpPerPcc: 5.5,
  lobsPrpPerPcc: 11,
  lobsSoldPerPcc: 2,
  nextDayConfPerPcc: 5.5,
}

// Weekly rollup by branch
export interface WeeklyRollup {
  branchCode: string
  weekStartDate: string           // Monday of the week
  weekEndDate: string             // Sunday of the week
  dailyEntries: DailySalesEntry[]
  totals: DailySalesMetrics
  goalAttainment: {
    inspPrp: number               // Percentage of goal
    lobsPrp: number
    lobsSold: number
    nextDayConf: number
  }
}

// Region summary for Area Manager view
export interface RegionSummary {
  region: RegionCode
  branchCount: number
  totalPccInField: number
  totalInspPrp: number
  totalLobsPrp: number
  totalLobsSold: number
  totalDollarsSold: number
  avgGoalAttainment: number
  branchesOnTrack: number
  branchesOffTrack: number
}

// Form input for Branch Manager
export interface DailySalesInput {
  date: string
  pccInField: string
  tapLeads: string
  inspPrp: string
  lobsPrp: string
  lobsSold: string
  dollarsSold: string
  nextDayConf: string
  pcNoTcConversions: boolean
}

// Dashboard stats for Branch Manager
export interface BranchDashboardStats {
  todayMetrics: DailySalesMetrics | null
  weekToDate: {
    inspPrp: number
    lobsPrp: number
    lobsSold: number
    dollarsSold: number
  }
  goalProgress: {
    inspPrp: number               // Percentage
    lobsPrp: number
    lobsSold: number
  }
  daysSubmitted: number
  streak: number                  // Consecutive days submitted
}
