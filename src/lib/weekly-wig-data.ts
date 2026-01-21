import seedrandom from 'seedrandom'
import {
  getBranchesByRegion,
  initializeDailySalesData,
} from './daily-sales-data'
import {
  Branch,
  RegionCode,
} from '@/types/daily-sales-cadence'
import {
  LaggingMetrics,
  BranchWIGMetrics,
  BranchWIGEntry,
  RegionWeeklyWIG,
  WIG_TARGETS,
  LAGGING_TARGETS,
} from '@/types/weekly-wig'

// Get Friday date for the week ending
export function getWeekEndDate(weekOffset: number = 0): string {
  const today = new Date()
  const dayOfWeek = today.getDay()
  // Calculate days until Friday (5 = Friday)
  const daysUntilFriday = dayOfWeek <= 5 ? 5 - dayOfWeek : 5 - dayOfWeek + 7
  const friday = new Date(today)
  friday.setDate(friday.getDate() + daysUntilFriday + (weekOffset * 7))
  return friday.toISOString().split('T')[0]
}

// Generate lagging metrics for a region
export function generateLaggingMetrics(regionCode: RegionCode, weekEndDate: string): LaggingMetrics {
  // Use region code and week to seed random for deterministic data
  const seed = `${regionCode}-${weekEndDate}`
  const rng = seedrandom(seed)

  // Generate realistic lagging metrics with some variance around targets
  return {
    // Sales YOY: Target 20%, range 10-30%
    salesYOY: Math.round((10 + rng() * 20) * 10) / 10,
    // Revenue Growth: Target 5%, range 0-10%
    revenueGrowth: Math.round((rng() * 10) * 10) / 10,
    // Retention: Target 85%, range 75-95%
    retention: Math.round((75 + rng() * 20) * 10) / 10,
    // Profit vs AOP: Target 0%, range -10 to +10%
    profitVsAOP: Math.round((-10 + rng() * 20) * 10) / 10,
    // Colleague Retention: Target 85%, range 75-95%
    colleagueRetention: Math.round((75 + rng() * 20) * 10) / 10,
    // Safety YOY Reduction: Target 10%, range 0-20%
    safetyYOYReduction: Math.round((rng() * 20) * 10) / 10,
  }
}

// Generate branch-level WIG metrics
export function generateBranchWIGMetrics(branch: Branch, weekEndDate: string): BranchWIGMetrics {
  // Use branch code and week to seed random for deterministic data
  const seed = `${branch.code}-${weekEndDate}`
  const rng = seedrandom(seed)

  return {
    // Sales $/Rep: Target $15,000, range $10,000-$20,000
    salesDollarsPerRep: Math.round(10000 + rng() * 10000),
    // TAP $/Tech: Target $2,500, range $1,500-$3,500
    tapDollarPerTech: Math.round(1500 + rng() * 2000),
    // Missed Stops: Target 2, range 0-5 (lower is better)
    missedStops: Math.floor(rng() * 6),
    // 24 Hour Start %: Target 35%, range 25-45%
    twentyFourHourStart: Math.round(25 + rng() * 20),
    // NPS Score: Target 70, range 55-85
    npsScore: Math.round(55 + rng() * 30),
    // Past Due CCM/CFR: Target 5, range 0-12 (lower is better)
    pastDueCcmCfr: Math.floor(rng() * 13),
    // Techs > 55 Hours: Target 0, range 0-3 (lower is better)
    techsOver55Hours: Math.floor(rng() * 4),
    // Service Rev/Hour: Target $85, range $70-$100
    serviceRevPerHour: Math.round(70 + rng() * 30),
    // Driver Score: Target 87, range 75-95
    driverScore: Math.round(75 + rng() * 20),
    // Fundamentals Checklist MTD: Target 4, range 1-4
    fundamentalsChecklistMTD: Math.ceil(rng() * 4),
    // RD Branch Meetings MTD: Target 2, range 0-3
    rdBranchMeetingsMTD: Math.floor(rng() * 4),
  }
}

// Calculate totals/averages for region
export function calculateTotals(entries: BranchWIGEntry[]): BranchWIGMetrics {
  if (entries.length === 0) {
    return {
      salesDollarsPerRep: 0,
      tapDollarPerTech: 0,
      missedStops: 0,
      twentyFourHourStart: 0,
      npsScore: 0,
      pastDueCcmCfr: 0,
      techsOver55Hours: 0,
      serviceRevPerHour: 0,
      driverScore: 0,
      fundamentalsChecklistMTD: 0,
      rdBranchMeetingsMTD: 0,
    }
  }

  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0)
  const avg = (arr: number[]) => Math.round(sum(arr) / arr.length)

  return {
    // Averages for rate/score metrics
    salesDollarsPerRep: avg(entries.map(e => e.metrics.salesDollarsPerRep)),
    tapDollarPerTech: avg(entries.map(e => e.metrics.tapDollarPerTech)),
    twentyFourHourStart: avg(entries.map(e => e.metrics.twentyFourHourStart)),
    npsScore: avg(entries.map(e => e.metrics.npsScore)),
    serviceRevPerHour: avg(entries.map(e => e.metrics.serviceRevPerHour)),
    driverScore: avg(entries.map(e => e.metrics.driverScore)),

    // Sums for count metrics
    missedStops: sum(entries.map(e => e.metrics.missedStops)),
    pastDueCcmCfr: sum(entries.map(e => e.metrics.pastDueCcmCfr)),
    techsOver55Hours: sum(entries.map(e => e.metrics.techsOver55Hours)),
    fundamentalsChecklistMTD: sum(entries.map(e => e.metrics.fundamentalsChecklistMTD)),
    rdBranchMeetingsMTD: sum(entries.map(e => e.metrics.rdBranchMeetingsMTD)),
  }
}

// Get complete Weekly WIG data for a region
export function getRegionWeeklyWIG(regionCode: RegionCode, weekEndDate?: string): RegionWeeklyWIG {
  // Initialize daily sales data to ensure branch list is available
  initializeDailySalesData()

  const weekEnd = weekEndDate || getWeekEndDate(0)
  const branches = getBranchesByRegion(regionCode)

  // Generate metrics for each branch
  const branchEntries: BranchWIGEntry[] = branches.map(branch => ({
    branch,
    metrics: generateBranchWIGMetrics(branch, weekEnd),
  }))

  // Calculate region totals
  const totals = calculateTotals(branchEntries)

  // Generate lagging metrics
  const laggingMetrics = generateLaggingMetrics(regionCode, weekEnd)

  return {
    regionCode,
    weekEndDate: weekEnd,
    laggingMetrics,
    branches: branchEntries,
    totals,
  }
}

// Get status for a metric value vs target
export type MetricStatus = 'success' | 'warning' | 'danger'

export function getMetricStatus(
  value: number,
  target: number,
  isLowerBetter: boolean = false
): MetricStatus {
  const percentage = isLowerBetter
    ? (target / Math.max(value, 0.01)) * 100
    : (value / target) * 100

  if (percentage >= 100) return 'success'
  if (percentage >= 80) return 'warning'
  return 'danger'
}

// Get status for lagging metrics
export function getLaggingMetricStatus(
  metric: keyof LaggingMetrics,
  value: number
): MetricStatus {
  const target = LAGGING_TARGETS[metric]

  // Special handling for metrics where direction matters
  switch (metric) {
    case 'profitVsAOP':
      // For profit vs AOP, 0 or positive is good
      if (value >= 0) return 'success'
      if (value >= -5) return 'warning'
      return 'danger'
    case 'safetyYOYReduction':
      // For safety reduction, higher is better (more reduction)
      if (value >= target) return 'success'
      if (value >= target * 0.8) return 'warning'
      return 'danger'
    default:
      // Standard comparison
      if (value >= target) return 'success'
      if (value >= target * 0.8) return 'warning'
      return 'danger'
  }
}

// Format helpers
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(value)
}

export function formatPercent(value: number, showSign: boolean = false): string {
  const sign = showSign && value > 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}
