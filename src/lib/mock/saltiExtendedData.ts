import seedrandom from 'seedrandom'
import type {
  SaltiOpportunity,
  SaltiStage,
  SaltiStageChange,
  SaltiActivity,
  SaltiActivityType,
  SaltiMetrics,
  SaltiPipelineSnapshot,
  SaltiRepPerformance,
  SaltiForecast,
  SaltiDashboard,
} from '@/types/salti-extended'

let rng: () => number

export function initializeSaltiSeed(seed: number = 12345) {
  rng = seedrandom(`salti-${seed}`)
}

initializeSaltiSeed()

function randomInt(min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min
}

function randomFloat(min: number, max: number): number {
  return rng() * (max - min) + min
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)]
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + rng() * (end.getTime() - start.getTime()))
}

const SALTI_STAGES: SaltiStage[] = [
  'prospect', 'qualification', 'needs_analysis', 'proposal', 'negotiation', 'closed_won', 'closed_lost'
]

const ACTIVITY_TYPES: SaltiActivityType[] = [
  'call', 'email', 'meeting', 'site_visit', 'proposal_sent', 'follow_up', 'demo', 'contract_review'
]

const SERVICE_TYPES = ['Pest Control', 'Termite', 'Wildlife', 'Mosquito', 'Commercial Package', 'Full Property']

const FIRST_NAMES = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda']
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis']
const COMPANY_NAMES = ['ABC Properties', 'Metro Hotels', 'City Schools', 'Regional Medical', 'Prime Retail', 'Industrial Parks']
const COMPETITORS = ['Orkin', 'Terminix', 'Truly Nolen', 'Aptive', 'Local Provider']
const LOST_REASONS = ['Price too high', 'Went with competitor', 'No budget', 'Project delayed', 'Internal solution']

const STAGE_PROBABILITIES: Record<SaltiStage, number> = {
  prospect: 10,
  qualification: 25,
  needs_analysis: 40,
  proposal: 60,
  negotiation: 80,
  closed_won: 100,
  closed_lost: 0,
}

export function generateSaltiOpportunities(count: number = 200): SaltiOpportunity[] {
  const opportunities: SaltiOpportunity[] = []
  const now = new Date()
  const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)

  for (let i = 0; i < count; i++) {
    const createdDate = randomDate(sixMonthsAgo, now)
    const stage = randomChoice(SALTI_STAGES)
    const estimatedValue = randomInt(1000, 100000)
    const contractLength = randomChoice([12, 24, 36])
    const mrr = estimatedValue / contractLength

    const opportunity: SaltiOpportunity = {
      id: `SALTI-${String(i + 1).padStart(6, '0')}`,
      accountId: `ACC-${String(randomInt(1, 500)).padStart(5, '0')}`,
      accountName: randomChoice(COMPANY_NAMES) + ` ${randomInt(1, 99)}`,
      contactName: `${randomChoice(FIRST_NAMES)} ${randomChoice(LAST_NAMES)}`,
      contactEmail: `contact${i}@company.com`,
      contactPhone: `(${randomInt(200, 999)}) ${randomInt(200, 999)}-${randomInt(1000, 9999)}`,
      currentStage: stage,
      stageHistory: generateStageHistory(stage, createdDate),
      probability: STAGE_PROBABILITIES[stage],
      estimatedValue,
      weightedValue: estimatedValue * (STAGE_PROBABILITIES[stage] / 100),
      mrr,
      arr: mrr * 12,
      serviceTypes: [randomChoice(SERVICE_TYPES), rng() > 0.5 ? randomChoice(SERVICE_TYPES) : ''].filter(Boolean),
      contractLength,
      createdDate,
      expectedCloseDate: new Date(createdDate.getTime() + randomInt(30, 120) * 24 * 60 * 60 * 1000),
      actualCloseDate: ['closed_won', 'closed_lost'].includes(stage)
        ? new Date(createdDate.getTime() + randomInt(20, 90) * 24 * 60 * 60 * 1000)
        : undefined,
      lastActivityDate: new Date(now.getTime() - randomInt(1, 30) * 24 * 60 * 60 * 1000),
      nextActivityDate: !['closed_won', 'closed_lost'].includes(stage)
        ? new Date(now.getTime() + randomInt(1, 14) * 24 * 60 * 60 * 1000)
        : undefined,
      ownerId: `REP-${String(randomInt(1, 50)).padStart(3, '0')}`,
      ownerName: `${randomChoice(FIRST_NAMES)} ${randomChoice(LAST_NAMES)}`,
      branchId: `BR-${String(randomInt(1, 50)).padStart(3, '0')}`,
      regionId: `R${randomInt(16, 90)}`,
      competitors: rng() > 0.3 ? [randomChoice(COMPETITORS)] : [],
      competitivePressure: randomChoice(['none', 'low', 'medium', 'high']),
      riskLevel: randomChoice(['low', 'medium', 'high']),
      riskFactors: rng() > 0.6 ? ['Budget constraints', 'Decision timeline'] : [],
      notes: `${stage} stage opportunity for ${randomChoice(SERVICE_TYPES)}`,
      lostReason: stage === 'closed_lost' ? randomChoice(LOST_REASONS) : undefined,
      winFactors: stage === 'closed_won' ? ['Price competitive', 'Strong relationship'] : undefined,
    }

    opportunities.push(opportunity)
  }

  return opportunities
}

function generateStageHistory(currentStage: SaltiStage, createdDate: Date): SaltiStageChange[] {
  const history: SaltiStageChange[] = []
  const stageIndex = SALTI_STAGES.indexOf(currentStage)
  let lastDate = createdDate

  for (let i = 0; i < stageIndex; i++) {
    const nextDate = new Date(lastDate.getTime() + randomInt(3, 14) * 24 * 60 * 60 * 1000)
    history.push({
      fromStage: SALTI_STAGES[i],
      toStage: SALTI_STAGES[i + 1],
      changedAt: nextDate,
      changedBy: `${randomChoice(FIRST_NAMES)} ${randomChoice(LAST_NAMES)}`,
      daysInPreviousStage: randomInt(3, 14),
    })
    lastDate = nextDate
  }

  return history
}

export function generateSaltiActivities(opportunityId: string, count: number = 5): SaltiActivity[] {
  const activities: SaltiActivity[] = []
  const now = new Date()

  for (let i = 0; i < count; i++) {
    const type = randomChoice(ACTIVITY_TYPES)
    activities.push({
      id: `ACT-${opportunityId}-${i + 1}`,
      opportunityId,
      type,
      subject: `${type.replace('_', ' ')} - Follow up`,
      description: `Completed ${type} with customer`,
      performedBy: `${randomChoice(FIRST_NAMES)} ${randomChoice(LAST_NAMES)}`,
      performedAt: new Date(now.getTime() - randomInt(1, 60) * 24 * 60 * 60 * 1000),
      duration: randomInt(15, 120),
      outcome: randomChoice(['completed', 'no_answer', 'rescheduled', 'cancelled']),
      nextStep: rng() > 0.3 ? 'Schedule follow-up call' : undefined,
    })
  }

  return activities.sort((a, b) => b.performedAt.getTime() - a.performedAt.getTime())
}

export function calculateSaltiMetrics(opportunities: SaltiOpportunity[]): SaltiMetrics {
  const openOpps = opportunities.filter(o => !['closed_won', 'closed_lost'].includes(o.currentStage))
  const closedWon = opportunities.filter(o => o.currentStage === 'closed_won')
  const closedLost = opportunities.filter(o => o.currentStage === 'closed_lost')

  const byStage = SALTI_STAGES.reduce((acc, stage) => {
    const stageOpps = opportunities.filter(o => o.currentStage === stage)
    acc[stage] = {
      count: stageOpps.length,
      value: stageOpps.reduce((sum, o) => sum + o.estimatedValue, 0),
      avgAge: randomInt(5, 30),
    }
    return acc
  }, {} as Record<SaltiStage, { count: number; value: number; avgAge: number }>)

  return {
    totalPipeline: openOpps.reduce((sum, o) => sum + o.estimatedValue, 0),
    weightedPipeline: openOpps.reduce((sum, o) => sum + o.weightedValue, 0),
    avgDealSize: openOpps.length > 0 ? openOpps.reduce((sum, o) => sum + o.estimatedValue, 0) / openOpps.length : 0,
    avgSalesCycle: 45,
    byStage,
    stageConversions: SALTI_STAGES.slice(0, -2).map((stage, i) => ({
      fromStage: stage,
      toStage: SALTI_STAGES[i + 1],
      rate: randomFloat(60, 90),
      avgDays: randomInt(5, 15),
    })),
    winRate: closedWon.length / (closedWon.length + closedLost.length) * 100 || 0,
    lossReasons: {
      'Price too high': randomInt(10, 30),
      'Went with competitor': randomInt(5, 20),
      'No budget': randomInt(5, 15),
      'Project delayed': randomInt(3, 10),
    },
    avgWinDealSize: closedWon.length > 0 ? closedWon.reduce((sum, o) => sum + o.estimatedValue, 0) / closedWon.length : 0,
    avgLossDealSize: closedLost.length > 0 ? closedLost.reduce((sum, o) => sum + o.estimatedValue, 0) / closedLost.length : 0,
    activitiesPerDeal: randomFloat(8, 15),
    avgResponseTime: randomFloat(2, 8),
  }
}

export function generatePipelineSnapshots(days: number = 30): SaltiPipelineSnapshot[] {
  const snapshots: SaltiPipelineSnapshot[] = []
  const now = new Date()

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    const basePipeline = randomInt(800000, 1200000)

    snapshots.push({
      date,
      totalValue: basePipeline,
      weightedValue: basePipeline * randomFloat(0.3, 0.5),
      dealCount: randomInt(80, 150),
      byStage: SALTI_STAGES.filter(s => !['closed_won', 'closed_lost'].includes(s)).reduce((acc, stage) => {
        acc[stage] = randomInt(50000, 300000)
        return acc
      }, {} as Record<SaltiStage, number>),
    })
  }

  return snapshots
}

export function generateRepPerformance(count: number = 20): SaltiRepPerformance[] {
  const performances: SaltiRepPerformance[] = []

  for (let i = 0; i < count; i++) {
    const closedWonValue = randomInt(50000, 500000)
    const closedWonCount = randomInt(5, 25)
    const closedLostValue = randomInt(20000, 200000)
    const closedLostCount = randomInt(2, 15)

    performances.push({
      repId: `REP-${String(i + 1).padStart(3, '0')}`,
      repName: `${randomChoice(FIRST_NAMES)} ${randomChoice(LAST_NAMES)}`,
      pipelineValue: randomInt(100000, 800000),
      pipelineCount: randomInt(10, 50),
      activitiesThisPeriod: randomInt(30, 150),
      avgActivitiesPerDeal: randomFloat(5, 15),
      closedWonValue,
      closedWonCount,
      closedLostValue,
      closedLostCount,
      winRate: (closedWonCount / (closedWonCount + closedLostCount)) * 100,
      avgSalesCycle: randomInt(25, 60),
      quotaAttainment: randomFloat(60, 140),
    })
  }

  return performances.sort((a, b) => b.closedWonValue - a.closedWonValue)
}

export function generateSaltiForecast(): SaltiForecast {
  const committedValue = randomInt(200000, 500000)
  const bestCaseValue = committedValue + randomInt(100000, 300000)
  const pipelineValue = bestCaseValue + randomInt(200000, 500000)
  const quota = randomInt(400000, 600000)

  return {
    period: 'Q1 2025',
    committedValue,
    committedDeals: randomInt(15, 35),
    bestCaseValue,
    bestCaseDeals: randomInt(25, 50),
    pipelineValue,
    pipelineDeals: randomInt(40, 80),
    lastYearActual: randomInt(350000, 550000),
    quota,
    gapToQuota: quota - committedValue,
  }
}

export function generateSaltiDashboard(): SaltiDashboard {
  const opportunities = generateSaltiOpportunities(200)

  return {
    asOfDate: new Date(),
    metrics: calculateSaltiMetrics(opportunities),
    pipelineHistory: generatePipelineSnapshots(30),
    repPerformance: generateRepPerformance(20),
    forecast: generateSaltiForecast(),
    opportunities,
  }
}
