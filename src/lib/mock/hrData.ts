/**
 * Mock HR Data
 *
 * Synthetic HR data for retention, headcount, and workforce analytics.
 */

import seedrandom from 'seedrandom'
import type {
  Employee,
  RetentionMetrics,
  RetentionBySegment,
  TerminationReason,
  HeadcountSummary,
  PerformanceDistribution,
  EngagementScore,
} from '@/types/hr'

let rng = seedrandom('hr-42')

function resetRng(seed = 'hr-42') {
  rng = seedrandom(seed)
}

function randomInt(min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min
}

function randomFloat(min: number, max: number): number {
  return rng() * (max - min) + min
}

function randomChoice<T>(arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)]
}

const DEPARTMENTS = ['sales', 'operations', 'service', 'customer_service', 'finance', 'hr', 'marketing', 'it', 'executive'] as const
const ROLES = ['technician', 'sales_rep', 'sales_manager', 'branch_manager', 'regional_manager', 'customer_service_rep', 'dispatcher', 'market_director', 'accountant', 'hr_specialist', 'other'] as const
const MARKETS = ['Northeast', 'Southeast', 'Midwest', 'Southwest', 'West', 'Central']
const FIRST_NAMES = ['John', 'Sarah', 'Mike', 'Emily', 'David', 'Lisa', 'James', 'Jennifer', 'Robert', 'Michelle']
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Davis', 'Wilson', 'Martinez', 'Anderson', 'Taylor']

// =============================================================================
// EMPLOYEE DATA
// =============================================================================

export function generateMockEmployees(count: number = 200, seed?: string): Employee[] {
  if (seed) resetRng(seed)
  else resetRng()

  const employees: Employee[] = []
  const now = Date.now()

  for (let i = 0; i < count; i++) {
    const hireDate = new Date(now - randomInt(30, 2000) * 24 * 60 * 60 * 1000)
    const tenureMonths = Math.floor((now - hireDate.getTime()) / (30 * 24 * 60 * 60 * 1000))
    const isTerminated = rng() > 0.92

    employees.push({
      id: `EMP-${String(i + 1).padStart(6, '0')}`,
      employeeNumber: `E${String(randomInt(10000, 99999))}`,
      firstName: randomChoice(FIRST_NAMES),
      lastName: randomChoice(LAST_NAMES),
      fullName: `${randomChoice(FIRST_NAMES)} ${randomChoice(LAST_NAMES)}`,
      email: `employee${i}@company.com`,
      title: randomChoice(['Technician', 'Sales Rep', 'Branch Manager', 'CSR', 'Specialist']),
      department: randomChoice(DEPARTMENTS),
      role: randomChoice(ROLES),
      level: randomInt(1, 5),
      reportsTo: i > 0 ? `EMP-${String(randomInt(1, Math.min(i, 20))).padStart(6, '0')}` : undefined,
      market: randomChoice(MARKETS),
      region: `Region-${randomInt(1, 12)}`,
      branch: rng() > 0.3 ? `Branch-${randomInt(100, 500)}` : undefined,
      hireDate,
      startDate: hireDate,
      terminationDate: isTerminated ? new Date(now - randomInt(1, 90) * 24 * 60 * 60 * 1000) : undefined,
      tenureMonths,
      status: isTerminated ? 'terminated' : rng() > 0.95 ? 'on_leave' : 'active',
      employmentType: rng() > 0.9 ? 'part_time' : 'full_time',
      lastReviewDate: rng() > 0.3 ? new Date(now - randomInt(30, 365) * 24 * 60 * 60 * 1000) : undefined,
      performanceRating: rng() > 0.2 ? randomFloat(2.5, 5.0) : undefined,
      isHighPerformer: rng() > 0.8,
    })
  }

  return employees
}

// =============================================================================
// RETENTION METRICS
// =============================================================================

export function generateMockRetentionMetrics(period: string = 'MTD', seed?: string): RetentionMetrics {
  if (seed) resetRng(seed)
  else resetRng()

  const startingHeadcount = randomInt(180, 220)
  const hires = randomInt(5, 20)
  const terminations = randomInt(3, 15)
  const voluntaryTerminations = Math.floor(terminations * randomFloat(0.6, 0.8))
  const involuntaryTerminations = terminations - voluntaryTerminations
  const endingHeadcount = startingHeadcount + hires - terminations

  return {
    period,
    periodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    periodEnd: new Date(),
    startingHeadcount,
    endingHeadcount,
    netChange: hires - terminations,
    hires,
    terminations,
    voluntaryTerminations,
    involuntaryTerminations,
    transfers: randomInt(0, 5),
    turnoverRate: terminations / ((startingHeadcount + endingHeadcount) / 2) * 12,
    voluntaryTurnoverRate: voluntaryTerminations / ((startingHeadcount + endingHeadcount) / 2) * 12,
    retentionRate: (startingHeadcount - terminations) / startingHeadcount,
    attritionRate: terminations / startingHeadcount,
    avgTenure: randomFloat(18, 36),
    medianTenure: randomFloat(12, 30),
    industryBenchmark: 0.25,
    companyTarget: 0.20,
  }
}

export function generateMockRetentionBySegment(
  segmentType: 'department' | 'role' | 'market' | 'tenure_band' = 'department',
  seed?: string
): RetentionBySegment[] {
  if (seed) resetRng(seed)
  else resetRng()

  const segments = segmentType === 'department' ? DEPARTMENTS :
                   segmentType === 'role' ? ROLES :
                   segmentType === 'market' ? MARKETS :
                   ['0-6 months', '6-12 months', '1-2 years', '2-5 years', '5+ years']

  return segments.map(segment => {
    const headcount = randomInt(15, 50)
    const terminations = randomInt(0, Math.floor(headcount * 0.15))
    const turnoverRate = terminations / headcount * 12
    const companyAvg = 0.22

    return {
      segment: segment as string,
      segmentType,
      headcount,
      terminations,
      turnoverRate,
      retentionRate: 1 - (terminations / headcount),
      avgTenure: randomFloat(12, 48),
      vsCompanyAvg: turnoverRate - companyAvg,
      riskLevel: turnoverRate > 0.30 ? 'high' : turnoverRate > 0.20 ? 'medium' : 'low',
    }
  })
}

export function generateMockTerminationReasons(seed?: string): TerminationReason[] {
  if (seed) resetRng(seed)
  else resetRng()

  const reasons = [
    { reason: 'Better opportunity', category: 'voluntary' as const },
    { reason: 'Compensation', category: 'voluntary' as const },
    { reason: 'Work-life balance', category: 'voluntary' as const },
    { reason: 'Career growth', category: 'voluntary' as const },
    { reason: 'Relocation', category: 'voluntary' as const },
    { reason: 'Performance', category: 'involuntary' as const },
    { reason: 'Policy violation', category: 'involuntary' as const },
    { reason: 'Reduction in force', category: 'involuntary' as const },
  ]

  const total = randomInt(30, 60)
  let remaining = total

  return reasons.map((r, i) => {
    const percent = i < 3 ? randomFloat(0.15, 0.25) : randomFloat(0.05, 0.12)
    const count = Math.min(Math.floor(total * percent), remaining)
    remaining -= count

    return {
      reason: r.reason,
      category: r.category,
      count,
      percentOfTotal: count / total,
      trend: randomChoice(['increasing', 'decreasing', 'stable'] as const),
    }
  }).sort((a, b) => b.count - a.count)
}

// =============================================================================
// HEADCOUNT
// =============================================================================

export function generateMockHeadcountSummary(seed?: string): HeadcountSummary {
  if (seed) resetRng(seed)
  else resetRng()

  const totalHeadcount = randomInt(180, 250)
  const onLeave = randomInt(2, 10)

  return {
    asOfDate: new Date(),
    totalHeadcount,
    activeEmployees: totalHeadcount - onLeave,
    onLeave,
    byDepartment: DEPARTMENTS.reduce((acc, dept) => {
      acc[dept] = randomInt(10, 40)
      return acc
    }, {} as Record<typeof DEPARTMENTS[number], number>),
    byRole: ROLES.reduce((acc, role) => {
      acc[role] = randomInt(5, 50)
      return acc
    }, {} as Record<typeof ROLES[number], number>),
    byMarket: MARKETS.reduce((acc, market) => {
      acc[market] = randomInt(25, 50)
      return acc
    }, {} as Record<string, number>),
    fullTime: Math.floor(totalHeadcount * 0.92),
    partTime: Math.floor(totalHeadcount * 0.05),
    contractor: Math.floor(totalHeadcount * 0.03),
    vsLastMonth: randomInt(-8, 12),
    vsLastMonthPercent: randomFloat(-4, 6),
    vsLastYear: randomInt(-20, 30),
    vsLastYearPercent: randomFloat(-10, 15),
  }
}

// =============================================================================
// PERFORMANCE
// =============================================================================

export function generateMockPerformanceDistribution(seed?: string): PerformanceDistribution {
  if (seed) resetRng(seed)
  else resetRng()

  const totalReviewed = randomInt(150, 200)
  const distribution = [
    { rating: 5, ratingLabel: 'Exceptional', count: Math.floor(totalReviewed * 0.10) },
    { rating: 4, ratingLabel: 'Exceeds Expectations', count: Math.floor(totalReviewed * 0.25) },
    { rating: 3, ratingLabel: 'Meets Expectations', count: Math.floor(totalReviewed * 0.45) },
    { rating: 2, ratingLabel: 'Needs Improvement', count: Math.floor(totalReviewed * 0.15) },
    { rating: 1, ratingLabel: 'Unsatisfactory', count: Math.floor(totalReviewed * 0.05) },
  ].map(d => ({ ...d, percentOfTotal: d.count / totalReviewed }))

  return {
    period: 'Annual Review 2024',
    totalReviewed,
    distribution,
    avgRating: randomFloat(3.1, 3.6),
    highPerformers: distribution[0].count + distribution[1].count,
    lowPerformers: distribution[4].count,
    needsImprovement: distribution[3].count + distribution[4].count,
  }
}

// =============================================================================
// ENGAGEMENT
// =============================================================================

export function generateMockEngagementScore(seed?: string): EngagementScore {
  if (seed) resetRng(seed)
  else resetRng()

  const totalResponses = randomInt(150, 200)
  const overallScore = randomFloat(3.5, 4.3)

  return {
    period: 'Q4 2024',
    surveyDate: new Date(),
    responseRate: randomFloat(0.75, 0.92),
    totalResponses,
    overallScore,
    vsLastPeriod: randomFloat(-0.3, 0.4),
    vsBenchmark: randomFloat(-0.2, 0.3),
    dimensions: [
      { name: 'Leadership', score: randomFloat(3.4, 4.4), vsLastPeriod: randomFloat(-0.3, 0.3), topStrength: 'Clear communication', topOpportunity: 'Recognition' },
      { name: 'Culture', score: randomFloat(3.6, 4.5), vsLastPeriod: randomFloat(-0.2, 0.4), topStrength: 'Team collaboration', topOpportunity: 'Work-life balance' },
      { name: 'Growth', score: randomFloat(3.2, 4.2), vsLastPeriod: randomFloat(-0.4, 0.3), topStrength: 'Training availability', topOpportunity: 'Career paths' },
      { name: 'Compensation', score: randomFloat(3.0, 3.8), vsLastPeriod: randomFloat(-0.3, 0.2), topStrength: 'Benefits package', topOpportunity: 'Base pay competitiveness' },
    ],
    byDepartment: DEPARTMENTS.reduce((acc, dept) => {
      acc[dept] = randomFloat(3.2, 4.4)
      return acc
    }, {} as Record<typeof DEPARTMENTS[number], number>),
    byTenure: {
      '0-1 years': randomFloat(3.5, 4.2),
      '1-3 years': randomFloat(3.3, 4.0),
      '3-5 years': randomFloat(3.2, 3.9),
      '5+ years': randomFloat(3.4, 4.1),
    },
  }
}

// =============================================================================
// EXPORT
// =============================================================================

export const mockHRData = {
  generateEmployees: generateMockEmployees,
  generateRetentionMetrics: generateMockRetentionMetrics,
  generateRetentionBySegment: generateMockRetentionBySegment,
  generateTerminationReasons: generateMockTerminationReasons,
  generateHeadcountSummary: generateMockHeadcountSummary,
  generatePerformanceDistribution: generateMockPerformanceDistribution,
  generateEngagementScore: generateMockEngagementScore,
}
