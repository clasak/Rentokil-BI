import { RegionCode, Branch } from './daily-sales-cadence'

// Lagging metrics at region level (header row from PDF)
export interface LaggingMetrics {
  salesYOY: number           // Target: 20%
  revenueGrowth: number      // Target: 5%
  retention: number          // Target: 85%
  profitVsAOP: number        // Variance from AOP (can be negative)
  colleagueRetention: number // Target: 85%
  safetyYOYReduction: number // Target: 10% (reduction)
}

// Branch-level weekly metrics (existing 9 + 3 new)
export interface BranchWIGMetrics {
  // Existing from manager WIG scorecard
  salesDollarsPerRep: number
  tapDollarPerTech: number
  missedStops: number
  twentyFourHourStart: number
  npsScore: number
  pastDueCcmCfr: number
  techsOver55Hours: number
  serviceRevPerHour: number
  driverScore: number
  // New from PDF
  fundamentalsChecklistMTD: number
  rdBranchMeetingsMTD: number
}

// Complete branch WIG entry
export interface BranchWIGEntry {
  branch: Branch
  metrics: BranchWIGMetrics
}

// Region weekly WIG summary
export interface RegionWeeklyWIG {
  regionCode: RegionCode
  weekEndDate: string           // Friday YYYY-MM-DD
  laggingMetrics: LaggingMetrics
  branches: BranchWIGEntry[]
  totals: BranchWIGMetrics
}

// Targets for branch-level metrics
export const WIG_TARGETS = {
  salesDollarsPerRep: 15000,
  tapDollarPerTech: 2500,
  missedStops: 2,
  twentyFourHourStart: 35,
  npsScore: 70,
  pastDueCcmCfr: 5,
  techsOver55Hours: 0,
  serviceRevPerHour: 85,
  driverScore: 87,
  // New
  fundamentalsChecklistMTD: 4,  // 1 per week in a month
  rdBranchMeetingsMTD: 2,       // RD visits 2x/month
}

// Lagging metric targets
export const LAGGING_TARGETS = {
  salesYOY: 20,           // 20% growth
  revenueGrowth: 5,       // 5% growth
  retention: 85,          // 85% retention
  profitVsAOP: 0,         // Meet AOP (0% variance)
  colleagueRetention: 85, // 85% retention
  safetyYOYReduction: 10, // 10% reduction
}
